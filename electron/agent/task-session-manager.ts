import type {
  AgentApprovalRequest,
  AgentObservation,
  AgentPendingAction,
  AgentStartTaskRequest,
  AgentTaskEvent,
  AgentTaskSession,
} from '../../src/types/agent.ts'

export type CreateTaskSessionInput = AgentStartTaskRequest

export class TaskSessionManager {
  private sessions = new Map<string, AgentTaskSession>()

  create(input: CreateTaskSessionInput): AgentTaskSession {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const session: AgentTaskSession = {
      id,
      prompt: input.prompt,
      mode: input.mode,
      provider: input.provider,
      mcpServers: input.mcpServers,
      status: 'running',
      events: [
        {
          type: 'task.created',
          taskId: id,
          timestamp: Date.now(),
          payload: { prompt: input.prompt, mode: input.mode },
        },
      ],
      observations: [],
      approval: {
        state: 'idle',
        request: null,
      },
      pendingAction: null,
    }

    this.sessions.set(id, session)
    return session
  }

  get(taskId: string): AgentTaskSession | undefined {
    return this.sessions.get(taskId)
  }

  appendEvent(taskId: string, event: AgentTaskEvent): void {
    const session = this.require(taskId)
    session.events.push(event)
  }

  addObservation(taskId: string, observation: AgentObservation): void {
    const session = this.require(taskId)
    session.observations.push(observation)
  }

  setAwaitingApproval(
    taskId: string,
    request: AgentApprovalRequest,
    pendingAction: AgentPendingAction
  ): void {
    const session = this.require(taskId)
    session.status = 'awaiting-approval'
    session.approval = { state: 'pending', request }
    session.pendingAction = pendingAction
  }

  approve(taskId: string): AgentPendingAction | null {
    const session = this.require(taskId)
    session.status = 'running'
    session.approval = { state: 'resolved', request: null }
    const pendingAction = session.pendingAction
    session.pendingAction = null
    return pendingAction
  }

  reject(taskId: string): void {
    const session = this.require(taskId)
    session.status = 'rejected'
    session.approval = { state: 'resolved', request: null }
    session.pendingAction = null
  }

  private require(taskId: string): AgentTaskSession {
    const session = this.sessions.get(taskId)
    if (!session) {
      throw new Error(`Unknown task session: ${taskId}`)
    }
    return session
  }
}
