import { cn } from '@/lib/utils'
import { MessageSquare, Briefcase, Video, Music, Bot, Settings } from 'lucide-react'

export type ModuleType = 'chat' | 'agent' | 'video' | 'audio' | 'mcp' | 'settings'

interface IconBarProps {
  activeModule: ModuleType
  onModuleChange: (module: ModuleType) => void
}

const modules: { id: ModuleType; icon: React.ReactNode; label: string }[] = [
  { id: 'chat', icon: <MessageSquare size={18} />, label: '聊天' },
  { id: 'agent', icon: <Briefcase size={18} />, label: 'Agent' },
  { id: 'video', icon: <Video size={18} />, label: '视频' },
  { id: 'audio', icon: <Music size={18} />, label: '音频' },
  { id: 'mcp', icon: <Bot size={18} />, label: 'MCP' },
]

export function IconBar({ activeModule, onModuleChange }: IconBarProps) {
  return (
    <div className="w-14 bg-[#1e1e1e] flex flex-col items-center py-3 gap-1">
      {/* Logo */}
      <div className="w-9 h-9 bg-[#4a9eff] rounded-lg flex items-center justify-center text-white font-bold mb-3">
        AI
      </div>

      <div className="w-9 h-px bg-[#444]" />

      {/* Module Icons */}
      <div className="flex flex-col gap-1 mt-3">
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => onModuleChange(module.id)}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              activeModule === module.id
                ? 'bg-[#4a9eff] text-white'
                : 'bg-[#333] text-[#aaa] hover:bg-[#444]'
            )}
            title={module.label}
          >
            {module.icon}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <button
        onClick={() => onModuleChange('settings')}
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          activeModule === 'settings'
            ? 'bg-[#4a9eff] text-white'
            : 'bg-[#333] text-[#aaa] hover:bg-[#444]'
        )}
        title="设置"
      >
        <Settings size={18} />
      </button>
    </div>
  )
}
