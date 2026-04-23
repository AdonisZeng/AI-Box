import type {
  AgentApprovalRequest,
  AgentObservation,
  AgentPlanItem,
  AgentPlanningState,
  AgentPendingAction,
  AgentStartTaskRequest,
  AgentTaskEvent,
  AgentTaskSession,
} from '../../src/types/agent.ts'

export type CreateTaskSessionInput = AgentStartTaskRequest

const LOOP_RESULT_COMPACTION_THRESHOLD = 1000
const LOOP_RESULT_COMPACTION_PREVIEW = 700

export class TaskSessionManager {
  private sessions = new Map<string, AgentTaskSession>()

  create(input: CreateTaskSessionInput): AgentTaskSession {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const timestamp = Date.now()
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
          timestamp,
          payload: { prompt: input.prompt, mode: input.mode },
        },
      ],
      observations: [],
      planning: {
        items: [],
        roundsSinceUpdate: 0,
      },
      loop: {
        messages: [
          {
            role: 'user',
            content: input.prompt,
            timestamp,
          },
        ],
        turnCount: 1,
        transitionReason: null,
        compactionCount: 0,
      },
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

  updatePlanning(taskId: string, items: AgentPlanItem[]): AgentPlanningState {
    const session = this.require(taskId)
    const normalized = items.map((item) => ({
      content: this.requireNonEmptyString(item.content, 'content'),
      status: this.normalizePlanStatus(item.status),
      ...(item.activeForm && item.activeForm.trim()
        ? { activeForm: item.activeForm.trim() }
        : {}),
    }))
    const activeCount = normalized.filter((item) => item.status === 'in_progress').length
    if (activeCount > 1) {
      throw new Error('Agent planning can contain at most one in_progress item')
    }

    session.planning = {
      items: normalized,
      roundsSinceUpdate: 0,
    }

    return session.planning
  }

  incrementPlanningStaleness(taskId: string): AgentPlanningState {
    const session = this.require(taskId)
    session.planning = {
      ...session.planning,
      roundsSinceUpdate: session.planning.roundsSinceUpdate + 1,
    }

    return session.planning
  }

  recordAssistantDecision(taskId: string, decision: Record<string, unknown>): void {
    const session = this.require(taskId)
    session.loop.messages.push({
      role: 'assistant',
      content: decision,
      timestamp: Date.now(),
    })
    session.loop.transitionReason = null
  }

  recordObservationWriteBack(taskId: string, observation: AgentObservation): void {
    const session = this.require(taskId)
    const content = this.toLoopResultContent(session, observation.rawExcerpt)
    session.loop.messages.push({
      role: 'user',
      content: [
        {
          type: observation.type,
          tool_use_id: observation.actionId,
          status: observation.status,
          name: observation.name,
          summary: observation.summary,
          content,
          artifacts: observation.artifacts,
        },
      ],
      timestamp: Date.now(),
    })
    session.loop.turnCount += 1
    session.loop.transitionReason = observation.type
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

  private normalizePlanStatus(status: unknown): AgentPlanItem['status'] {
    if (status === 'pending' || status === 'in_progress' || status === 'completed') {
      return status
    }

    throw new Error(`Unsupported planning status: ${String(status)}`)
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Planning item ${field} must be a non-empty string`)
    }

    return value.trim()
  }

  private toLoopResultContent(session: AgentTaskSession, content: string): string {
    if (content.length <= LOOP_RESULT_COMPACTION_THRESHOLD) {
      return content
    }

    session.loop.compactionCount += 1
    return [
      content.slice(0, LOOP_RESULT_COMPACTION_PREVIEW),
      `[content compacted: original ${content.length} chars, preview ${LOOP_RESULT_COMPACTION_PREVIEW} chars]`,
    ].join('\n')
  }
}
