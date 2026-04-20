import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconBar, ModuleType } from '@/components/layout/IconBar'
import { SettingsPanel } from '@/components/layout/SettingsPanel'
import { ChatWorkspace } from '@/components/chat/ChatWorkspace'
import { AgentWorkspace } from '@/components/workspace/AgentWorkspace'
import { VideoWorkspace } from '@/components/workspace/VideoWorkspace'
import { AudioWorkspace } from '@/components/workspace/AudioWorkspace'
import { MCPWorkspace } from '@/components/mcp/MCPWorkspace'
import { useSettingsStore } from '@/lib/store'
import { cn } from '@/lib/utils'

function App() {
  const { theme, setTheme, activeProvider, setActiveProvider } = useSettingsStore()
  const [activeModule, setActiveModule] = useState<ModuleType>('chat')
  const [settingsCollapsed, setSettingsCollapsed] = useState(false)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const renderWorkspace = () => {
    switch (activeModule) {
      case 'chat':
        return <ChatWorkspace />
      case 'agent':
        return <AgentWorkspace />
      case 'video':
        return <VideoWorkspace />
      case 'audio':
        return <AudioWorkspace />
      case 'mcp':
        return <MCPWorkspace />
      case 'settings':
        return <ChatWorkspace />
      default:
        return <ChatWorkspace />
    }
  }

  return (
    <div className={theme}>
      <div className="h-screen flex bg-[#0F172A] text-foreground overflow-hidden">
        <IconBar activeModule={activeModule} onModuleChange={setActiveModule} />

        <SettingsPanel
          collapsed={settingsCollapsed}
          onToggle={() => setSettingsCollapsed(!settingsCollapsed)}
          activeProvider={activeProvider}
          onProviderChange={setActiveProvider}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 bg-[#0F172A]/80 border-b border-[#1E293B] flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22C55E] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
                <span className="text-white font-bold text-sm">LS</span>
              </div>
              <span className="font-semibold text-[#F8FAFC] tracking-tight">LanShan</span>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                'relative w-10 h-10 rounded-xl',
                'flex items-center justify-center',
                'bg-[#1E293B] hover:bg-[#334155]',
                'border border-[#334155] hover:border-[#475569]',
                'transition-all duration-200 ease-out',
                'hover:scale-105 active:scale-95',
                'group'
              )}
              aria-label="切换主题"
            >
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-[#94a3b8] group-hover:text-[#F8FAFC] transition-colors duration-200" />
              ) : (
                <Sun className="w-5 h-5 text-[#64748b] group-hover:text-[#f97316] transition-colors duration-200" />
              )}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#22C55E]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">{renderWorkspace()}</div>
        </div>
      </div>
    </div>
  )
}

export default App
