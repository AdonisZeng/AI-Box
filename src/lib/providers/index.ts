import type { ProviderType, ProviderConfig, Message, StreamChunk, LLMProvider } from '@/types/providers'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { LMStudioProvider } from './lmstudio'
import { CustomProvider } from './custom'

export type { ProviderType, ProviderConfig, Message, StreamChunk, LLMProvider }

export function createProvider(config: ProviderConfig): LLMProvider | null {
  switch (config.id) {
    case 'openai':
      if (!config.apiKey) return null
      return new OpenAIProvider(config.apiKey, config.baseURL, config.model)
    case 'anthropic':
      if (!config.apiKey) return null
      return new AnthropicProvider(config.apiKey, config.baseURL, config.model)
    case 'lmstudio':
      return new LMStudioProvider(config.baseURL || 'http://localhost:1234/v1', config.model)
    case 'custom':
      if (!config.baseURL) return null
      return new CustomProvider(config.baseURL, config.apiKey, config.model)
    default:
      return null
  }
}

export { OpenAIProvider, AnthropicProvider, LMStudioProvider, CustomProvider }
