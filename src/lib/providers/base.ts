import type { Message, StreamChunk, LLMProvider } from '@/types/providers'

export abstract class BaseProvider implements LLMProvider {
  abstract name: string

  constructor(
    protected apiKey?: string,
    protected baseURL?: string,
    protected model?: string
  ) {}

  abstract chat(messages: Message[], onChunk?: (chunk: StreamChunk) => void): Promise<string>

  abstract getDefaultModel(): string

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }
}
