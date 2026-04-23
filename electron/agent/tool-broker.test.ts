import * as assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ToolBroker } from './tool-broker.ts'

test('lists tools from injected MCP clients', async () => {
  const root = process.cwd()
  const broker = new ToolBroker({
    localRootDir: root,
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

  assert.equal(tools.some((tool) => tool.name === 'local.read_file'), true)
  assert.equal(tools.some((tool) => tool.name === 'filesystem.read_file'), true)
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

test('dispatches local tools without an MCP server', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ai-box-tool-broker-'))
  writeFileSync(join(root, 'package.json'), '{"name":"ai-box"}')
  const broker = new ToolBroker({ localRootDir: root })

  const result = await broker.callTool(null, 'local.read_file', {
    path: 'package.json',
  })

  assert.deepEqual(result, {
    path: 'package.json',
    content: '{"name":"ai-box"}',
  })
})
