import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderConfig, ProviderType } from '@/types/providers'

interface SettingsState {
  providers: ProviderConfig[]
  activeProvider: ProviderType
  theme: 'light' | 'dark'

  updateProvider: (id: ProviderType, updates: Partial<ProviderConfig>) => void
  setActiveProvider: (id: ProviderType) => void
  setTheme: (theme: 'light' | 'dark') => void
  getProviderConfig: (id: ProviderType) => ProviderConfig | undefined
}

const defaultProviders: ProviderConfig[] = [
  {
    id: 'lmstudio',
    name: 'LMStudio',
    baseURL: 'http://127.0.0.1:1234/v1',
    apiKey: '',
    model: '',
    apiType: 'openai',
    enabled: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    apiType: 'openai',
    enabled: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    apiType: 'anthropic',
    enabled: true,
  },
  {
    id: 'custom',
    name: '自定义',
    baseURL: '',
    apiKey: '',
    model: '',
    apiType: 'openai',
    enabled: false,
  },
]

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      providers: defaultProviders,
      activeProvider: 'lmstudio',
      theme: 'dark',

      updateProvider: (id: ProviderType, updates: Partial<ProviderConfig>) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p
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
    }),
    {
      name: 'ai-box-settings',
    }
  )
)
