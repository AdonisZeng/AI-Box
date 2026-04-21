import { cn } from '@/lib/utils'
import { rendererLogger } from '@/lib/logger'
import { Settings, Sparkles } from 'lucide-react'
import type { AppModuleDefinition } from '@/modules'

interface IconBarProps {
  modules: AppModuleDefinition[]
  activeModuleId: string | null
  onModuleChange: (moduleId: string) => void
}

const iconButtonClass = (isActive: boolean) =>
  cn(
    'relative w-11 h-11 rounded-xl flex items-center justify-center',
    'transition-all duration-200 ease-out cursor-pointer',
    isActive
      ? [
          'bg-gradient-to-br from-[#4a9eff] to-[#3b82f6]',
          'text-white',
          'shadow-lg shadow-[#4a9eff]/30',
          'scale-105',
        ]
      : [
          'bg-transparent text-[#64748b]',
          'hover:text-[#94a3b8]',
          'hover:bg-[#1E293B]',
          'hover:scale-105',
        ]
  )

export function IconBar({ modules, activeModuleId, onModuleChange }: IconBarProps) {
  const handleOpenSettings = () => {
    rendererLogger.info('设置按钮被点击')
    rendererLogger.info('electronAPI 存在:', !!window.electronAPI)
    rendererLogger.info('openSettingsWindow 存在:', !!window.electronAPI?.openSettingsWindow)
    window.electronAPI?.openSettingsWindow()
  }

  const renderModuleButton = (module: AppModuleDefinition) => {
    const Icon = module.icon
    const isActive = activeModuleId === module.id

    return (
      <button
        key={module.id}
        onClick={() => onModuleChange(module.id)}
        className={iconButtonClass(isActive)}
        title={module.label}
        aria-label={module.label}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Left indicator for active state */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#22C55E] rounded-r-full shadow-md shadow-[#22C55E]/50" />
        )}
        <Icon size={20} />
      </button>
    )
  }

  return (
    <div className="w-16 h-full flex flex-col items-center py-4 gap-2 bg-[#0F172A]/50">
      {/* Logo */}
      <div className="mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="w-8 h-px bg-[#1E293B]" />

      {/* Module Icons */}
      <div className="flex flex-col gap-2 mt-3">{modules.map(renderModuleButton)}</div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <div className="pt-4 border-t border-[#1E293B]/50">
        <button
          onClick={handleOpenSettings}
          className={iconButtonClass(false)}
          title="设置"
          aria-label="设置"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
