import type { Message, StreamChunk } from '@/types/providers'
import { BaseProvider } from './base'

export interface LMStudioModel {
  id: string
  name: string
}

export class LMStudioProvider extends BaseProvider {
  name = 'LMStudio'

  constructor(baseURL: string, model?: string) {
    super(undefined, baseURL, model)
  }

  async chat(messages: Message[], onChunk?: (chunk: StreamChunk) => void): Promise<string> {
    const baseURL = this.baseURL || 'http://localhost:1234/v1'
    const model = this.model || 'local-model'

    const requestBody = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: !!onChunk,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (onChunk) {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`LMStudio API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              onChunk({ content: '', done: true })
            } else {
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullContent += content
                  onChunk({ content, done: false })
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      return fullContent
    } else {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`LMStudio API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    }
  }

  getDefaultModel(): string {
    return 'local-model'
  }

  static async fetchModels(baseURL: string): Promise<LMStudioModel[]> {
    try {
      const url = baseURL.endsWith('/v1') ? `${baseURL}/models` : `${baseURL}/v1/models`
      const response = await fetch(url)

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      // LMStudio returns { data: [{ id: "model-id", ... }] }
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((model: { id: string }) => ({
          id: model.id,
          name: model.id,
        }))
      }

      return []
    } catch {
      return []
    }
  }
}
