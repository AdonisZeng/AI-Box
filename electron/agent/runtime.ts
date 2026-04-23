import type {
  AgentObservation,
  AgentPlanItem,
  AgentPendingAction,
  AgentStartTaskRequest,
  AgentTaskEvent,
  AgentTaskSession,
} from '../../src/types/agent.ts'
import type { MCPTool } from '../../src/types/mcp.ts'
import type { ApprovalGate } from './approval-gate.ts'
import type { ApprovalDecision } from './approval-gate.ts'
import type { BackgroundTaskManager } from './background-task-manager.ts'
import { CapabilityRouter } from './capability-router.ts'
import type {
  PlannerDecision,
  PlannerNextInput,
} from './default-planner.ts'
import type { HookRunner } from './hook-runner.ts'
import type { AgentMemoryType } from './memory-store.ts'
import type { MemoryStore } from './memory-store.ts'
import { RecoveryController } from './recovery-controller.ts'
import type { AgentRecoveryState } from './recovery-controller.ts'
import type { RunnerManager } from './runner-manager.ts'
import type { SkillExecutor } from './skill-executor.ts'
import type { SkillRegistry } from './skill-registry.ts'
import type { AgentSubagentRunResult, DefaultSubagentRunner } from './subagent-runner.ts'
import type { ScheduleStore } from './schedule-store.ts'
import type { AgentGraphTaskStatus, TaskGraphStore } from './task-graph-store.ts'
import type { TaskSessionManager } from './task-session-manager.ts'
import type { ToolBroker } from './tool-broker.ts'

export interface AgentRuntimeDeps {
  sessions: TaskSessionManager
  planner: {
    next: (input: PlannerNextInput) => Promise<PlannerDecision>
  }
  skillRegistry: Pick<SkillRegistry, 'load'> & Partial<Pick<SkillRegistry, 'loadContent'>>
  skillExecutor: Pick<SkillExecutor, 'execute'>
  toolBroker: Pick<ToolBroker, 'listTools' | 'callTool'>
  runner: Pick<RunnerManager, 'run'>
  approvalGate: Pick<ApprovalGate, 'evaluate'>
  subagentRunner?: Pick<DefaultSubagentRunner, 'run'>
  memoryStore?: Pick<MemoryStore, 'list' | 'save'>
  hooks?: Pick<HookRunner, 'run'>
  recovery?: RecoveryController
  taskGraph?: Pick<TaskGraphStore, 'create' | 'update' | 'get' | 'list'>
  backgroundTasks?: Pick<BackgroundTaskManager, 'start' | 'check'>
  scheduleStore?: Pick<ScheduleStore, 'create' | 'list' | 'checkDue'>
  capabilityRouter?: CapabilityRouter
}

type TaskEventListener = (event: AgentTaskEvent) => void

