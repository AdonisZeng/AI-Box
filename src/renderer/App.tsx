import { Suspense, useEffect, useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconBar } from '@/components/layout/IconBar'
import { useModuleStore, useSettingsStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { getEnabledModules, getModuleById } from '@/modules'

function App() {
  const { theme, setTheme } = useSettingsStore()
  const { moduleStates } = useModuleStore()
  const enabledModules = useMemo(() => getEnabledModules(moduleStates), [moduleStates])
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    if (enabledModules.length === 0) {
      if (activeModuleId !== null) {
        setActiveModuleId(null)
      }
      return
    }

    const hasActiveModule = activeModuleId
      ? enabledModules.some((module) => module.id === activeModuleId)
      : false

    if (!hasActiveModule) {
      setActiveModuleId(enabledModules[0].id)
    }
  }, [activeModuleId, enabledModules])

  const activeModule = activeModuleId ? getModuleById(activeModuleId) : undefined
  const ActiveWorkspace = activeModule?.Workspace

  const renderWorkspace = () => {
    if (!ActiveWorkspace) {
      return (
        <div className="h-full flex items-center justify-center px-8">
          <div className="max-w-md text-center">
            <div className="text-[#F8FAFC] text-xl font-semibold mb-3">当前没有已启用模块</div>
            <p className="text-[#64748b] text-sm leading-relaxed">
              打开设置窗口，在“模块”页启用至少一个模块后，这里会自动装载对应工作区。
            </p>
          </div>
        </div>
      )
    }

    return (
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-[#64748b]">正在装载模块...</div>
          </div>
        }
      >
        <ActiveWorkspace />
      </Suspense>
    )
  }

  return (
    <div className={theme}>
      <div className="h-screen flex bg-[#0F172A] text-foreground overflow-hidden">
        <IconBar
          modules={enabledModules}
          activeModuleId={activeModuleId}
          onModuleChange={setActiveModuleId}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 bg-[#0F172A]/80 border-b border-[#1E293B] flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22C55E] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="font-semibold text-[#F8FAFC] tracking-tight">AI Box</span>
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
