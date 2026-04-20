import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Settings, Check, PanelLeftClose } from 'lucide-react'
import { useSettingsStore } from '@/lib/store'
import { ProviderSettingsModal } from '@/components/settings/ProviderSettingsModal'
import type { ProviderType } from '@/types/providers'

interface SettingsPanelProps {
  collapsed: boolean
  onToggle: () => void
  activeProvider: ProviderType
  onProviderChange: (provider: ProviderType) => void
}

const tabClass = (isActive: boolean) =>
  cn(
    'flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200',
    isActive
      ? ['bg-[#4a9eff] text-white', 'shadow-md shadow-[#4a9eff]/20']
      : ['text-[#64748b] hover:text-[#94a3b8]', 'hover:bg-[#334155]/50']
  )

export function SettingsPanel({
  collapsed,
  onToggle,
  activeProvider,
  onProviderChange,
}: SettingsPanelProps) {
  const { providers } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<'provider' | 'mcp'>('provider')
  const [settingsProviderId, setSettingsProviderId] = useState<ProviderType | null>(null)

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          'w-8 h-8 rounded-lg',
          'flex items-center justify-center',
          'bg-[#1E293B] hover:bg-[#334155]',
          'border border-[#334155] hover:border-[#475569]',
          'transition-all duration-200 ease-out',
          'hover:scale-105 active:scale-95'
        )}
        aria-label="展开设置面板"
      >
        <PanelLeftClose size={14} className="text-[#94a3b8] rotate-180" />
      </button>
    )
  }

  const handleContextMenu = (e: React.MouseEvent, providerId: ProviderType) => {
    e.preventDefault()
    setSettingsProviderId(providerId)
  }

  return (
    <div className="w-[200px] bg-[#1E293B]/50 flex flex-col border-r border-[#1E293B]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
        <span className="text-[#F8FAFC] text-sm font-medium">设置</span>
        <button
          onClick={onToggle}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'bg-[#1E293B] hover:bg-[#334155]',
            'border border-[#334155] hover:border-[#475569]',
            'transition-all duration-200 ease-out',
            'hover:scale-105 active:scale-95'
          )}
          aria-label="折叠设置面板"
        >
          <PanelLeftClose size={14} className="text-[#94a3b8]" />
        </button>
      </div>

      {/* Tabs - Pill style */}
      <div className="p-2 border-b border-[#1E293B]">
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
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'provider' && (
          <div className="space-y-2">
            <div className="text-[#64748b] text-[11px] mb-2">LLM 提供商</div>
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="group relative"
                onContextMenu={(e) => handleContextMenu(e, provider.id)}
              >
                <button
                  onClick={() => onProviderChange(provider.id)}
                  onDoubleClick={() => setSettingsProviderId(provider.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all duration-200 ease-out cursor-pointer',
                    activeProvider === provider.id
                      ? [
                          'bg-[#1E293B] border-[#4a9eff]/50 text-[#4a9eff]',
                          'shadow-md shadow-[#4a9eff]/5'
                        ]
                      : [
                          'bg-[#1E293B]/50 border-[#334155]',
                          'text-[#E2E8F0]',
                          'hover:border-[#4a9eff]/50',
                          'hover:bg-[#1E293B]',
                          'hover:shadow-md hover:shadow-[#4a9eff]/5',
                          'hover:translate-y-[-1px]'
                        ]
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{provider.name}</span>
                    <div className="flex items-center gap-2">
                      {activeProvider === provider.id && (
                        <div className="w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center shadow-sm shadow-[#22C55E]/30">
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                      <Settings
                        size={12}
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
            <p className="text-[#475569] text-[10px] mt-3 text-center">
              双击或右键点击可打开设置
            </p>
          </div>
        )}

        {activeTab === 'mcp' && (
          <div className="space-y-2">
            <div className="text-[#64748b] text-[11px] mb-2">MCP 服务器</div>
            <div className="text-[#64748b] text-xs text-center py-8">
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