const AGENT_UPDATE_PLAN_TOOL_NAME = 'agent.update_plan'
const AGENT_TASK_TOOL_NAME = 'agent.task'
const AGENT_LOAD_SKILL_TOOL_NAME = 'agent.load_skill'
const AGENT_SAVE_MEMORY_TOOL_NAME = 'agent.save_memory'
const AGENT_TASK_CREATE_TOOL_NAME = 'agent.task_create'
const AGENT_TASK_UPDATE_TOOL_NAME = 'agent.task_update'
const AGENT_TASK_GET_TOOL_NAME = 'agent.task_get'
const AGENT_TASK_LIST_TOOL_NAME = 'agent.task_list'
const AGENT_BACKGROUND_RUN_TOOL_NAME = 'agent.background_run'
const AGENT_BACKGROUND_CHECK_TOOL_NAME = 'agent.background_check'
const AGENT_SCHEDULE_CREATE_TOOL_NAME = 'agent.schedule_create'
const AGENT_SCHEDULE_LIST_TOOL_NAME = 'agent.schedule_list'
const AGENT_SCHEDULE_CHECK_TOOL_NAME = 'agent.schedule_check'
const AGENT_UPDATE_PLAN_TOOL: MCPTool = {
  name: AGENT_UPDATE_PLAN_TOOL_NAME,
  description:
    'Update the current task todo list. Use it for multi-step work and keep at most one item in_progress.',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Complete replacement list of current task planning items.',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            status: { enum: ['pending', 'in_progress', 'completed'] },
            activeForm: { type: 'string' },
          },
          required: ['content', 'status'],
        },
      },
    },
    required: ['items'],
  },
}
const AGENT_TASK_TOOL: MCPTool = {
  name: AGENT_TASK_TOOL_NAME,
  description: 'Run an isolated one-shot subtask with a clean context and return its summary.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      description: { type: 'string' },
      tools: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['prompt'],
  },
}
const AGENT_LOAD_SKILL_TOOL: MCPTool = {
  name: AGENT_LOAD_SKILL_TOOL_NAME,
  description: 'Load the full SKILL.md instructions for a locally available skill by id.',
  inputSchema: {
    type: 'object',
    properties: {
      skillId: { type: 'string' },
    },
    required: ['skillId'],
  },
}
const AGENT_SAVE_MEMORY_TOOL: MCPTool = {
  name: AGENT_SAVE_MEMORY_TOOL_NAME,
  description: 'Save durable, reusable user, project, feedback, or reference memory.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      type: { enum: ['user', 'feedback', 'project', 'reference'] },
      description: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['name', 'type', 'description', 'content'],
  },
}
const AGENT_TASK_CREATE_TOOL: MCPTool = {
  name: AGENT_TASK_CREATE_TOOL_NAME,
  description: 'Create a durable task graph item for long-running or dependent work.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      blockedBy: { type: 'array', items: { type: 'string' } },
    },
    required: ['title', 'description'],
  },
}
const AGENT_TASK_UPDATE_TOOL: MCPTool = {
  name: AGENT_TASK_UPDATE_TOOL_NAME,
  description: 'Update a durable task graph item status, details, or blockers.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      status: { enum: ['todo', 'in_progress', 'done', 'cancelled'] },
      blockedBy: { type: 'array', items: { type: 'string' } },
    },
    required: ['id'],
  },
}
const AGENT_TASK_GET_TOOL: MCPTool = {
  name: AGENT_TASK_GET_TOOL_NAME,
  description: 'Load one durable task graph item by id.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
}
const AGENT_TASK_LIST_TOOL: MCPTool = {
  name: AGENT_TASK_LIST_TOOL_NAME,
  description: 'List durable task graph items, optionally only ready work.',
  inputSchema: {
    type: 'object',
    properties: { readyOnly: { type: 'boolean' } },
  },
}
const AGENT_BACKGROUND_RUN_TOOL: MCPTool = {
  name: AGENT_BACKGROUND_RUN_TOOL_NAME,
  description: 'Start a long-running Node, Python, or Shell command in the background.',
  inputSchema: {
    type: 'object',
    properties: {
      runner: { enum: ['node', 'python', 'shell'] },
      command: { type: 'string' },
      cwd: { type: 'string' },
      summary: { type: 'string' },
    },
    required: ['runner', 'command', 'cwd', 'summary'],
  },
}
const AGENT_BACKGROUND_CHECK_TOOL: MCPTool = {
  name: AGENT_BACKGROUND_CHECK_TOOL_NAME,
  description: 'Check a previously started background task by id.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
}
const AGENT_SCHEDULE_CREATE_TOOL: MCPTool = {
  name: AGENT_SCHEDULE_CREATE_TOOL_NAME,
  description: 'Create a local interval schedule that injects due notifications into the agent.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      prompt: { type: 'string' },
      everyMinutes: { type: 'number' },
      startAt: { type: 'number' },
    },
    required: ['name', 'prompt', 'everyMinutes'],
  },
}
const AGENT_SCHEDULE_LIST_TOOL: MCPTool = {
  name: AGENT_SCHEDULE_LIST_TOOL_NAME,
  description: 'List local Agent schedules.',
  inputSchema: { type: 'object', properties: {} },
}
const AGENT_SCHEDULE_CHECK_TOOL: MCPTool = {
  name: AGENT_SCHEDULE_CHECK_TOOL_NAME,
  description: 'Check local Agent schedules and return due notifications.',
  inputSchema: {
    type: 'object',
    properties: { now: { type: 'number' } },
  },
}
const BUILT_IN_AGENT_TOOLS: MCPTool[] = [
  AGENT_UPDATE_PLAN_TOOL,
  AGENT_TASK_TOOL,
  AGENT_LOAD_SKILL_TOOL,
  AGENT_SAVE_MEMORY_TOOL,
  AGENT_TASK_CREATE_TOOL,
  AGENT_TASK_UPDATE_TOOL,
  AGENT_TASK_GET_TOOL,
  AGENT_TASK_LIST_TOOL,
  AGENT_BACKGROUND_RUN_TOOL,
  AGENT_BACKGROUND_CHECK_TOOL,
  AGENT_SCHEDULE_CREATE_TOOL,
  AGENT_SCHEDULE_LIST_TOOL,
  AGENT_SCHEDULE_CHECK_TOOL,
]

export class AgentRuntime {
  private deps: AgentRuntimeDeps
  private recovery: RecoveryController
  private capabilityRouter: CapabilityRouter
  private listeners = new Set<TaskEventListener>()

  constructor(deps: AgentRuntimeDeps) {
    this.deps = deps
    this.recovery = deps.recovery ?? new RecoveryController()
    this.capabilityRouter = deps.capabilityRouter ?? new CapabilityRouter()
  }

