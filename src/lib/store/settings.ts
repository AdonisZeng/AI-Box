import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderConfig, ProviderType } from '@/lib/providers'
import { getDefaultProviders } from '@/lib/providers'
import { encrypt, decrypt, isEncryptedValue } from '@/lib/crypto'

interface SettingsState {
  providers: ProviderConfig[]
  activeProvider: ProviderType
  theme: 'light' | 'dark'
  _decryptedKeys: Record<string, string>

  updateProvider: (id: ProviderType, updates: Partial<ProviderConfig>) => void
  setActiveProvider: (id: ProviderType) => void
  setTheme: (theme: 'light' | 'dark') => void
  getProviderConfig: (id: ProviderType) => ProviderConfig | undefined
  decryptApiKeys: () => Promise<void>
  getDecryptedApiKey: (providerId: ProviderType) => string
}

const defaultProviders = getDefaultProviders()

function normalizeProviders(
  providers: ProviderConfig[]
): ProviderConfig[] {
  return providers.map((p) => {
    const def = defaultProviders.find((d) => d.id === p.id)
    if (!def) return p
    return { ...def, ...p }
  })
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      providers: defaultProviders,
      activeProvider: 'lmstudio',
      theme: 'dark',
      _decryptedKeys: {},

      updateProvider: async (id: ProviderType, updates: Partial<ProviderConfig>) => {
        let apiKey = updates.apiKey ?? ''
        if (apiKey) {
          const encrypted = await encrypt(apiKey)
          if (encrypted) {
            apiKey = encrypted as unknown as string
          }
        }

        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates, apiKey } : p
          ),
        }))
      },

      setActiveProvider: (id: ProviderType) => {
        set({ activeProvider: id })
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme })
      },

      getProviderConfig: (id: ProviderType) => {
        return get().providers.find((p) => p.id === id)
      },

      decryptApiKeys: async () => {
        const { providers, _decryptedKeys } = get()
        const newDecrypted: Record<string, string> = { ..._decryptedKeys }
        const updatedProviders: ProviderConfig[] = []

        for (const p of providers) {
          const cached = newDecrypted[p.id]
          if (cached !== undefined && !isEncryptedValue(p.apiKey)) {
            // Cache is valid (plaintext stored) and provider hasn't changed to encrypted
            updatedProviders.push({ ...p, apiKey: cached })
          } else if (isEncryptedValue(p.apiKey)) {
            // Encrypted — decrypt and cache
            const decrypted = await decrypt(p.apiKey)
            const key = decrypted ?? ''
            newDecrypted[p.id] = key
            updatedProviders.push({ ...p, apiKey: key })
          } else {
            // Plaintext, no cache entry needed
            updatedProviders.push(p)
          }
        }

        set({ providers: updatedProviders, _decryptedKeys: newDecrypted })
      },

      getDecryptedApiKey: (providerId: ProviderType) => {
        const { _decryptedKeys, providers } = get()
        const p = providers.find((pr) => pr.id === providerId)
        if (!p) return ''
        if (_decryptedKeys[providerId] !== undefined) return _decryptedKeys[providerId]
        if (isEncryptedValue(p.apiKey)) return ''
        return p.apiKey
      },
    }),
    {
      name: 'ai-box-settings',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined
        if (!persisted) return currentState

        const mergedProviders = persisted.providers
          ? normalizeProviders(persisted.providers as ProviderConfig[])
          : currentState.providers

        // Build decrypted keys cache from persisted encrypted values
        const decryptedKeys: Record<string, string> = {}
        for (const p of mergedProviders) {
          if (isEncryptedValue(p.apiKey)) {
            // Leave encrypted — decryptApiKeys() will be called post-hydration
            // Cache empty string as placeholder so getDecryptedApiKey returns ''
          } else if (p.apiKey) {
            decryptedKeys[p.id] = p.apiKey
          }
        }

        return {
          ...currentState,
          ...persisted,
          providers: mergedProviders,
          _decryptedKeys: {
            ...decryptedKeys,
            ...(persisted._decryptedKeys || {}),
          },
        }
      },
    }
  )
)
