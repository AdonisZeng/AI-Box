import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveImmediateChatConnectionStatus } from './provider-status.ts'
import type { ProviderConfig } from '../providers/types.ts'

test('treats encrypted MiniMax api keys as configured for immediate connection status', () => {
  const status = resolveImmediateChatConnectionStatus({
    id: 'minimax',
    name: 'MiniMax',
    baseURL: 'https://api.minimaxi.com/anthropic',
    apiKey: { encrypted: true, data: 'encrypted-key' } as unknown as string,
    model: 'MiniMax-M2.7',
    apiType: 'anthropic',
    enabled: true,
  })

  assert.equal(status, 'connected')
})

test('marks MiniMax disconnected when no api key is configured', () => {
  const status = resolveImmediateChatConnectionStatus({
    id: 'minimax',
    name: 'MiniMax',
    baseURL: 'https://api.minimaxi.com/anthropic',
    apiKey: '',
    model: 'MiniMax-M2.7',
    apiType: 'anthropic',
    enabled: true,
  })

  assert.equal(status, 'disconnected')
})

test('leaves OpenAI providers to active network probing', () => {
  const config: ProviderConfig = {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'sk-test',
    model: 'gpt-4o',
    apiType: 'openai',
    enabled: true,
  }

  assert.equal(resolveImmediateChatConnectionStatus(config), null)
})
