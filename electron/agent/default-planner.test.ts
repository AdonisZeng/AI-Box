import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DefaultPlanner,
  buildPlannerMessages,
  parsePlannerDecision,
} from './default-planner.ts'

test('serializes task context, skills, tools, and observations into prompt messages', () => {
  const messages = buildPlannerMessages({
    prompt: 'Find the active provider',
    mode: 'confirm-external',
    skills: [
      {
        id: 'repo-summary',
        name: 'repo-summary',
        description: 'Summarize repos',
        rootDir: 'C:/skills/repo-summary',
        tags: ['code'],
        isExecutable: false,
        allowedMcpTools: [],
        entrypoints: [],
      },
    ],
    tools: [{ name: 'filesystem.read_file', description: 'Read a file', inputSchema: {} }],
    observations: [
      {
        type: 'tool_result',
        actionId: 'step-2',
        name: 'filesystem.read_file',
        status: 'success',
        summary: 'Read package.json',
        data: {},
        rawExcerpt: '{"name":"ai-box"}',
        artifacts: [],
      },
    ],
  })

  assert.equal(messages[0]?.role, 'system')
  assert.match(messages[1]?.content ?? '', /filesystem\.read_file/)
  assert.match(messages[1]?.content ?? '', /repo-summary/)
  assert.match(messages[1]?.content ?? '', /confirm-external/)
})

test('parses JSON planner output into a normalized action', () => {
  const decision = parsePlannerDecision(
    JSON.stringify({
      type: 'call_tool',
      toolName: 'filesystem.read_file',
      arguments: { path: 'package.json' },
      summary: 'Read package metadata',
      plan: ['Inspect package.json', 'Summarize findings'],
    })
  )

  assert.equal(decision.type, 'call_tool')
  assert.equal(decision.toolName, 'filesystem.read_file')
  assert.deepEqual(decision.plan, ['Inspect package.json', 'Summarize findings'])
})

test('uses the injected model caller to produce the next planner decision', async () => {
  const planner = new DefaultPlanner({
    callModel: async (messages) => {
      assert.equal(messages.length, 2)
      return JSON.stringify({
        type: 'finish',
        summary: 'done',
        finalMessage: 'All work is complete.',
      })
    },
  })

  const decision = await planner.next({
    prompt: 'Summarize the repository',
    mode: 'auto',
    skills: [],
    tools: [],
    observations: [],
  })

  assert.equal(decision.type, 'finish')
  assert.equal(decision.finalMessage, 'All work is complete.')
})
