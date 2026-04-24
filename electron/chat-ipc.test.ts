import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerChatIpc, type ChatCompletionRequest } from './chat-ipc.ts'
import type { LLMProvider, ProviderConfig } from '../src/lib/providers/types.ts'

type IpcHandler = (...args: unknown[]) => unknown

function createProviderConfig(): ProviderConfig {
  return {
    id: 'minimax',
    name: 'MiniMax',
    baseURL: 'https://api.minimaxi.com/anthropic',
    apiKey: 'test-key',
    model: 'MiniMax-M2.7',
    apiType: 'anthropic',
    enabled: true,
  }
}

test('registers chat completion and abort IPC handlers', () => {
  const handlers = new Map<string, IpcHandler>()

  registerChatIpc(
    {
      handle(channel: string, handler: IpcHandler) {
        handlers.set(channel, handler)
      },
    },
    { createProvider: () => null }
  )

  assert.deepEqual([...handlers.keys()].sort(), ['chat:abort', 'chat:complete'])
})

test('runs provider chat in the IPC handler and forwards stream chunks', async () => {
  const handlers = new Map<string, IpcHandler>()
  const forwarded: Array<{ channel: string; payload: unknown }> = []
  const provider: LLMProvider = {
    name: 'MiniMax',
    getDefaultModel: () => 'MiniMax-M2.7',
    async chat(_messages, options) {
      options?.onChunk?.({ content: '你', done: false })
      options?.onChunk?.({ content: '好', done: false })
      options?.onChunk?.({ content: '', done: true })
      return '你好'
    },
  }

  registerChatIpc(
    {
      handle(channel: string, handler: IpcHandler) {
        handlers.set(channel, handler)
      },
    },
    { createProvider: () => provider }
  )

  const request: ChatCompletionRequest = {
    requestId: 7,
    providerConfig: createProviderConfig(),
    messages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 1 }],
  }
  const result = await handlers.get('chat:complete')?.(
    {
      sender: {
        send(channel: string, payload: unknown) {
          forwarded.push({ channel, payload })
        },
      },
    },
    request
  )

  assert.equal(result, '你好')
  assert.equal(forwarded.length, 3)
  assert.deepEqual(forwarded[0], {
    channel: 'chat:chunk',
    payload: { requestId: 7, chunk: { content: '你', done: false } },
  })
})
