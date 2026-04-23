import type { MCPServer } from './mcp'
import type { ProviderConfig } from './providers'

export type AgentExecutionMode = 'auto' | 'confirm-external'
export type AgentTaskStatus =
  | 'running'
  | 'awaiting-approval'
  | 'completed'
  | 'failed'
  | 'rejected'
export type AgentActionStatus = 'success' | 'error'
export type AgentObservationType = 'tool_result' | 'skill_result' | 'script_result'

export interface AgentApprovalRequest {
  actionId: string
  title: string
  details: string
}

export type AgentPendingAction =
  | {
      type: 'call_tool'
      toolName: string
      arguments: Record<string, unknown>
      summary: string
    }
  | {
      type: 'use_skill'
      skillId: string
      summary: string
    }
  | {
      type: 'run_script'
      runner: 'node' | 'python' | 'shell'
      command: string
      cwd: string
      summary: string
    }

export interface AgentObservation {
  type: AgentObservationType
  actionId: string
  name: string
  status: AgentActionStatus
  summary: string
  data: Record<string, unknown>
  rawExcerpt: string
  artifacts: string[]
}

export interface AgentTaskEvent {
  type:
    | 'task.created'
    | 'plan.generated'
    | 'step.started'
    | 'skill.selected'
    | 'tool.call.started'
    | 'tool.call.finished'
    | 'script.started'
    | 'script.output'
    | 'script.finished'
    | 'approval.required'
    | 'step.completed'
    | 'task.completed'
    | 'task.failed'
  taskId: string
  timestamp: number
  payload?: Record<string, unknown>
}

export interface AgentStartTaskRequest {
  prompt: string
  mode: AgentExecutionMode
  provider: ProviderConfig
  mcpServers: MCPServer[]
}

export interface AgentTaskSession {
  id: string
  prompt: string
  mode: AgentExecutionMode
  provider: ProviderConfig
  mcpServers: MCPServer[]
  status: AgentTaskStatus
  events: AgentTaskEvent[]
  observations: AgentObservation[]
  approval: {
    state: 'idle' | 'pending' | 'resolved'
    request: AgentApprovalRequest | null
  }
  pendingAction: AgentPendingAction | null
}
