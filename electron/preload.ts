import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),
  log: (level: string, message: string, ...args: unknown[]) =>
    ipcRenderer.invoke('log-message', level, message, ...args),
})
