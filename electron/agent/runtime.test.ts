import * as assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { AgentRuntime } from './runtime.ts'
import { TaskSessionManager } from './task-session-manager.ts'
import { ToolBroker } from './tool-broker.ts'

function createRequest(mode: 'auto' | 'confirm-external' = 'auto') {
  return {
    prompt: 'Inspect the repo',
    mode,
    provider: {
      id: mode === 'auto' ? 'lmstudio' : 'openai',
      name: mode === 'auto' ? 'LMStudio' : 'OpenAI',
      baseURL:
        mode === 'auto'
          ? 'http://127.0.0.1:1234/v1'
          : 'https://api.openai.com/v1',
      apiKey: mode === 'auto' ? '' : 'test-key',
      model: mode === 'auto' ? 'qwen3' : 'gpt-4o',
      apiType: 'openai' as const,
      enabled: true,
    },
    mcpServers:
      mode === 'auto'
        ? [{ id: 'fs', name: 'Filesystem', url: 'http://localhost:3001', connected: true, tools: [] }]
        : [{ id: 'fs', name: 'Filesystem', url: 'http://localhost:3001', connected: true, tools: [] }],
  }
}

test('feeds tool results back into the planner before finishing', async () => {
  const plannerInputs: Array<{
    observations: unknown[]
    loop: { turnCount: number; transitionReason: string | null }
  }> = []
  const runtime = new AgentRuntime({
    sessions: new TaskSessionManager(),
    skillRegistry: { load: async () => [] },
    skillExecutor: {
      execute: async () => {
        throw new Error('skill executor should not be called in this test')
      },
    },
    toolBroker: {
      listTools: async () => [{ name: 'filesystem.read_file', description: 'Read a file', inputSchema: {} }],
      callTool: async () => ({ text: 'package.json contents' }),
    },
    runner: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    approvalGate: { evaluate: () => ({ requiresApproval: false, request: null }) },
    planner: {
      next: async (input) => {
        plannerInputs.push({
          observations: input.observations,
          loop: {
            turnCount: input.loop.turnCount,
            transitionReason: input.loop.transitionReason,
          },
        })
        return plannerInputs.length === 1
          ? {
              type: 'call_tool' as const,
              toolName: 'filesystem.read_file',
              arguments: { path: 'package.json' },
              summary: 'Read package.json',
              plan: ['Read package.json', 'Summarize findings'],
            }
          : {
              type: 'finish' as const,
              summary: 'done',
              finalMessage: 'The active provider is configured in package.json.',
            }
      },
    },
  })

  const result = await runtime.start(createRequest())

  assert.equal(result.status, 'completed')
  assert.equal(plannerInputs.length, 2)
  assert.equal(plannerInputs[1]?.observations.length, 1)
  assert.deepEqual(plannerInputs.map((input) => input.loop), [
    { turnCount: 1, transitionReason: null },
    { turnCount: 2, transitionReason: 'tool_result' },
  ])
  assert.equal(result.loop.turnCount, 2)
  assert.equal(result.loop.transitionReason, null)
  assert.equal(result.loop.messages[0]?.role, 'user')
  assert.equal(result.loop.messages[1]?.role, 'assistant')
  assert.deepEqual(result.loop.messages[1]?.content, {
    type: 'call_tool',
    toolName: 'filesystem.read_file',
    arguments: { path: 'package.json' },
    summary: 'Read package.json',
    plan: ['Read package.json', 'Summarize findings'],
    tool_use_id: result.observations[0]?.actionId,
  })
  assert.deepEqual(result.loop.messages[2]?.content, [
    {
      type: 'tool_result',
      tool_use_id: result.observations[0]?.actionId,
      status: 'success',
      name: 'filesystem.read_file',
      summary: 'Read package.json',
      content: JSON.stringify({ text: 'package.json contents' }),
      artifacts: [],
    },
  ])
  assert.equal(result.loop.messages[3]?.role, 'assistant')
  assert.equal(result.events.some((event) => event.type === 'step.started'), true)
  assert.equal(result.events.some((event) => event.type === 'step.completed'), true)
})

