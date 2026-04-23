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
  assert.deepEqual(session.planning, { items: [], roundsSinceUpdate: 0 })
  assert.equal(session.loop.turnCount, 1)
  assert.equal(session.loop.compactionCount, 0)
  assert.equal(session.loop.transitionReason, null)
  assert.deepEqual(session.loop.messages, [
    {
      role: 'user',
      content: input.prompt,
      timestamp: session.loop.messages[0]?.timestamp,
    },
  ])
})

test('compacts large tool results in the active loop transcript', () => {
  const manager = new TaskSessionManager()
  const session = manager.create({
    prompt: 'Read a large file',
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
  })
  const largeContent = 'a'.repeat(1400)

  manager.recordObservationWriteBack(session.id, {
    type: 'tool_result',
    actionId: 'tool-large',
    name: 'local.read_file',
    status: 'success',
    summary: 'Read a large file',
    data: { result: largeContent },
    rawExcerpt: largeContent,
    artifacts: [],
  })

  const updated = manager.get(session.id)
  const writeBack = updated?.loop.messages[1]?.content

  assert.equal(updated?.loop.compactionCount, 1)
  assert.equal(Array.isArray(writeBack), true)
  assert.match(String(Array.isArray(writeBack) ? writeBack[0]?.content : ''), /content compacted/)
  assert.equal(updated?.observations.length, 0)
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

test('records assistant decisions and write-back observations in loop state', () => {
  const manager = new TaskSessionManager()
  const session = manager.create({
    prompt: 'Read package.json',
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
  })

  manager.recordAssistantDecision(session.id, {
    type: 'call_tool',
    summary: 'Read package metadata',
    toolName: 'filesystem.read_file',
  })
  manager.recordObservationWriteBack(session.id, {
    type: 'tool_result',
    actionId: 'tool-1',
    name: 'filesystem.read_file',
    status: 'success',
    summary: 'Read package metadata',
    data: { result: { text: '{"name":"ai-box"}' } },
    rawExcerpt: '{"name":"ai-box"}',
    artifacts: [],
  })

  const updated = manager.get(session.id)

  assert.equal(updated?.loop.turnCount, 2)
  assert.equal(updated?.loop.transitionReason, 'tool_result')
  assert.equal(updated?.loop.messages.length, 3)
  assert.equal(updated?.loop.messages[1]?.role, 'assistant')
  assert.deepEqual(updated?.loop.messages[2]?.content, [
    {
      type: 'tool_result',
      tool_use_id: 'tool-1',
      status: 'success',
      name: 'filesystem.read_file',
      summary: 'Read package metadata',
      content: '{"name":"ai-box"}',
      artifacts: [],
    },
  ])
})

test('updates structured planning state with one active item', () => {
  const manager = new TaskSessionManager()
  const session = manager.create({
    prompt: 'Implement a feature',
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
  })

  manager.incrementPlanningStaleness(session.id)
  const planning = manager.updatePlanning(session.id, [
    {
      content: 'Inspect current Agent runtime',
      status: 'completed',
    },
    {
      content: 'Add todo state',
      status: 'in_progress',
      activeForm: 'Adding todo state',
    },
    {
      content: 'Run verification',
      status: 'pending',
    },
  ])

  assert.equal(planning.roundsSinceUpdate, 0)
  assert.deepEqual(planning.items, [
    {
      content: 'Inspect current Agent runtime',
      status: 'completed',
    },
    {
      content: 'Add todo state',
      status: 'in_progress',
      activeForm: 'Adding todo state',
    },
    {
      content: 'Run verification',
      status: 'pending',
    },
  ])
  assert.throws(
    () =>
      manager.updatePlanning(session.id, [
        { content: 'First active', status: 'in_progress' },
        { content: 'Second active', status: 'in_progress' },
      ]),
    /at most one in_progress/
  )
})
