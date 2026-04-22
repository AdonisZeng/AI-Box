import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  TaskSessionManager,
  type CreateTaskSessionInput,
} from './task-session-manager.ts'

test('creates a task session with the requested mode and provider config', () => {
  const manager = new TaskSessionManager()
  const input: CreateTaskSessionInput = {
    prompt: 'Summarize this project',
    mode: 'auto',
    provider: {
      id: 'lmstudio',
      name: 'LMStudio',
      baseURL: 'http://127.0.0.1:1234/v1',
      apiKey: '',
      model: 'qwen3',
      apiType: 'openai',
      enabled: true,
    },
    mcpServers: [],
  }

  const session = manager.create(input)

  assert.equal(session.prompt, input.prompt)
  assert.equal(session.mode, 'auto')
  assert.equal(session.status, 'running')
  assert.equal(session.events.length, 1)
  assert.equal(session.events[0]?.type, 'task.created')
})

test('records observations and resumes after approval', () => {
  const manager = new TaskSessionManager()
  const session = manager.create({
    prompt: 'Read config and report provider',
    mode: 'confirm-external',
    provider: {
      id: 'openai',
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      model: 'gpt-4o',
      apiType: 'openai',
      enabled: true,
    },
    mcpServers: [],
  })

  manager.setAwaitingApproval(
    session.id,
    {
      actionId: 'step-2',
      title: 'Call filesystem.read_file',
      details: 'Read package.json',
    },
    {
      type: 'call_tool',
      toolName: 'filesystem.read_file',
      arguments: { path: 'package.json' },
      summary: 'Read package.json',
    }
  )
  manager.addObservation(session.id, {
    type: 'tool_result',
    actionId: 'step-2',
    name: 'filesystem.read_file',
    status: 'success',
    summary: 'Read package.json',
    data: { path: 'package.json' },
    rawExcerpt: '{"name":"ai-box"}',
    artifacts: [],
  })

  const pending = manager.approve(session.id)
  const updated = manager.get(session.id)

  assert.equal(pending?.type, 'call_tool')
  assert.equal(updated?.approval?.state, 'resolved')
  assert.equal(updated?.status, 'running')
  assert.equal(updated?.observations.length, 1)
})
