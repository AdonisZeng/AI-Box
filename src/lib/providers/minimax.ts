import type { ProviderConfig, LLMProvider } from './types'
import { CustomProvider } from './custom'

export const minimaxDefinition = {
  id: 'minimax',
  name: 'MiniMax',
  getDefaultConfig(): ProviderConfig {
    return {
      id: 'minimax',
      name: 'MiniMax',
      baseURL: 'https://api.minimaxi.com/anthropic',
      apiKey: '',
      model: 'MiniMax-M2.7',
      apiType: 'anthropic',
      enabled: true,
      categoryModels: {
        text: 'MiniMax-M2.7',
        image: 'image-01',
        video: 'MiniMax-Hailuo-2.3',
        voice: 'speech-2.8-hd',
        music: 'music-2.6',
      },
    }
  },
  validateConfig(config: ProviderConfig): string | null {
    if (!config.enabled) {
      return 'MiniMax 当前已禁用，请先在设置中启用后再试。'
    }
    const key = typeof config.apiKey === 'string' ? config.apiKey : ''
    return key.trim() ? null : 'MiniMax 尚未配置 API Key，请先在设置中补充后再试。'
  },
  createProvider(config: ProviderConfig): LLMProvider | null {
    const key = typeof config.apiKey === 'string' ? config.apiKey : ''
    return new CustomProvider(
      (typeof config.baseURL === 'string' ? config.baseURL : '').trim() || 'https://api.minimaxi.com/anthropic',
      'anthropic',
      key.trim(),
      config.model
    )
  },
}
