import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { useSettingsStore } from '@/lib/store'
import { ProviderSettingsModal } from '@/components/settings/ProviderSettingsModal'
import type { ProviderType } from '@/types/providers'

interface SettingsPanelProps {
  collapsed: boolean
  onToggle: () => void
  activeProvider: ProviderType
  onProviderChange: (provider: ProviderType) => void
}

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
        className="w-6 bg-[#252526] flex items-center justify-center hover:bg-[#333] transition-colors"
      >
        <ChevronRight size={14} className="text-[#666]" />
      </button>
    )
  }

  const handleContextMenu = (e: React.MouseEvent, providerId: ProviderType) => {
    e.preventDefault()
    setSettingsProviderId(providerId)
  }

  return (
    <div className="w-[200px] bg-[#252526] flex flex-col border-r border-[#3c3c3c]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
        <span className="text-[#ccc] text-sm font-medium">设置</span>
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#333] transition-colors"
        >
          <ChevronLeft size={14} className="text-[#666]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#3c3c3c]">
        <button
          onClick={() => setActiveTab('provider')}
          className={cn(
            'flex-1 py-2 text-xs transition-colors',
            activeTab === 'provider'
              ? 'text-[#ccc] border-b-2 border-[#4a9eff]'
              : 'text-[#666] hover:text-[#aaa]'
          )}
        >
          提供商
        </button>
        <button
          onClick={() => setActiveTab('mcp')}
          className={cn(
            'flex-1 py-2 text-xs transition-colors',
            activeTab === 'mcp'
              ? 'text-[#ccc] border-b-2 border-[#4a9eff]'
              : 'text-[#666] hover:text-[#aaa]'
          )}
        >
          MCP
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'provider' && (
          <div className="space-y-2">
            <div className="text-[#858585] text-[11px] mb-2">LLM 提供商</div>
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
                    'w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between',
                    activeProvider === provider.id
                      ? 'bg-[#2d2d2d] text-[#4a9eff]'
                      : 'bg-[#2d2d2d] text-[#ccc] hover:bg-[#333]'
                  )}
                >
                  <span>{provider.name}</span>
                  <Settings
                    size={12}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSettingsProviderId(provider.id)
                    }}
                  />
                </button>
              </div>
            ))}
            <p className="text-[#555] text-[10px] mt-3 text-center">
              双击或右键点击可打开设置
            </p>
          </div>
        )}

        {activeTab === 'mcp' && (
          <div className="space-y-2">
            <div className="text-[#858585] text-[11px] mb-2">MCP 服务器</div>
            <div className="text-[#666] text-xs text-center py-8">
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
