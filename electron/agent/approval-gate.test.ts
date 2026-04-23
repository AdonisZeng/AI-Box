import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApprovalGate } from './approval-gate.ts'

test('allows external actions in auto mode', () => {
  const gate = new ApprovalGate()

  const result = gate.evaluate('auto', {
    type: 'call_tool',
    toolName: 'filesystem.read_file',
  })

  assert.equal(result.requiresApproval, false)
})

test('blocks tool calls in confirm-external mode', () => {
  const gate = new ApprovalGate()

  const result = gate.evaluate('confirm-external', {
    type: 'call_tool',
    toolName: 'filesystem.read_file',
  })

  assert.equal(result.requiresApproval, true)
  assert.equal(result.request?.title, 'Call filesystem.read_file')
})

test('blocks executable skill use in confirm-external mode', () => {
  const gate = new ApprovalGate()

  const result = gate.evaluate('confirm-external', {
    type: 'use_skill',
    skillId: 'repo-summary',
  })

  assert.equal(result.requiresApproval, true)
  assert.equal(result.request?.title, 'Run Skill repo-summary')
})
