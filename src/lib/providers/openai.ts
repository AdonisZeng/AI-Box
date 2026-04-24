import OpenAI from 'openai'
import type { ChatOptions, Message, ProviderConfig, LLMProvider } from './types'
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

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const model = this.model || this.getDefaultModel()
    const onChunk = options?.onChunk

    if (onChunk) {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }, {
        signal: options?.signal,
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
      }, {
        signal: options?.signal,
      })
      return response.choices[0]?.message?.content || ''
    }
  }

  getDefaultModel(): string {
    return 'gpt-4o'
  }
}

export const openaiDefinition = {
  id: 'openai',
  name: 'OpenAI',
  getDefaultConfig(): ProviderConfig {
    return {
      id: 'openai',
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
      apiType: 'openai',
      enabled: true,
    }
  },
  validateConfig(config: ProviderConfig): string | null {
    if (!config.enabled) {
      return 'OpenAI 当前已禁用，请先在设置中启用后再试。'
    }
    const key = typeof config.apiKey === 'string' ? config.apiKey : ''
    return key.trim() ? null : 'OpenAI 尚未配置 API Key，请先在设置中补充后再试。'
  },
  createProvider(config: ProviderConfig): LLMProvider | null {
    const key = typeof config.apiKey === 'string' ? config.apiKey : ''
    return new OpenAIProvider(key.trim(), config.baseURL, config.model)
  },
}