test('emits skill selection and records the skill observation before finishing', async () => {
  const runtime = new AgentRuntime({
    sessions: new TaskSessionManager(),
    skillRegistry: {
      load: async () => [
        {
          id: 'repo-summary',
          name: 'repo-summary',
          description: 'Summarize repositories',
          rootDir: 'C:/Users/33664/.agents/skills/repo-summary',
          tags: ['code'],
          isExecutable: true,
          allowedMcpTools: ['filesystem.read_file'],
          entrypoints: [{ runner: 'python', command: 'scripts/run.py' }],
        },
      ],
    },
    skillExecutor: {
      execute: async () => ({
        status: 'success' as const,
        summary: 'repo-summary completed',
        rawExcerpt: 'summary-ready',
        observation: {
          type: 'skill_result',
          actionId: 'skill-repo-summary',
          name: 'repo-summary',
          status: 'success',
          summary: 'repo-summary completed',
          data: { stdout: 'summary-ready' },
          rawExcerpt: 'summary-ready',
          artifacts: [],
        },
      }),
    },
    toolBroker: {
      listTools: async () => [],
      callTool: async () => {
        throw new Error('tool broker should not be called in this test')
      },
    },
    runner: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    approvalGate: { evaluate: () => ({ requiresApproval: false, request: null }) },
    planner: {
      next: async (input) =>
        input.observations.length === 0
          ? {
              type: 'use_skill' as const,
              skillId: 'repo-summary',
              summary: 'Run repo-summary',
              plan: ['Run repo-summary', 'Respond'],
            }
          : {
              type: 'finish' as const,
              summary: 'done',
              finalMessage: 'Repository summary completed.',
            },
    },
  })

  const result = await runtime.start({
    ...createRequest(),
    prompt: 'Summarize the repository',
    mcpServers: [],
  })

  assert.equal(result.status, 'completed')
  assert.equal(result.events.some((event) => event.type === 'skill.selected'), true)
  assert.equal(result.observations[0]?.type, 'skill_result')
})

test('pauses when approval is required', async () => {
  const runtime = new AgentRuntime({
    sessions: new TaskSessionManager(),
    skillRegistry: { load: async () => [] },
    skillExecutor: {
      execute: async () => {
        throw new Error('skill executor should not be called in this test')
      },
    },
    toolBroker: {
      listTools: async () => [{ name: 'filesystem.read_file', description: 'Read a file', inputSchema: {} }],
      callTool: async () => ({ text: 'never called' }),
    },
    runner: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    approvalGate: {
      evaluate: () => ({
        requiresApproval: true,
        request: {
          actionId: 'step-1',
          title: 'Call filesystem.read_file',
          details: 'Read package.json',
        },
      }),
    },
    planner: {
      next: async () => ({
        type: 'call_tool' as const,
        toolName: 'filesystem.read_file',
        arguments: { path: 'package.json' },
        summary: 'Read package.json',
      }),
    },
  })

  const result = await runtime.start(createRequest('confirm-external'))

  assert.equal(result.status, 'awaiting-approval')
  assert.equal(result.approval.request?.title, 'Call filesystem.read_file')
})

test('resumes the pending action after approval', async () => {
  const runtime = new AgentRuntime({
    sessions: new TaskSessionManager(),
    skillRegistry: { load: async () => [] },
    skillExecutor: {
      execute: async () => {
        throw new Error('skill executor should not be called in this test')
      },
    },
    toolBroker: {
      listTools: async () => [{ name: 'filesystem.read_file', description: 'Read a file', inputSchema: {} }],
      callTool: async () => ({ text: 'package.json contents' }),
    },
    runner: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    approvalGate: {
      evaluate: (mode) =>
        mode === 'confirm-external'
          ? {
              requiresApproval: true,
              request: {
                actionId: 'step-1',
                title: 'Call filesystem.read_file',
                details: 'Read package.json',
              },
            }
          : { requiresApproval: false, request: null },
    },
    planner: {
      next: async (input) =>
        input.observations.length === 0
          ? {
              type: 'call_tool' as const,
              toolName: 'filesystem.read_file',
              arguments: { path: 'package.json' },
              summary: 'Read package.json',
            }
          : {
              type: 'finish' as const,
              summary: 'done',
              finalMessage: 'Approved execution complete.',
            },
    },
  })

  const blocked = await runtime.start(createRequest('confirm-external'))
  const resumed = await runtime.approveAction(blocked.id, 'step-1')

  assert.equal(resumed?.status, 'completed')
  assert.equal(resumed?.observations.length, 1)
})

