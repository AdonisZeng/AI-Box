import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveChatProviderId, resolveLatestChatProvider } from './provider-resolution.ts'

test('uses the latest active provider for chat requests', () => {
  const providerId = resolveChatProviderId('openai')

  assert.equal(providerId, 'openai')
})

test('falls back to the active provider when the session has no provider', () => {
  const providerId = resolveChatProviderId('anthropic')

  assert.equal(providerId, 'anthropic')
})

test('uses the persisted provider snapshot when the chat window store is stale', () => {
  const latest = resolveLatestChatProvider({
    activeProvider: 'lmstudio',
    providers: [
      {
        id: 'lmstudio',
        name: 'LMStudio',
        baseURL: 'http://127.0.0.1:1234/v1',
        apiKey: '',
        model: 'old-model',
        apiType: 'openai',
        enabled: true,
      },
    ],
    persistedSettings: JSON.stringify({
      state: {
        activeProvider: 'lmstudio',
        providers: [
          {
            id: 'lmstudio',
            name: 'LMStudio',
            baseURL: 'http://127.0.0.1:1234/v1',
            apiKey: '',
            model: 'new-model',
            apiType: 'openai',
            enabled: true,
          },
        ],
      },
    }),
  })

  assert.equal(latest.providerId, 'lmstudio')
  assert.equal(latest.providerConfig?.model, 'new-model')
})
