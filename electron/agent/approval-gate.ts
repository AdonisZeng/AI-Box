import type { AgentApprovalRequest, AgentExecutionMode } from '../../src/types/agent.ts'

type ActionDescriptor =
  | { type: 'call_tool'; toolName: string }
  | { type: 'use_skill'; skillId: string }
  | { type: 'run_script'; command: string }
  | { type: 'respond' }

export interface ApprovalDecision {
  requiresApproval: boolean
  request: AgentApprovalRequest | null
}

export class ApprovalGate {
  evaluate(mode: AgentExecutionMode, action: ActionDescriptor): ApprovalDecision {
    if (mode === 'auto') {
      return { requiresApproval: false, request: null }
    }

    if (action.type === 'call_tool') {
      return {
        requiresApproval: true,
        request: {
          actionId: crypto.randomUUID(),
          title: `Call ${action.toolName}`,
          details: `The Agent wants to call MCP tool ${action.toolName}.`,
        },
      }
    }

    if (action.type === 'run_script') {
      return {
        requiresApproval: true,
        request: {
          actionId: crypto.randomUUID(),
          title: `Run ${action.command}`,
          details: `The Agent wants to execute ${action.command}.`,
        },
      }
    }

    if (action.type === 'use_skill') {
      return {
        requiresApproval: true,
        request: {
          actionId: crypto.randomUUID(),
          title: `Run Skill ${action.skillId}`,
          details: `The Agent wants to execute local Skill ${action.skillId}.`,
        },
      }
    }

    return { requiresApproval: false, request: null }
  }
}
