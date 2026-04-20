import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconBar, ModuleType } from '@/components/layout/IconBar'
import { SettingsPanel, ProviderType } from '@/components/layout/SettingsPanel'
import { ChatWorkspace } from '@/components/chat/ChatWorkspace'
import { AgentWorkspace } from '@/components/workspace/AgentWorkspace'
import { VideoWorkspace } from '@/components/workspace/VideoWorkspace'
import { AudioWorkspace } from '@/components/workspace/AudioWorkspace'
import { MCPWorkspace } from '@/components/mcp/MCPWorkspace'
import { useSettingsStore } from '@/lib/store'

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
        return <AgentWorkspace />
      default:
        return <ChatWorkspace />
    }
  }

  return (
    <div className={theme}>
      <div className="h-screen flex bg-[#1e1e1e] text-foreground overflow-hidden">
        {/* Icon Bar */}
        <IconBar activeModule={activeModule} onModuleChange={setActiveModule} />

        {/* Settings Panel */}
        <SettingsPanel
          collapsed={settingsCollapsed}
          onToggle={() => setSettingsCollapsed(!settingsCollapsed)}
          activeProvider={activeProvider}
          onProviderChange={setActiveProvider}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <div className="h-12 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center justify-between px-4">
            <div className="text-[#ccc] text-sm font-medium">LanShan</div>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#333] hover:bg-[#444] text-[#aaa] transition-colors"
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          {/* Workspace */}
          <div className="flex-1 overflow-hidden">{renderWorkspace()}</div>
        </div>
      </div>
    </div>
  )
}

export default App
