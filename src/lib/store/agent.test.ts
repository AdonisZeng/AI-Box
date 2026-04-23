import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAgentStore } from './agent.ts'

test('records plan, tool traces, and final result from task events', () => {
  const store = createAgentStore()

  store.getState().applyEvent({
    type: 'plan.generated',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      steps: ['Read package.json', 'Summarize findings'],
    },
  })
  store.getState().applyEvent({
    type: 'skill.selected',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      skillId: 'repo-summary',
    },
  })
  store.getState().applyEvent({
    type: 'tool.call.started',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      name: 'filesystem.read_file',
      arguments: { path: 'package.json' },
      summary: 'Read package metadata',
    },
  })
  store.getState().applyEvent({
    type: 'tool.call.finished',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      name: 'filesystem.read_file',
      summary: 'Read package metadata',
      result: { text: 'ok' },
    },
  })
  store.getState().applyEvent({
    type: 'script.started',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      command: 'scripts/run.py',
      runner: 'python',
    },
  })
  store.getState().applyEvent({
    type: 'script.output',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      output: 'summary-ready',
    },
  })
  store.getState().applyEvent({
    type: 'script.finished',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      command: 'scripts/run.py',
      status: 'success',
    },
  })
  store.getState().applyEvent({
    type: 'task.completed',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      finalMessage: 'Done',
    },
  })

  const state = store.getState()
  assert.deepEqual(state.plan, ['Read package.json', 'Summarize findings'])
  assert.equal(state.selectedSkills[0], 'repo-summary')
  assert.equal(state.toolCalls[0]?.name, 'filesystem.read_file')
  assert.equal(state.toolCalls[0]?.status, 'success')
  assert.deepEqual(state.toolCalls[0]?.arguments, { path: 'package.json' })
  assert.equal(state.logs.some((entry) => entry.includes('开始调用 MCP 工具')), true)
  assert.equal(state.logs.some((entry) => entry.includes('summary-ready')), true)
  assert.equal(state.logs.some((entry) => entry.includes('脚本执行完成')), true)
  assert.equal(state.finalMessage, 'Done')
})

test('surfaces pending approval requests', () => {
  const store = createAgentStore()

  store.getState().applyEvent({
    type: 'approval.required',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      actionId: 'step-2',
      title: 'Call filesystem.read_file',
      details: 'Read package.json',
    },
  })

  assert.equal(store.getState().approval?.title, 'Call filesystem.read_file')
})

test('tracks step lifecycle entries in execution logs', () => {
  const store = createAgentStore()

  store.getState().applyEvent({
    type: 'step.started',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      actionType: 'call_tool',
      summary: 'Read package.json',
    },
  })
  store.getState().applyEvent({
    type: 'step.completed',
    taskId: 'task-1',
    timestamp: Date.now(),
    payload: {
      actionType: 'call_tool',
      summary: 'Read package.json',
    },
  })

  const logs = store.getState().logs
  assert.equal(logs.some((entry) => entry.includes('开始步骤')), true)
  assert.equal(logs.some((entry) => entry.includes('完成步骤')), true)
})
