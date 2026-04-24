import type { ProviderConfig, ProviderCategory } from '@/lib/providers'
import type { ImageProvider } from './types'
import { MiniMaxImageProvider } from './providers/minimax'

export function createImageProvider(config: ProviderConfig): ImageProvider | null {
  if (!config.enabled) return null
  if (typeof config.apiKey !== 'string' || !config.apiKey.trim()) return null

  switch (config.id) {
    case 'minimax':
      return new MiniMaxImageProvider(config.apiKey.trim(), config.baseURL.trim())
    default:
      return null
  }
}

export interface ImageProviderState {
  activeProviders: Record<ProviderCategory, string>
  providers: ProviderConfig[]
}

function getImageConfig(state: ImageProviderState): ProviderConfig | undefined {
  const imageProviderId = state.activeProviders.image
  if (!imageProviderId) return undefined
  return state.providers.find((p) => p.id === imageProviderId)
}

export function getActiveImageProvider(state: ImageProviderState): ImageProvider | null {
  const config = getImageConfig(state)
  if (!config) return null
  return createImageProvider(config)
}

export function getImageProviderConfig(state: ImageProviderState): ProviderConfig | undefined {
  return getImageConfig(state)
}