  onTaskEvent(listener: TaskEventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async start(request: AgentStartTaskRequest): Promise<AgentTaskSession> {
    const session = this.deps.sessions.create(request)
    const createdEvent = session.events[0]
    if (createdEvent) {
      this.notify(createdEvent)
    }

    return this.continueSession(session.id)
  }

  getTaskState(taskId: string): AgentTaskSession | null {
    return this.deps.sessions.get(taskId) ?? null
  }

  async approveAction(taskId: string, actionId: string): Promise<AgentTaskSession | null> {
    const session = this.deps.sessions.get(taskId)
    if (!session || session.approval.request?.actionId !== actionId) {
      return null
    }

    const pendingAction = this.deps.sessions.approve(taskId)
    if (!pendingAction) {
      return this.deps.sessions.get(taskId) ?? null
    }

    return this.continueSession(taskId, pendingAction)
  }

  rejectAction(taskId: string, actionId: string): AgentTaskSession | null {
    const session = this.deps.sessions.get(taskId)
    if (!session || session.approval.request?.actionId !== actionId) {
      return null
    }

    this.deps.sessions.reject(taskId)
    this.emitEvent(taskId, 'task.rejected', {
      message: 'Action rejected by user.',
    })
    return this.deps.sessions.get(taskId) ?? null
  }

  cancelTask(taskId: string): AgentTaskSession | null {
    const session = this.deps.sessions.get(taskId)
    if (!session) {
      return null
    }

    if (
      session.status === 'completed' ||
      session.status === 'failed' ||
      session.status === 'rejected'
    ) {
      return session
    }

    session.status = 'failed'
    session.approval = { state: 'resolved', request: null }
    session.pendingAction = null
    this.emitEvent(taskId, 'task.failed', {
      message: 'Task cancelled by user.',
    })

    return session
  }

  private async continueSession(
    taskId: string,
    resumedAction?: AgentPendingAction
  ): Promise<AgentTaskSession> {
    const session = this.requireSession(taskId)

    try {
      const request: AgentStartTaskRequest = {
        prompt: session.prompt,
        mode: session.mode,
        provider: session.provider,
        mcpServers: session.mcpServers,
      }
      const skills = await this.deps.skillRegistry.load()
      const memories = (await this.deps.memoryStore?.list()) ?? []
      const tools = this.capabilityRouter.listTools({
        builtInTools: BUILT_IN_AGENT_TOOLS,
        externalTools: await this.deps.toolBroker.listTools(request.mcpServers),
        mcpServers: request.mcpServers,
      })
      let nextAction = resumedAction ?? null
      const recoveryState = this.recovery.createState()

      for (;;) {
        const current = this.requireSession(taskId)
        const pendingAction = nextAction
        const isResumingPendingAction = pendingAction !== null
        const decision =
          isResumingPendingAction
            ? this.pendingActionToDecision(pendingAction)
            : await this.nextPlannerDecisionWithRecovery(
                taskId,
                {
                  prompt: request.prompt,
                  mode: request.mode,
                  provider: request.provider,
                  skills,
                  tools,
                  memories,
                  planning: current.planning,
                  loop: current.loop,
                  observations: current.observations,
                },
                recoveryState
              )
        const actionId =
          decision.type === 'finish'
            ? null
            : pendingAction?.actionId ?? this.createActionId(decision.type)

        if (!isResumingPendingAction) {
          this.deps.sessions.recordAssistantDecision(
            taskId,
            this.decisionToLoopMessage(decision, actionId)
          )
        }

        const skipApproval = isResumingPendingAction
        nextAction = null

        if (decision.plan && decision.plan.length > 0) {
          this.emitEvent(taskId, 'plan.generated', { steps: decision.plan })
        }

        if (decision.type === 'finish') {
          current.status = 'completed'
          this.emitEvent(taskId, 'task.completed', {
            summary: decision.summary,
            finalMessage: decision.finalMessage,
          })
          return current
        }

        if (decision.type === 'use_skill') {
          const skill = skills.find((item) => item.id === decision.skillId)
          if (!skill) {
            throw new Error(`Unknown skill: ${decision.skillId}`)
          }

          if (!skipApproval && skill.isExecutable) {
            const approval = this.deps.approvalGate.evaluate(request.mode, {
              type: 'use_skill',
              skillId: skill.id,
            })

            this.assertActionAllowed(approval)
            if (approval.requiresApproval && approval.request) {
              this.deps.sessions.setAwaitingApproval(taskId, approval.request, {
                type: 'use_skill',
                actionId: actionId ?? undefined,
                skillId: skill.id,
                summary: decision.summary,
              })
              this.emitEvent(taskId, 'approval.required', approval.request)
              return this.requireSession(taskId)
            }
          }

          this.emitStepStarted(taskId, 'use_skill', decision.summary, skill.id)
          this.emitEvent(taskId, 'skill.selected', {
            skillId: skill.id,
            name: skill.name,
          })
          this.emitEvent(taskId, 'script.started', {
            skillId: skill.id,
            command: skill.entrypoints[0]?.command ?? null,
          })

          const result = await this.deps.skillExecutor.execute(skill)
          const observation: AgentObservation = {
            ...result.observation,
            actionId: actionId ?? result.observation.actionId,
          }
          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'script.output', {
            output: result.rawExcerpt,
          })
          this.emitEvent(taskId, 'script.finished', {
            skillId: skill.id,
            status: result.status,
            summary: result.summary,
          })
          this.emitStepCompleted(taskId, 'use_skill', decision.summary, skill.id)
          continue
        }

        if (decision.type === 'run_script') {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'run_script', decision.summary, decision.command)
          }

          if (!skipApproval) {
            const approval = this.deps.approvalGate.evaluate(request.mode, {
              type: 'run_script',
              command: decision.command,
            })

            this.assertActionAllowed(approval)
            if (approval.requiresApproval && approval.request) {
              this.deps.sessions.setAwaitingApproval(taskId, approval.request, {
                type: 'run_script',
                actionId: actionId ?? undefined,
                runner: decision.runner,
                command: decision.command,
                cwd: decision.cwd,
                summary: decision.summary,
              })
              this.emitEvent(taskId, 'approval.required', approval.request)
              return this.requireSession(taskId)
            }
          }

          this.emitEvent(taskId, 'script.started', {
            command: decision.command,
            runner: decision.runner,
            cwd: decision.cwd,
          })

          const result = await this.deps.runner.run({
            runner: decision.runner,
            command: decision.command,
            cwd: decision.cwd,
          })
          const observation: AgentObservation = {
            type: 'script_result',
            actionId: actionId ?? this.createActionId('run_script'),
            name: decision.command,
            status: result.exitCode === 0 ? 'success' : 'error',
            summary: decision.summary,
            data: {
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
            },
            rawExcerpt: [result.stdout, result.stderr].filter(Boolean).join('\n').slice(0, 500),
            artifacts: [],
          }

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'script.output', {
            output: observation.rawExcerpt,
          })
          this.emitEvent(taskId, 'script.finished', {
            command: decision.command,
            status: observation.status,
          })
          this.emitStepCompleted(taskId, 'run_script', decision.summary, decision.command)
          continue
        }

