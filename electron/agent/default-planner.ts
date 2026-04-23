import type { MCPTool } from '../../src/types/mcp.ts'
import type {
  AgentExecutionMode,
  AgentLoopState,
  AgentObservation,
  AgentPlanningState,
} from '../../src/types/agent.ts'
import type { Message, ProviderConfig } from '../../src/types/providers.ts'
import type { AgentMemorySummary } from './memory-store.ts'
import type { AgentSkillSummary } from './skill-registry.ts'
import { SystemPromptBuilder } from './system-prompt-builder.ts'

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
  memories?: AgentMemorySummary[]
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
    .map((step) => {
      if (!isRecord(step)) {
        return String(step).trim()
      }

      const content = typeof step.content === 'string' ? step.content.trim() : ''
      if (content === '') {
        return ''
      }

      return typeof step.status === 'string' && step.status.trim() !== ''
        ? `[${step.status.trim()}] ${content}`
        : content
    })
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
      new SystemPromptBuilder().build({
        mode: input.mode,
        tools: input.tools,
        skills: input.skills,
        memories: input.memories ?? [],
        dynamicContext: {
          cwd: process.cwd(),
          currentDate: new Date().toISOString().slice(0, 10),
        },
      })
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
          availableMemories: input.memories ?? [],
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
  const parsed = JSON.parse(extractJsonBlock(content)) as Record<string, unknown>
  const nestedAction = isRecord(parsed.next_action)
    ? parsed.next_action
    : isRecord(parsed.action)
      ? parsed.action
      : undefined
  const raw = nestedAction
    ? {
        ...nestedAction,
        summary: nestedAction.summary ?? parsed.summary,
        plan: nestedAction.plan ?? parsed.plan,
      }
    : parsed
  const plan = normalizePlan(raw.plan)
  const decisionType = typeof raw.type === 'string' ? raw.type : raw.action

  switch (decisionType) {
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

    case 'finish': {
      const summary = requireString(raw.summary, 'summary')
      const finalMessage =
        typeof raw.finalMessage === 'string' && raw.finalMessage.trim() !== ''
          ? raw.finalMessage
          : typeof raw.content === 'string' && raw.content.trim() !== ''
            ? raw.content
            : typeof raw.result === 'string' && raw.result.trim() !== ''
              ? raw.result
          : summary

      return {
        type: 'finish',
        summary,
        finalMessage,
        plan,
      }
    }

    default:
      throw new Error('Planner response must include a supported type or action field')
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
