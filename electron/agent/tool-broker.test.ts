import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { ToolBroker } from './tool-broker.ts'

test('lists tools from injected MCP clients', async () => {
  const broker = new ToolBroker({
    clientFactory: () => ({
      connect: async () => undefined,
      getServer: () => ({
        id: 'fs',
        name: 'Filesystem',
        url: 'http://localhost:3001',
        connected: true,
        tools: [
          {
            name: 'filesystem.read_file',
            description: 'Read a file',
            inputSchema: {},
          },
        ],
      }),
      callTool: async () => ({ tool: 'filesystem.read_file', result: { text: 'ok' } }),
    }),
  })

  const tools = await broker.listTools([
    { id: 'fs', name: 'Filesystem', url: 'http://localhost:3001', connected: true, tools: [] },
  ])

  assert.equal(tools.length, 1)
  assert.equal(tools[0]?.name, 'filesystem.read_file')
})

test('normalizes tool call errors', async () => {
  const broker = new ToolBroker({
    clientFactory: () => ({
      connect: async () => undefined,
      getServer: () => ({
        id: 'fs',
        name: 'Filesystem',
        url: 'http://localhost:3001',
        connected: true,
        tools: [],
      }),
      callTool: async () => ({ tool: 'filesystem.read_file', result: null, error: 'boom' }),
    }),
  })

  await assert.rejects(() =>
    broker.callTool(
      { id: 'fs', name: 'Filesystem', url: 'http://localhost:3001', connected: true, tools: [] },
      'filesystem.read_file',
      { path: 'package.json' }
    )
  )
})
