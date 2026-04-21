import type { ChatOptions, Message } from '@/types/providers'
import { BaseProvider } from './base'

export class AnthropicProvider extends BaseProvider {
  name = 'Anthropic'

  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(apiKey, baseURL, model)
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const model = this.model || this.getDefaultModel()
    const baseURL = this.baseURL || 'https://api.anthropic.com'
    const apiKey = this.apiKey || ''
    const onChunk = options?.onChunk

    const systemMessage = messages.find((m) => m.role === 'system')
    const conversationMessages = messages.filter((m) => m.role !== 'system')

    const requestBody: Record<string, unknown> = {
      model,
      messages: conversationMessages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
    }

    if (systemMessage) {
      requestBody.system = systemMessage.content
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }

    if (onChunk) {
      const response = await fetch(`${baseURL}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...requestBody, stream: true }),
        signal: options?.signal,
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullContent = ''
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done

        if (!done && result.value) {
          const chunk = decoder.decode(result.value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                onChunk({ content: '', done: true })
              } else {
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.type === 'content_block_delta') {
                    const content = parsed.delta?.text || ''
                    fullContent += content
                    onChunk({ content, done: false })
                  }
                } catch {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        }
      }

      return fullContent
    } else {
      const response = await fetch(`${baseURL}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: options?.signal,
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      return data.content?.[0]?.text || ''
    }
  }

  getDefaultModel(): string {
    return 'claude-3-5-sonnet-20241022'
  }
}
