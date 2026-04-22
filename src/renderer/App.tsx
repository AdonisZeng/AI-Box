import { Suspense, useEffect, useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconBar } from '@/components/layout/IconBar'
import { useModuleStore, useSettingsStore } from '@/lib/store'
import { applyThemeToDocument } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { getEnabledModules, getModuleById } from '@/modules'

function useLocalStorageSync(_storeKey: string) {
  const [storageVersion, setStorageVersion] = useState(0)

  useEffect(() => {
    const handleStorageChange = () => {
      setStorageVersion((v) => v + 1)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return storageVersion
}

function useRefreshModuleStore() {
  const { setModuleEnabled } = useModuleStore()
  const moduleStates = useModuleStore((state) => state.moduleStates)
  const storageVersion = useLocalStorageSync('ai-box-modules')

  const refreshModuleStates = useMemo(() => {
    return (_currentVersion: number) => {
      try {
        const stored = localStorage.getItem('ai-box-modules')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.state?.moduleStates) {
            Object.entries(parsed.state.moduleStates).forEach(([key, value]) => {
              setModuleEnabled(key, value as boolean)
            })
          }
        }
      } catch (error) {
        console.error('Failed to refresh module states:', error)
      }
    }
  }, [setModuleEnabled])

  useEffect(() => {
    if (storageVersion > 0) {
      refreshModuleStates(storageVersion)
    }
  }, [storageVersion, refreshModuleStates])

  return moduleStates
}

function App() {
  const { theme, setTheme } = useSettingsStore()
  const moduleStates = useRefreshModuleStore()
  const enabledModules = useMemo(
    () => getEnabledModules(moduleStates),
    [moduleStates]
  )
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

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
    <div className="h-screen bg-background text-foreground transition-colors duration-200">
      <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#0F172A] dark:text-slate-50">
        <IconBar
          modules={enabledModules}
          activeModuleId={activeModuleId}
          onModuleChange={setActiveModuleId}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 bg-white/85 backdrop-blur-sm transition-colors duration-200 dark:border-[#1E293B] dark:bg-[#0F172A]/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22C55E] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                AI Box
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                'relative w-10 h-10 rounded-xl',
                'flex items-center justify-center',
                'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100',
                'dark:bg-[#1E293B] dark:hover:bg-[#334155]',
                'dark:border-[#334155] dark:hover:border-[#475569]',
                'transition-all duration-200 ease-out',
                'hover:scale-105 active:scale-95',
                'group'
              )}
              aria-label="切换主题"
            >
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-slate-500 transition-colors duration-200 group-hover:text-slate-900 dark:text-[#94a3b8] dark:group-hover:text-[#F8FAFC]" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500 transition-colors duration-200 group-hover:text-amber-600" />
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
