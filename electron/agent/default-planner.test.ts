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
    planning: {
      roundsSinceUpdate: 3,
      items: [
        {
          content: 'Inspect package.json',
          status: 'in_progress',
          activeForm: 'Inspecting package.json',
        },
      ],
    },
    loop: {
      turnCount: 2,
      transitionReason: 'tool_result',
      messages: [
        { role: 'user', content: 'Find the active provider', timestamp: 1 },
        {
          role: 'assistant',
          content: { type: 'call_tool', toolName: 'filesystem.read_file' },
          timestamp: 2,
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'step-2',
              content: '{"name":"ai-box"}',
            },
          ],
          timestamp: 3,
        },
      ],
    },
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
  assert.match(messages[1]?.content ?? '', /"turnCount": 2/)
  assert.match(messages[1]?.content ?? '', /"transitionReason": "tool_result"/)
  assert.match(messages[0]?.content ?? '', /agent\.update_plan/)
  assert.match(messages[0]?.content ?? '', /agent\.task/)
  assert.match(messages[0]?.content ?? '', /agent\.load_skill/)
  assert.match(messages[1]?.content ?? '', /"planningState"/)
  assert.match(messages[1]?.content ?? '', /"planningReminder"/)
  assert.match(messages[1]?.content ?? '', /"contextBudget"/)
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
    planning: {
      items: [],
      roundsSinceUpdate: 0,
    },
    loop: {
      turnCount: 1,
      transitionReason: null,
      messages: [{ role: 'user', content: 'Summarize the repository', timestamp: 1 }],
    },
    observations: [],
  })

  assert.equal(decision.type, 'finish')
  assert.equal(decision.finalMessage, 'All work is complete.')
})
