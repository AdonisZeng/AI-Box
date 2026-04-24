import type { ProviderConfig, ProviderCategory } from '@/lib/providers'
import type { VideoProvider } from './types'
import { MiniMaxVideoProvider } from './providers/minimax'

export function createVideoProvider(config: ProviderConfig): VideoProvider | null {
  if (!config.enabled) return null
  if (!config.apiKey.trim()) return null

  switch (config.id) {
    case 'minimax':
      return new MiniMaxVideoProvider(config.apiKey.trim(), config.baseURL.trim())
    default:
      // Custom / other providers - video generation not yet supported
      return null
  }
}

export interface VideoProviderState {
  activeProviders: Record<ProviderCategory, string>
  providers: ProviderConfig[]
}

function getVideoConfig(state: VideoProviderState): ProviderConfig | undefined {
  const videoProviderId = state.activeProviders.video
  if (!videoProviderId) return undefined
  return state.providers.find((p) => p.id === videoProviderId)
}

export function getActiveVideoProvider(state: VideoProviderState): VideoProvider | null {
  const config = getVideoConfig(state)
  if (!config) return null
  return createVideoProvider(config)
}

export function getVideoProviderConfig(state: VideoProviderState): ProviderConfig | undefined {
  return getVideoConfig(state)
}
