export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  openSettingsWindow: () => Promise<void>
  log: (level: string, message: string, ...args: unknown[]) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
