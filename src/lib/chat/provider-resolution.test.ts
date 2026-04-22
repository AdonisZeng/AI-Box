import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveChatProviderId } from './provider-resolution.ts'

test('uses the latest active provider for chat requests', () => {
  const providerId = resolveChatProviderId('openai')

  assert.equal(providerId, 'openai')
})

test('falls back to the active provider when the session has no provider', () => {
  const providerId = resolveChatProviderId('anthropic')

  assert.equal(providerId, 'anthropic')
})
