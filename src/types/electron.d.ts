import type { AgentStartTaskRequest, AgentTaskEvent, AgentTaskSession } from './agent'

export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  openSettingsWindow: () => Promise<void>
  log: (level: string, message: string, ...args: unknown[]) => Promise<void>
  crypto: {
    encrypt: (plaintext: string) => Promise<string | null>
    decrypt: (encryptedBase64: string) => Promise<string | null>
    isAvailable: () => Promise<boolean>
  }
  agent: {
    startTask: (request: AgentStartTaskRequest) => Promise<AgentTaskSession>
    getTaskState: (taskId: string) => Promise<AgentTaskSession | null>
    approveAction: (taskId: string, actionId: string) => Promise<AgentTaskSession | null>
    rejectAction: (taskId: string, actionId: string) => Promise<AgentTaskSession | null>
    cancelTask: (taskId: string) => Promise<AgentTaskSession | null>
    onTaskEvent: (listener: (event: AgentTaskEvent) => void) => () => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
