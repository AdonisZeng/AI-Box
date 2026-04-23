import type {
  AgentObservation,
  AgentPendingAction,
  AgentStartTaskRequest,
  AgentTaskEvent,
  AgentTaskSession,
} from '../../src/types/agent.ts'
import type { ApprovalGate } from './approval-gate.ts'
import type {
  PlannerDecision,
  PlannerNextInput,
} from './default-planner.ts'
import type { RunnerManager } from './runner-manager.ts'
import type { SkillExecutor } from './skill-executor.ts'
import type { SkillRegistry } from './skill-registry.ts'
import type { TaskSessionManager } from './task-session-manager.ts'
import type { ToolBroker } from './tool-broker.ts'

export interface AgentRuntimeDeps {
  sessions: TaskSessionManager
  planner: {
    next: (input: PlannerNextInput) => Promise<PlannerDecision>
  }
  skillRegistry: Pick<SkillRegistry, 'load'>
  skillExecutor: Pick<SkillExecutor, 'execute'>
  toolBroker: Pick<ToolBroker, 'listTools' | 'callTool'>
  runner: Pick<RunnerManager, 'run'>
  approvalGate: Pick<ApprovalGate, 'evaluate'>
}

type TaskEventListener = (event: AgentTaskEvent) => void

export class AgentRuntime {
  private deps: AgentRuntimeDeps
  private listeners = new Set<TaskEventListener>()

  constructor(deps: AgentRuntimeDeps) {
    this.deps = deps
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
      const tools = await this.deps.toolBroker.listTools(request.mcpServers)
      let nextAction = resumedAction ?? null

      for (;;) {
        const current = this.requireSession(taskId)
        const decision =
          nextAction !== null
            ? this.pendingActionToDecision(nextAction)
            : await this.deps.planner.next({
                prompt: request.prompt,
                mode: request.mode,
                provider: request.provider,
                skills,
                tools,
                observations: current.observations,
              })
        const skipApproval = nextAction !== null
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

            if (approval.requiresApproval && approval.request) {
              this.deps.sessions.setAwaitingApproval(taskId, approval.request, {
                type: 'use_skill',
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
          this.deps.sessions.addObservation(taskId, result.observation)
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

            if (approval.requiresApproval && approval.request) {
              this.deps.sessions.setAwaitingApproval(taskId, approval.request, {
                type: 'run_script',
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
            actionId: `script-${Date.now()}`,
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

        if (!skipApproval) {
          this.emitStepStarted(taskId, 'call_tool', decision.summary, decision.toolName)
        }

        if (!skipApproval) {
          const approval = this.deps.approvalGate.evaluate(request.mode, {
            type: 'call_tool',
            toolName: decision.toolName,
          })

          if (approval.requiresApproval && approval.request) {
            this.deps.sessions.setAwaitingApproval(taskId, approval.request, {
              type: 'call_tool',
              toolName: decision.toolName,
              arguments: decision.arguments,
              summary: decision.summary,
            })
            this.emitEvent(taskId, 'approval.required', approval.request)
            return this.requireSession(taskId)
          }
        }

        const toolServer = this.resolveToolServer(request, decision.toolName)
        this.emitEvent(taskId, 'tool.call.started', {
          name: decision.toolName,
          arguments: decision.arguments,
        })
        const result = await this.deps.toolBroker.callTool(
          toolServer,
          decision.toolName,
          decision.arguments
        )
        const observation: AgentObservation = {
          type: 'tool_result',
          actionId: `tool-${Date.now()}`,
          name: decision.toolName,
          status: 'success',
          summary: decision.summary,
          data: { result },
          rawExcerpt: this.toExcerpt(result),
          artifacts: [],
        }

        this.deps.sessions.addObservation(taskId, observation)
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

  private resolveToolServer(
    request: AgentStartTaskRequest,
    toolName: string
  ): AgentStartTaskRequest['mcpServers'][number] {
    const matchingServer = request.mcpServers.find((server) =>
      server.tools.some((tool) => tool.name === toolName)
    )

    if (matchingServer) {
      return matchingServer
    }

    const fallbackServer = request.mcpServers[0]
    if (!fallbackServer) {
      throw new Error(`No MCP server is available for tool ${toolName}`)
    }

    return fallbackServer
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
}
