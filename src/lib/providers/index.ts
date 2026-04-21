import type { ProviderType, ProviderConfig, Message, StreamChunk, LLMProvider } from '@/types/providers'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { LMStudioProvider } from './lmstudio'
import { CustomProvider } from './custom'

export type { ProviderType, ProviderConfig, Message, StreamChunk, LLMProvider }

export function getProviderValidationError(config: ProviderConfig): string | null {
  if (!config.enabled) {
    return `${config.name} 当前已禁用，请先在设置中启用后再试。`
  }

  switch (config.id) {
    case 'openai':
      return config.apiKey.trim()
        ? null
        : 'OpenAI 尚未配置 API Key，请先在设置中补充后再试。'
    case 'anthropic':
      return config.apiKey.trim()
        ? null
        : 'Anthropic 尚未配置 API Key，请先在设置中补充后再试。'
    case 'custom':
      return config.baseURL.trim()
        ? null
        : '自定义 Provider 尚未配置基地址，请先在设置中补充后再试。'
    case 'lmstudio':
    default:
      return null
  }
}

export function createProvider(config: ProviderConfig): LLMProvider | null {
  if (getProviderValidationError(config)) {
    return null
  }

  switch (config.id) {
    case 'openai':
      return new OpenAIProvider(config.apiKey.trim(), config.baseURL, config.model)
    case 'anthropic':
      return new AnthropicProvider(config.apiKey.trim(), config.baseURL, config.model)
    case 'lmstudio':
      return new LMStudioProvider(config.baseURL || 'http://localhost:1234/v1', config.model)
    case 'custom':
      return new CustomProvider(config.baseURL.trim(), config.apiType, config.apiKey.trim(), config.model)
    default:
      return null
  }
}

export { OpenAIProvider, AnthropicProvider, LMStudioProvider, CustomProvider }