test('runs local tools without configured MCP servers', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ai-box-runtime-local-tools-'))
  writeFileSync(join(root, 'package.json'), '{"name":"ai-box"}')
  const runtime = new AgentRuntime({
    sessions: new TaskSessionManager(),
    skillRegistry: { load: async () => [] },
    skillExecutor: {
      execute: async () => {
        throw new Error('skill executor should not be called in this test')
      },
    },
    toolBroker: new ToolBroker({ localRootDir: root }),
    runner: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    approvalGate: { evaluate: () => ({ requiresApproval: false, request: null }) },
    planner: {
      next: async (input) =>
        input.observations.length === 0
          ? {
              type: 'call_tool' as const,
              toolName: 'local.read_file',
              arguments: { path: 'package.json' },
              summary: 'Read local package metadata',
            }
          : {
              type: 'finish' as const,
              summary: 'done',
              finalMessage: 'Local package metadata read.',
            },
    },
  })

  const result = await runtime.start({
    ...createRequest(),
    mcpServers: [],
  })

  assert.equal(result.status, 'completed')
  assert.equal(result.observations[0]?.name, 'local.read_file')
  assert.deepEqual(result.observations[0]?.data, {
    result: {
      path: 'package.json',
      content: '{"name":"ai-box"}',
    },
  })
  assert.equal(result.loop.transitionReason, null)
})

test('emits a rejected event when approval is rejected', async () => {
  const events: Array<{ type: string }> = []
  const runtime = new AgentRuntime({
    sessions: new TaskSessionManager(),
    skillRegistry: { load: async () => [] },
    skillExecutor: {
      execute: async () => {
        throw new Error('skill executor should not be called in this test')
      },
    },
    toolBroker: {
      listTools: async () => [{ name: 'filesystem.read_file', description: 'Read a file', inputSchema: {} }],
      callTool: async () => ({ text: 'never called' }),
    },
    runner: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    approvalGate: {
      evaluate: () => ({
        requiresApproval: true,
        request: {
          actionId: 'step-1',
          title: 'Call filesystem.read_file',
          details: 'Read package.json',
        },
      }),
    },
    planner: {
      next: async () => ({
        type: 'call_tool' as const,
        toolName: 'filesystem.read_file',
        arguments: { path: 'package.json' },
        summary: 'Read package.json',
      }),
    },
  })
  runtime.onTaskEvent((event) => events.push({ type: event.type }))

  const blocked = await runtime.start(createRequest('confirm-external'))
  const rejected = runtime.rejectAction(blocked.id, 'step-1')

  assert.equal(rejected?.status, 'rejected')
  assert.equal(events.at(-1)?.type, 'task.rejected')
})

test('pauses executable skill use in confirm-external mode before running it', async () => {
  const runtime = new AgentRuntime({
    sessions: new TaskSessionManager(),
    skillRegistry: {
      load: async () => [
        {
          id: 'repo-summary',
          name: 'repo-summary',
          description: 'Summarize repositories',
          rootDir: 'C:/Users/33664/.agents/skills/repo-summary',
          tags: ['code'],
          isExecutable: true,
          allowedMcpTools: [],
          entrypoints: [{ runner: 'node', command: 'scripts/run.js' }],
        },
      ],
    },
    skillExecutor: {
      execute: async () => ({
        status: 'success' as const,
        summary: 'repo-summary completed',
        rawExcerpt: 'summary-ready',
        observation: {
          type: 'skill_result',
          actionId: 'skill-repo-summary',
          name: 'repo-summary',
          status: 'success',
          summary: 'repo-summary completed',
          data: { stdout: 'summary-ready' },
          rawExcerpt: 'summary-ready',
          artifacts: [],
        },
      }),
    },
    toolBroker: {
      listTools: async () => [],
      callTool: async () => {
        throw new Error('tool broker should not be called in this test')
      },
    },
    runner: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    approvalGate: {
      evaluate: (mode, action) =>
        mode === 'confirm-external' &&
        (action.type === 'call_tool' ||
          action.type === 'run_script' ||
          action.type === 'use_skill')
          ? {
              requiresApproval: true,
              request: {
                actionId: 'skill-step',
                title:
                  action.type === 'use_skill'
                    ? `Run Skill ${action.skillId}`
                    : 'External action',
                details: 'Confirm external action',
              },
            }
          : { requiresApproval: false, request: null },
    },
    planner: {
      next: async (input) =>
        input.observations.length === 0
          ? {
              type: 'use_skill' as const,
              skillId: 'repo-summary',
              summary: 'Run repo-summary',
            }
          : {
              type: 'finish' as const,
              summary: 'done',
              finalMessage: 'Skill execution complete.',
            },
    },
  })

  const blocked = await runtime.start({
    ...createRequest('confirm-external'),
    mcpServers: [],
  })
  assert.equal(blocked.status, 'awaiting-approval')
  assert.equal(blocked.approval.request?.title, 'Run Skill repo-summary')
  assert.equal(blocked.observations.length, 0)

  const resumed = await runtime.approveAction(blocked.id, 'skill-step')
  assert.equal(resumed?.status, 'completed')
  assert.equal(resumed?.observations[0]?.type, 'skill_result')
})
