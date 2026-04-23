import type { MCPTool } from '../../src/types/mcp.ts'
import type {
  AgentExecutionMode,
  AgentLoopState,
  AgentObservation,
  AgentPlanningState,
} from '../../src/types/agent.ts'
import type { Message, ProviderConfig } from '../../src/types/providers.ts'
import type { AgentSkillSummary } from './skill-registry.ts'

export type PlannerDecision =
  | {
      type: 'call_tool'
      toolName: string
      arguments: Record<string, unknown>
      summary: string
      plan?: string[]
    }
  | {
      type: 'use_skill'
      skillId: string
      summary: string
      plan?: string[]
    }
  | {
      type: 'run_script'
      runner: 'node' | 'python' | 'shell'
      command: string
      cwd: string
      summary: string
      plan?: string[]
    }
  | {
      type: 'finish'
      summary: string
      finalMessage: string
      plan?: string[]
    }

export interface BuildPlannerMessagesInput {
  prompt: string
  mode: AgentExecutionMode
  skills: AgentSkillSummary[]
  tools: MCPTool[]
  planning: AgentPlanningState
  loop: AgentLoopState
  observations: AgentObservation[]
}

export interface PlannerNextInput extends BuildPlannerMessagesInput {
  provider?: ProviderConfig
}

export interface DefaultPlannerOptions {
  callModel: (
    messages: Message[],
    input: PlannerNextInput
  ) => Promise<string>
}

function createMessage(id: string, role: Message['role'], content: string): Message {
  return {
    id,
    role,
    content,
    timestamp: Date.now(),
  }
}

function normalizePlan(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value
    .map((step) => String(step).trim())
    .filter(Boolean)
}

function extractJsonBlock(content: string): string {
  const trimmed = content.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)

  return fenceMatch?.[1]?.trim() ?? trimmed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Planner response must include a non-empty ${field}`)
  }

  return value
}

export function buildPlannerMessages(input: BuildPlannerMessagesInput): Message[] {
  return [
    createMessage(
      'planner-system',
      'system',
      [
        'You are the AI Box agent planner.',
        'Choose exactly one next action and return only one JSON object.',
        'Allowed action types: call_tool, use_skill, run_script, finish.',
        'Only use tools and skills from the provided context.',
        'Use agent.update_plan to maintain a concise current-task todo list for multi-step work.',
        'Use agent.task for isolated subtasks that benefit from a clean context.',
        'Use agent.load_skill before applying a skill when the summary is not enough.',
        'Keep at most one planning item in_progress at a time.',
        'Treat loopState.messages as the authoritative agent loop transcript.',
        'When loopState.transitionReason is a tool, skill, or script result, use that result before deciding the next action.',
        'Include a short summary and an optional plan array when useful.',
      ].join(' ')
    ),
    createMessage(
      'planner-user',
      'user',
      JSON.stringify(
        {
          task: input.prompt,
          executionMode: input.mode,
          availableSkills: input.skills,
          availableTools: input.tools,
          planningState: input.planning,
          planningReminder:
            input.planning.roundsSinceUpdate >= 3
              ? 'The plan has not been updated for several action rounds. Call agent.update_plan if the current todo state is stale.'
              : undefined,
          contextBudget: {
            activeLoopMessages: input.loop.messages.length,
            compactionCount: input.loop.compactionCount,
          },
          loopState: input.loop,
          observations: input.observations,
        },
        null,
        2
      )
    ),
  ]
}

export function parsePlannerDecision(content: string): PlannerDecision {
  const raw = JSON.parse(extractJsonBlock(content)) as Record<string, unknown>
  const plan = normalizePlan(raw.plan)

  switch (raw.type) {
    case 'call_tool':
      return {
        type: 'call_tool',
        toolName: requireString(raw.toolName, 'toolName'),
        arguments: isRecord(raw.arguments) ? raw.arguments : {},
        summary: requireString(raw.summary, 'summary'),
        plan,
      }

    case 'use_skill':
      return {
        type: 'use_skill',
        skillId: requireString(raw.skillId, 'skillId'),
        summary: requireString(raw.summary, 'summary'),
        plan,
      }

    case 'run_script': {
      const runner = raw.runner
      if (runner !== 'node' && runner !== 'python' && runner !== 'shell') {
        throw new Error('Planner response must include a valid runner')
      }

      return {
        type: 'run_script',
        runner,
        command: requireString(raw.command, 'command'),
        cwd: requireString(raw.cwd, 'cwd'),
        summary: requireString(raw.summary, 'summary'),
        plan,
      }
    }

    case 'finish':
      return {
        type: 'finish',
        summary: requireString(raw.summary, 'summary'),
        finalMessage: requireString(raw.finalMessage, 'finalMessage'),
        plan,
      }

    default:
      throw new Error('Planner response must include a supported type field')
  }
}

export class DefaultPlanner {
  private options: DefaultPlannerOptions

  constructor(options: DefaultPlannerOptions) {
    this.options = options
  }

  async next(input: PlannerNextInput): Promise<PlannerDecision> {
    const messages = buildPlannerMessages(input)
    const response = await this.options.callModel(messages, input)

    return parsePlannerDecision(response)
  }
}
