import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { rendererLogger } from '@/lib/logger'
import { Check, Settings, X } from 'lucide-react'
import { useSettingsStore } from '@/lib/store'
import { ProviderSettingsModal } from '@/components/settings/ProviderSettingsModal'
import type { ProviderType } from '@/types/providers'

const tabClass = (isActive: boolean) =>
  cn(
    'flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200',
    isActive
      ? ['bg-[#4a9eff] text-white', 'shadow-md shadow-[#4a9eff]/20']
      : ['text-[#64748b] hover:text-[#94a3b8]', 'hover:bg-[#334155]/50']
  )

export function SettingsWindow() {
  const { providers, activeProvider, setActiveProvider } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<'provider' | 'mcp'>('provider')
  const [settingsProviderId, setSettingsProviderId] = useState<ProviderType | null>(null)

  useEffect(() => {
    rendererLogger.info('SettingsWindow 组件挂载')
  }, [])

  const handleContextMenu = (e: React.MouseEvent, providerId: ProviderType) => {
    e.preventDefault()
    setSettingsProviderId(providerId)
  }

  const handleClose = () => {
    rendererLogger.info('设置窗口关闭按钮被点击')
    window.close()
  }

  return (
    <div className="h-screen flex flex-col bg-[#0F172A] text-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B] bg-[#0F172A]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22C55E] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
            <span className="text-white font-bold text-sm">LS</span>
          </div>
          <span className="font-semibold text-[#F8FAFC] tracking-tight">设置</span>
        </div>
        <button
          onClick={handleClose}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'bg-[#1E293B] hover:bg-[#334155]',
            'border border-[#334155] hover:border-[#475569]',
            'transition-all duration-200 ease-out',
            'hover:scale-105 active:scale-95',
            'text-[#94a3b8] hover:text-[#F8FAFC]'
          )}
          aria-label="关闭设置窗口"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs - Pill style */}
      <div className="p-3 border-b border-[#1E293B] bg-[#0F172A]">
        <div className="flex gap-1 p-1 bg-[#1E293B] rounded-xl">
          <button
            onClick={() => setActiveTab('provider')}
            className={tabClass(activeTab === 'provider')}
          >
            提供商
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={tabClass(activeTab === 'mcp')}
          >
            MCP
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0F172A]">
        {activeTab === 'provider' && (
          <div className="space-y-3">
            <div className="text-[#64748b] text-xs mb-3 uppercase tracking-wider font-medium">
              LLM 提供商
            </div>
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="group relative"
                onContextMenu={(e) => handleContextMenu(e, provider.id)}
              >
                <button
                  onClick={() => setActiveProvider(provider.id)}
                  onDoubleClick={() => setSettingsProviderId(provider.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all duration-200 ease-out cursor-pointer',
                    activeProvider === provider.id
                      ? [
                          'bg-[#1E293B] border-[#4a9eff]/50 text-[#4a9eff]',
                          'shadow-md shadow-[#4a9eff]/5',
                        ]
                      : [
                          'bg-[#1E293B]/50 border-[#334155]',
                          'text-[#E2E8F0]',
                          'hover:border-[#4a9eff]/50',
                          'hover:bg-[#1E293B]',
                          'hover:shadow-md hover:shadow-[#4a9eff]/5',
                          'hover:translate-y-[-1px]',
                        ]
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{provider.name}</span>
                      <span className="text-[#64748b] text-xs">{provider.model || '未配置模型'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeProvider === provider.id && (
                        <div className="w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center shadow-sm shadow-[#22C55E]/30">
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                      <Settings
                        size={14}
                        className={cn(
                          'transition-opacity duration-200',
                          activeProvider === provider.id
                            ? 'text-[#4a9eff] opacity-100'
                            : 'text-[#64748b] opacity-0 group-hover:opacity-100 hover:!opacity-100'
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSettingsProviderId(provider.id)
                        }}
                      />
                    </div>
                  </div>
                </button>
              </div>
            ))}
            <p className="text-[#475569] text-[10px] mt-4 text-center">
              双击或右键点击可打开详细设置
            </p>
          </div>
        )}

        {activeTab === 'mcp' && (
          <div className="space-y-3">
            <div className="text-[#64748b] text-xs mb-3 uppercase tracking-wider font-medium">
              MCP 服务器
            </div>
            <div className="text-[#64748b] text-sm text-center py-12 bg-[#1E293B]/30 rounded-xl border border-[#1E293B]">
              暂无已连接的 MCP 服务器
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {settingsProviderId && (
        <ProviderSettingsModal
          providerId={settingsProviderId}
          onClose={() => setSettingsProviderId(null)}
        />
      )}
    </div>
  )
}
