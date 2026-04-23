import { create } from 'zustand'
import type {
  AgentApprovalRequest,
  AgentTaskEvent,
  AgentTaskStatus,
} from '../../types/agent.ts'

interface ToolTrace {
  name: string
  result: unknown
  summary?: string
}

interface AgentStoreState {
  currentTaskId: string | null
  status: AgentTaskStatus | 'idle'
  plan: string[]
  selectedSkills: string[]
  toolCalls: ToolTrace[]
  logs: string[]
  finalMessage: string | null
  approval: AgentApprovalRequest | null
  applyEvent: (event: AgentTaskEvent) => void
  reset: () => void
}

const initialState: Omit<AgentStoreState, 'applyEvent' | 'reset'> = {
  currentTaskId: null,
  status: 'idle',
  plan: [],
  selectedSkills: [],
  toolCalls: [],
  logs: [],
  finalMessage: null,
  approval: null,
}

export const createAgentStore = () =>
  create<AgentStoreState>((set) => ({
    ...initialState,
    applyEvent: (event) => {
      set((state) => {
        const nextState: Omit<AgentStoreState, 'applyEvent' | 'reset'> = {
          ...state,
          currentTaskId: event.taskId,
        }

        if (event.type === 'task.created') {
          nextState.status = 'running'
          nextState.finalMessage = null
          nextState.approval = null
          return nextState
        }

        if (event.type === 'plan.generated') {
          nextState.plan = Array.isArray(event.payload?.steps)
            ? event.payload.steps.map((step) => String(step))
            : []
          return nextState
        }

        if (event.type === 'skill.selected') {
          const skillId = String(event.payload?.skillId ?? '')
          nextState.selectedSkills = skillId
            ? [...state.selectedSkills, skillId]
            : state.selectedSkills
          return nextState
        }

        if (event.type === 'tool.call.finished') {
          nextState.toolCalls = [
            ...state.toolCalls,
            {
              name: String(event.payload?.name ?? ''),
              result: event.payload?.result,
              summary:
                typeof event.payload?.summary === 'string'
                  ? event.payload.summary
                  : undefined,
            },
          ]
          return nextState
        }

        if (event.type === 'script.output') {
          const output = String(event.payload?.output ?? '')
          nextState.logs = output ? [...state.logs, output] : state.logs
          return nextState
        }

        if (event.type === 'approval.required') {
          nextState.status = 'awaiting-approval'
          nextState.approval = event.payload as AgentApprovalRequest
          return nextState
        }

        if (event.type === 'task.completed') {
          nextState.status = 'completed'
          nextState.approval = null
          nextState.finalMessage = String(event.payload?.finalMessage ?? '')
          return nextState
        }

        if (event.type === 'task.failed') {
          nextState.status = 'failed'
          nextState.approval = null
          if (typeof event.payload?.message === 'string' && event.payload.message.trim()) {
            nextState.logs = [...state.logs, event.payload.message]
          }
          return nextState
        }

        return nextState
      })
    },
    reset: () => set(initialState),
  }))

export const useAgentStore = createAgentStore()
