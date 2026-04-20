import type { Message, StreamChunk } from '@/types/providers'
import { BaseProvider } from './base'

export class CustomProvider extends BaseProvider {
  name = 'Custom'

  constructor(baseURL: string, apiKey?: string, model?: string) {
    super(apiKey, baseURL, model)
  }

  async chat(messages: Message[], onChunk?: (chunk: StreamChunk) => void): Promise<string> {
    const baseURL = this.baseURL
    if (!baseURL) throw new Error('Custom provider requires baseURL')

    const requestBody: Record<string, unknown> = {
      model: this.model || 'default',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: !!onChunk,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    if (onChunk) {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Custom API error: ${response.status}`)
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
        throw new Error(`Custom API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    }
  }

  getDefaultModel(): string {
    return this.model || 'custom-model'
  }
}
