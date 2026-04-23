import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { rendererLogger } from '@/lib/logger'
import { applyThemeToDocument } from '@/lib/theme'
import { useSettingsStore } from '@/lib/store'
import { X } from 'lucide-react'
import { ModuleSettingsSection } from '@/components/settings/ModuleSettingsSection'
import { ProviderSettingsSection } from '@/components/settings/ProviderSettingsSection'
import { MCPServersSection } from '@/components/settings/MCPServersSection'

const tabClass = (isActive: boolean) =>
  cn(
    'flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200',
    isActive
      ? ['bg-[#4a9eff] text-white', 'shadow-md shadow-[#4a9eff]/20']
      : ['text-[#64748b] hover:text-[#94a3b8]', 'hover:bg-[#334155]/50']
  )

const settingsTabs = [
  { id: 'provider', label: '提供商', Component: ProviderSettingsSection },
  { id: 'mcp', label: 'MCP', Component: MCPServersSection },
  { id: 'modules', label: '模块', Component: ModuleSettingsSection },
] as const

type SettingsTabId = (typeof settingsTabs)[number]['id']

export function SettingsWindow() {
  const { theme } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<SettingsTabId>('provider')

  useEffect(() => {
    rendererLogger.info('SettingsWindow 组件挂载')
  }, [])

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const handleClose = () => {
    rendererLogger.info('设置窗口关闭按钮被点击')
    window.close()
  }

  const activeTabConfig =
    settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0]
  const ActiveSection = activeTabConfig.Component

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#0F172A] dark:text-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white transition-colors duration-200 dark:border-[#1E293B] dark:bg-[#0F172A]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22C55E] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">设置</span>
        </div>
        <button
          onClick={handleClose}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100',
            'dark:bg-[#1E293B] dark:hover:bg-[#334155]',
            'dark:border-[#334155] dark:hover:border-[#475569]',
            'transition-all duration-200 ease-out',
            'hover:scale-105 active:scale-95',
            'text-slate-500 hover:text-slate-900 dark:text-[#94a3b8] dark:hover:text-[#F8FAFC]'
          )}
          aria-label="关闭设置窗口"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs - Pill style */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 transition-colors duration-200 dark:border-[#1E293B] dark:bg-[#0F172A]">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-200 dark:bg-[#1E293B]">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={tabClass(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 transition-colors duration-200 dark:bg-[#0F172A]">
        <ActiveSection />
      </div>
    </div>
  )
}