        if (decision.toolName === AGENT_TASK_TOOL_NAME) {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
          }
          this.emitEvent(taskId, 'tool.call.started', {
            name: decision.toolName,
            arguments: decision.arguments,
          })
          const result = await this.runSubagentTool(
            taskId,
            request.provider,
            tools,
            decision.arguments
          )
          const observation = this.createBuiltInToolObservation(
            actionId,
            decision.toolName,
            decision.summary,
            result
          )

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'tool.call.finished', {
            name: decision.toolName,
            summary: decision.summary,
            result,
            status: 'success',
          })
          this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
          continue
        }

        if (decision.toolName === AGENT_LOAD_SKILL_TOOL_NAME) {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
          }
          this.emitEvent(taskId, 'tool.call.started', {
            name: decision.toolName,
            arguments: decision.arguments,
          })
          const result = await this.loadSkillTool(decision.arguments)
          const observation = this.createBuiltInToolObservation(
            actionId,
            decision.toolName,
            decision.summary,
            result
          )

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'tool.call.finished', {
            name: decision.toolName,
            summary: decision.summary,
            result,
            status: 'success',
          })
          this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
          continue
        }

        if (decision.toolName === AGENT_SAVE_MEMORY_TOOL_NAME) {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
          }
          this.emitEvent(taskId, 'tool.call.started', {
            name: decision.toolName,
            arguments: decision.arguments,
          })
          const result = await this.saveMemoryTool(decision.arguments)
          const observation = this.createBuiltInToolObservation(
            actionId,
            decision.toolName,
            decision.summary,
            result
          )

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'memory.saved', {
            memoryId: result.id,
            type: result.type,
          })
          this.emitEvent(taskId, 'tool.call.finished', {
            name: decision.toolName,
            summary: decision.summary,
            result,
            status: 'success',
          })
          this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
          continue
        }

        if (this.isTaskGraphTool(decision.toolName)) {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
          }
          this.emitEvent(taskId, 'tool.call.started', {
            name: decision.toolName,
            arguments: decision.arguments,
          })
          const result = await this.runTaskGraphTool(decision.toolName, decision.arguments)
          const observation = this.createBuiltInToolObservation(
            actionId,
            decision.toolName,
            decision.summary,
            result
          )

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'graph.task.updated', {
            toolName: decision.toolName,
            result,
          })
          this.emitEvent(taskId, 'tool.call.finished', {
            name: decision.toolName,
            summary: decision.summary,
            result,
            status: 'success',
          })
          this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
          continue
        }

        if (this.isBackgroundTool(decision.toolName)) {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
          }
          this.emitEvent(taskId, 'tool.call.started', {
            name: decision.toolName,
            arguments: decision.arguments,
          })
          const result = await this.runBackgroundTool(decision.toolName, decision.arguments)
          const observation = this.createBuiltInToolObservation(
            actionId,
            decision.toolName,
            decision.summary,
            result
          )

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'background.task.updated', {
            toolName: decision.toolName,
            result,
          })
          this.emitEvent(taskId, 'tool.call.finished', {
            name: decision.toolName,
            summary: decision.summary,
            result,
            status: 'success',
          })
          this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
          continue
        }

        if (this.isScheduleTool(decision.toolName)) {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
          }
          this.emitEvent(taskId, 'tool.call.started', {
            name: decision.toolName,
            arguments: decision.arguments,
          })
          const result = await this.runScheduleTool(taskId, decision.toolName, decision.arguments)
          const observation = this.createBuiltInToolObservation(
            actionId,
            decision.toolName,
            decision.summary,
            result
          )

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.deps.sessions.incrementPlanningStaleness(taskId)
          this.emitEvent(taskId, 'tool.call.finished', {
            name: decision.toolName,
            summary: decision.summary,
            result,
            status: 'success',
          })
          this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
          continue
        }

        if (decision.toolName === AGENT_UPDATE_PLAN_TOOL_NAME) {
          if (!skipApproval) {
            this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
          }
          this.emitEvent(taskId, 'tool.call.started', {
            name: decision.toolName,
            arguments: decision.arguments,
          })
          const result = this.updatePlanningFromTool(taskId, decision.arguments)
          const observation: AgentObservation = {
            type: 'tool_result',
            actionId: actionId ?? this.createActionId('call_tool'),
            name: decision.toolName,
            status: 'success',
            summary: decision.summary,
            data: { result },
            rawExcerpt: this.toExcerpt(result),
            artifacts: [],
          }

          this.deps.sessions.addObservation(taskId, observation)
          this.deps.sessions.recordObservationWriteBack(taskId, observation)
          this.emitEvent(taskId, 'tool.call.finished', {
            name: decision.toolName,
            summary: decision.summary,
            result,
            status: 'success',
          })
          this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
          continue
        }

        if (!skipApproval) {
          this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
        }

        if (!skipApproval) {
          const approval = this.deps.approvalGate.evaluate(request.mode, {
            type: 'call_tool',
            toolName: decision.toolName,
            arguments: decision.arguments,
          })

          this.assertActionAllowed(approval)
          if (approval.requiresApproval && approval.request) {
            this.deps.sessions.setAwaitingApproval(taskId, approval.request, {
              type: 'call_tool',
              actionId: actionId ?? undefined,
              toolName: decision.toolName,
              arguments: decision.arguments,
              summary: decision.summary,
            })
            this.emitEvent(taskId, 'approval.required', approval.request)
            return this.requireSession(taskId)
          }
        }

        const toolRoute = this.resolveToolRoute(request, decision.toolName)
        await this.runPreToolHook(taskId, decision.toolName, decision.arguments)
        this.emitEvent(taskId, 'tool.call.started', {
          name: decision.toolName,
          arguments: decision.arguments,
        })
        const result = await this.deps.toolBroker.callTool(
          toolRoute.server,
          toolRoute.toolName,
          decision.arguments
        )
        const observation: AgentObservation = {
          type: 'tool_result',
          actionId: actionId ?? this.createActionId('call_tool'),
          name: decision.toolName,
          status: 'success',
          summary: decision.summary,
          data: { result },
          rawExcerpt: this.toExcerpt(result),
          artifacts: [],
        }

        this.deps.sessions.addObservation(taskId, observation)
        this.deps.sessions.recordObservationWriteBack(taskId, observation)
        this.deps.sessions.incrementPlanningStaleness(taskId)
        await this.runPostToolHook(taskId, decision.toolName, decision.arguments, observation)
        this.emitEvent(taskId, 'tool.call.finished', {
          name: decision.toolName,
          summary: decision.summary,
          result,
          status: 'success',
        })
        this.emitStepCompleted(taskId, 'call_tool', decision.summary, decision.toolName)
      }
    } catch (error) {
      const failed = this.requireSession(taskId)
      failed.status = 'failed'
      this.emitEvent(taskId, 'task.failed', {
        message: error instanceof Error ? error.message : String(error),
      })
      return failed
    }
  }

  private decisionToLoopMessage(
    decision: PlannerDecision,
    actionId: string | null
  ): Record<string, unknown> {
    if (decision.type === 'call_tool') {
      return {
        type: decision.type,
        toolName: decision.toolName,
        arguments: decision.arguments,
        summary: decision.summary,
        plan: decision.plan,
        tool_use_id: actionId,
      }
    }

    if (decision.type === 'use_skill') {
      return {
        type: decision.type,
        skillId: decision.skillId,
        summary: decision.summary,
        plan: decision.plan,
        tool_use_id: actionId,
      }
    }

    if (decision.type === 'run_script') {
      return {
        type: decision.type,
        runner: decision.runner,
        command: decision.command,
        cwd: decision.cwd,
        summary: decision.summary,
        plan: decision.plan,
        tool_use_id: actionId,
      }
    }

    return {
      type: decision.type,
      summary: decision.summary,
      finalMessage: decision.finalMessage,
      plan: decision.plan,
    }
  }

  private async nextPlannerDecisionWithRecovery(
    taskId: string,
    input: PlannerNextInput,
    state: AgentRecoveryState
  ): Promise<PlannerDecision> {
    let currentInput = input

    for (;;) {
      try {
        return await this.deps.planner.next(currentInput)
      } catch (error) {
        const recovery = this.recovery.choose({ error, state })
        this.emitEvent(taskId, 'task.recovery', {
          kind: recovery.kind,
          reason: recovery.reason,
          error: error instanceof Error ? error.message : String(error),
        })

        if (recovery.kind === 'fail') {
          throw error
        }

        if (recovery.kind === 'compact') {
          this.deps.sessions.compactLoopForRecovery(taskId, recovery.reason)
        }

        if (recovery.kind === 'continue') {
          this.deps.sessions.recordHookMessage(
            taskId,
            `Recovery instruction: ${recovery.reason} Ask the model to continue with valid JSON.`
          )
        }

        const current = this.requireSession(taskId)
        currentInput = {
          ...currentInput,
          planning: current.planning,
          loop: current.loop,
          observations: current.observations,
        }
      }
    }
  }

  private assertActionAllowed(approval: ApprovalDecision): void {
    if (approval.behavior === 'deny') {
      throw new Error(approval.reason ?? 'Action denied by permission policy')
    }
  }

  private async runPreToolHook(
    taskId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<void> {
    if (!this.deps.hooks) {
      return
    }

    const result = await this.deps.hooks.run('PreToolUse', {
      taskId,
      toolName,
      arguments: args,
    })
    this.handleHookResult(taskId, 'PreToolUse', toolName, result)
  }

  private async runPostToolHook(
    taskId: string,
    toolName: string,
    args: Record<string, unknown>,
    observation: AgentObservation
  ): Promise<void> {
    if (!this.deps.hooks) {
      return
    }

    const result = await this.deps.hooks.run('PostToolUse', {
      taskId,
      toolName,
      arguments: args,
      observation,
    })
    this.handleHookResult(taskId, 'PostToolUse', toolName, result)
  }

  private handleHookResult(
    taskId: string,
    hookName: string,
    targetName: string,
    result: { exitCode: number; message: string }
  ): void {
    if (result.exitCode === 1) {
      throw new Error(result.message || `${hookName} blocked ${targetName}`)
    }

    if (result.exitCode === 2 && result.message) {
      this.deps.sessions.recordHookMessage(taskId, result.message)
      this.emitEvent(taskId, 'hook.message', {
        hookName,
        targetName,
        message: result.message,
      })
    }
  }

  private updatePlanningFromTool(
    taskId: string,
    args: Record<string, unknown>
  ): Record<string, unknown> {
    const items = this.extractPlanningItems(args)
    const planning = this.deps.sessions.updatePlanning(taskId, items)
    this.emitEvent(taskId, 'plan.generated', {
      steps: this.renderPlanningSteps(planning.items),
      items: planning.items,
      roundsSinceUpdate: planning.roundsSinceUpdate,
    })

    return planning
  }

  private extractPlanningItems(args: Record<string, unknown>): AgentPlanItem[] {
    const items = args.items
    if (!Array.isArray(items)) {
      throw new Error('agent.update_plan requires an items array')
    }

    return items.map((item) => {
      if (!this.isRecord(item)) {
        throw new Error('agent.update_plan items must be objects')
      }

      return {
        content: item.content,
        status: item.status,
        ...(typeof item.activeForm === 'string' ? { activeForm: item.activeForm } : {}),
      } as AgentPlanItem
    })
  }

  private renderPlanningSteps(items: AgentPlanItem[]): string[] {
    return items.map((item) => `[${item.status}] ${item.activeForm ?? item.content}`)
  }

  private createBuiltInToolObservation(
    actionId: string | null,
    toolName: string,
    summary: string,
    result: unknown
  ): AgentObservation {
    return {
      type: 'tool_result',
      actionId: actionId ?? this.createActionId('call_tool'),
      name: toolName,
      status: 'success',
      summary,
      data: { result },
      rawExcerpt: this.toExcerpt(result),
      artifacts: [],
    }
  }

  private async runSubagentTool(
    parentTaskId: string,
    provider: AgentStartTaskRequest['provider'],
    tools: MCPTool[],
    args: Record<string, unknown>
  ): Promise<AgentSubagentRunResult> {
    if (!this.deps.subagentRunner) {
      throw new Error('Subagent runner is not configured')
    }

    const prompt = this.requireStringArg(args, 'prompt')
    const description =
      typeof args.description === 'string' && args.description.trim()
        ? args.description.trim()
        : undefined
    const requestedToolNames = Array.isArray(args.tools)
      ? args.tools
          .filter((tool): tool is string => typeof tool === 'string' && tool.trim().length > 0)
          .map((tool) => tool.trim())
      : []
    const requestedToolNameSet = new Set(requestedToolNames)
    const availableTools = tools.filter((tool) => requestedToolNameSet.has(tool.name))

    return this.deps.subagentRunner.run({
      prompt,
      description,
      parentTaskId,
      provider,
      availableTools,
    })
  }

  private async loadSkillTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const skillId = this.requireStringArg(args, 'skillId')
    const loadContent = this.deps.skillRegistry.loadContent
    if (!loadContent) {
      throw new Error('Skill content loader is not configured')
    }

    const loaded = await loadContent.call(this.deps.skillRegistry, skillId)
    if (!loaded) {
      throw new Error(`Unknown skill: ${skillId}`)
    }

    return {
      skillId: loaded.id,
      content: loaded.content,
    }
  }

  private async saveMemoryTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.deps.memoryStore) {
      throw new Error('Memory store is not configured')
    }

    const saved = await this.deps.memoryStore.save({
      name: this.requireStringArg(args, 'name'),
      type: this.requireMemoryType(args.type),
      description: this.requireStringArg(args, 'description'),
      content: this.requireStringArg(args, 'content'),
    })

    return saved
  }

  private isTaskGraphTool(toolName: string): boolean {
    return (
      toolName === AGENT_TASK_CREATE_TOOL_NAME ||
      toolName === AGENT_TASK_UPDATE_TOOL_NAME ||
      toolName === AGENT_TASK_GET_TOOL_NAME ||
      toolName === AGENT_TASK_LIST_TOOL_NAME
    )
  }

  private async runTaskGraphTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.deps.taskGraph) {
      throw new Error('Task graph store is not configured')
    }

    if (toolName === AGENT_TASK_CREATE_TOOL_NAME) {
      return this.deps.taskGraph.create({
        title: this.requireStringArg(args, 'title'),
        description: this.requireStringArg(args, 'description'),
        blockedBy: this.optionalStringArray(args.blockedBy),
      })
    }

    if (toolName === AGENT_TASK_UPDATE_TOOL_NAME) {
      return this.deps.taskGraph.update(this.requireStringArg(args, 'id'), {
        ...(typeof args.title === 'string' ? { title: args.title } : {}),
        ...(typeof args.description === 'string' ? { description: args.description } : {}),
        ...(args.status !== undefined ? { status: this.requireGraphTaskStatus(args.status) } : {}),
        ...(Array.isArray(args.blockedBy) ? { blockedBy: this.optionalStringArray(args.blockedBy) } : {}),
      })
    }

    if (toolName === AGENT_TASK_GET_TOOL_NAME) {
      return this.deps.taskGraph.get(this.requireStringArg(args, 'id'))
    }

    return this.deps.taskGraph.list({
      readyOnly: args.readyOnly === true,
    })
  }

  private isBackgroundTool(toolName: string): boolean {
    return toolName === AGENT_BACKGROUND_RUN_TOOL_NAME || toolName === AGENT_BACKGROUND_CHECK_TOOL_NAME
  }

  private async runBackgroundTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.deps.backgroundTasks) {
      throw new Error('Background task manager is not configured')
    }

    if (toolName === AGENT_BACKGROUND_RUN_TOOL_NAME) {
      return this.deps.backgroundTasks.start({
        runner: this.requireRunner(args.runner),
        command: this.requireStringArg(args, 'command'),
        cwd: this.requireStringArg(args, 'cwd'),
        summary: this.requireStringArg(args, 'summary'),
      })
    }

    return this.deps.backgroundTasks.check(this.requireStringArg(args, 'id'))
  }

  private isScheduleTool(toolName: string): boolean {
    return (
      toolName === AGENT_SCHEDULE_CREATE_TOOL_NAME ||
      toolName === AGENT_SCHEDULE_LIST_TOOL_NAME ||
      toolName === AGENT_SCHEDULE_CHECK_TOOL_NAME
    )
  }

  private async runScheduleTool(
    taskId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.deps.scheduleStore) {
      throw new Error('Schedule store is not configured')
    }

    if (toolName === AGENT_SCHEDULE_CREATE_TOOL_NAME) {
      return this.deps.scheduleStore.create({
        name: this.requireStringArg(args, 'name'),
        prompt: this.requireStringArg(args, 'prompt'),
        everyMinutes: this.requirePositiveNumberArg(args, 'everyMinutes'),
        ...(typeof args.startAt === 'number' ? { startAt: args.startAt } : {}),
      })
    }

    if (toolName === AGENT_SCHEDULE_LIST_TOOL_NAME) {
      return this.deps.scheduleStore.list()
    }

    const due = await this.deps.scheduleStore.checkDue(
      typeof args.now === 'number' ? args.now : Date.now()
    )
    for (const notification of due) {
      this.emitEvent(taskId, 'schedule.due', notification)
      this.deps.sessions.recordHookMessage(
        taskId,
        `Schedule due: ${notification.name}\n${notification.prompt}`
      )
    }

    return due
  }

  private requireGraphTaskStatus(value: unknown): AgentGraphTaskStatus {
    if (value === 'todo' || value === 'in_progress' || value === 'done' || value === 'cancelled') {
      return value
    }

    throw new Error(`Unsupported graph task status: ${String(value)}`)
  }

  private requireRunner(value: unknown): 'node' | 'python' | 'shell' {
    if (value === 'node' || value === 'python' || value === 'shell') {
      return value
    }

    throw new Error(`Unsupported background runner: ${String(value)}`)
  }

  private requirePositiveNumberArg(args: Record<string, unknown>, field: string): number {
    const value = args[field]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(`${field} must be a positive number`)
    }

    return value
  }

  private optionalStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return []
    }

    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
  }

  private requireMemoryType(value: unknown): AgentMemoryType {
    if (value === 'user' || value === 'feedback' || value === 'project' || value === 'reference') {
      return value
    }

    throw new Error(`Unsupported memory type: ${String(value)}`)
  }

  private requireStringArg(args: Record<string, unknown>, field: string): string {
    const value = args[field]
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${field} must be a non-empty string`)
    }

    return value.trim()
  }

  private createActionId(actionType: 'call_tool' | 'use_skill' | 'run_script'): string {
    return `${actionType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  private pendingActionToDecision(action: AgentPendingAction): PlannerDecision {
    if (action.type === 'call_tool') {
      return {
        type: 'call_tool',
        toolName: action.toolName,
        arguments: action.arguments,
        summary: action.summary,
      }
    }

    if (action.type === 'use_skill') {
      return {
        type: 'use_skill',
        skillId: action.skillId,
        summary: action.summary,
      }
    }

    return {
      type: 'run_script',
      runner: action.runner,
      command: action.command,
      cwd: action.cwd,
      summary: action.summary,
    }
  }

  private resolveToolRoute(
    request: AgentStartTaskRequest,
    toolName: string
  ): { server: AgentStartTaskRequest['mcpServers'][number] | null; toolName: string } {
    return this.capabilityRouter.resolve({
      toolName,
      mcpServers: request.mcpServers,
    })
  }

  private emitEvent(
    taskId: string,
    type: AgentTaskEvent['type'],
    payload?: Record<string, unknown>
  ): void {
    const event: AgentTaskEvent = {
      type,
      taskId,
      timestamp: Date.now(),
      payload,
    }

    this.deps.sessions.appendEvent(taskId, event)
    this.notify(event)
  }

  private notify(event: AgentTaskEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  private requireSession(taskId: string): AgentTaskSession {
    const session = this.deps.sessions.get(taskId)
    if (!session) {
      throw new Error(`Unknown task session: ${taskId}`)
    }

    return session
  }

  private emitStepStarted(
    taskId: string,
    actionType: 'call_tool' | 'use_skill' | 'run_script',
    summary: string,
    name: string
  ): void {
    this.emitEvent(taskId, 'step.started', {
      actionType,
      summary,
      name,
    })
  }

  private emitStepCompleted(
    taskId: string,
    actionType: 'call_tool' | 'use_skill' | 'run_script',
    summary: string,
    name: string
  ): void {
    this.emitEvent(taskId, 'step.completed', {
      actionType,
      summary,
      name,
    })
  }

  private toExcerpt(value: unknown): string {
    try {
      return JSON.stringify(value).slice(0, 500)
    } catch {
      return String(value).slice(0, 500)
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
