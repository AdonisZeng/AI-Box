import type { ProviderConfig, ProviderType } from '../../types/providers'

export function resolveChatProviderId(activeProvider: ProviderType): ProviderType {
  return activeProvider
}

export interface ResolveLatestChatProviderInput {
  activeProvider: ProviderType
  providers: ProviderConfig[]
  persistedSettings?: string | null
}

export interface ResolvedChatProvider {
  providerId: ProviderType
  providerConfig: ProviderConfig | undefined
}

interface PersistedSettingsSnapshot {
  activeProvider?: ProviderType
  providers?: ProviderConfig[]
}

const providerTypes: ProviderType[] = ['lmstudio', 'openai', 'anthropic', 'custom']

export function resolveLatestChatProvider({
  activeProvider,
  providers,
  persistedSettings,
}: ResolveLatestChatProviderInput): ResolvedChatProvider {
  const persisted = parsePersistedSettings(persistedSettings)
  const providerId = persisted.activeProvider ?? resolveChatProviderId(activeProvider)
  const latestProviders = persisted.providers ?? providers

  return {
    providerId,
    providerConfig:
      latestProviders.find((provider) => provider.id === providerId) ??
      providers.find((provider) => provider.id === providerId),
  }
}

function parsePersistedSettings(raw: string | null | undefined): PersistedSettingsSnapshot {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const state = isRecord(parsed.state) ? parsed.state : {}
    return {
      activeProvider: isProviderType(state.activeProvider) ? state.activeProvider : undefined,
      providers: Array.isArray(state.providers)
        ? state.providers.filter(isProviderConfig)
        : undefined,
    }
  } catch {
    return {}
  }
}

function isProviderConfig(value: unknown): value is ProviderConfig {
  return (
    isRecord(value) &&
    isProviderType(value.id) &&
    typeof value.name === 'string' &&
    typeof value.baseURL === 'string' &&
    typeof value.apiKey === 'string' &&
    typeof value.model === 'string' &&
    (value.apiType === 'openai' || value.apiType === 'anthropic' || value.apiType === 'custom') &&
    typeof value.enabled === 'boolean'
  )
}

function isProviderType(value: unknown): value is ProviderType {
  return typeof value === 'string' && providerTypes.includes(value as ProviderType)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
