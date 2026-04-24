import type { ProviderConfig, ProviderCategory } from '@/lib/providers'
import type { AudioProvider } from './types'
import { MiniMaxAudioProvider } from './providers/minimax'

export function createAudioProvider(config: ProviderConfig): AudioProvider | null {
  if (!config.enabled) return null
  if (!config.apiKey.trim()) return null

  switch (config.id) {
    case 'minimax':
      return new MiniMaxAudioProvider(config.apiKey.trim(), config.baseURL.trim())
    default:
      return null
  }
}

export interface AudioProviderState {
  activeProviders: Record<ProviderCategory, string>
  providers: ProviderConfig[]
}

function getAudioConfig(state: AudioProviderState): ProviderConfig | undefined {
  const audioProviderId = state.activeProviders.voice
  if (!audioProviderId) return undefined
  return state.providers.find((p) => p.id === audioProviderId)
}

export function getActiveAudioProvider(state: AudioProviderState): AudioProvider | null {
  const config = getAudioConfig(state)
  if (!config) return null
  return createAudioProvider(config)
}

export function getAudioProviderConfig(state: AudioProviderState): ProviderConfig | undefined {
  return getAudioConfig(state)
}
