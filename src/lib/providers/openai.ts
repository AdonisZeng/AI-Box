import OpenAI from 'openai'
import type { Message, StreamChunk } from '@/types/providers'
import { BaseProvider } from './base'

export class OpenAIProvider extends BaseProvider {
  name = 'OpenAI'
  private client: OpenAI

  constructor(apiKey: string, baseURL?: string, model?: string) {
    super(apiKey, baseURL, model)
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL || 'https://api.openai.com/v1',
    })
  }

  async chat(messages: Message[], onChunk?: (chunk: StreamChunk) => void): Promise<string> {
    const model = this.model || this.getDefaultModel()

    if (onChunk) {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      })

      let fullContent = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullContent += content
          onChunk({ content, done: false })
        }
        if (chunk.choices[0]?.finish_reason) {
          onChunk({ content: '', done: true })
        }
      }
      return fullContent
    } else {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      })
      return response.choices[0]?.message?.content || ''
    }
  }

  getDefaultModel(): string {
    return 'gpt-4o'
  }
}
