import { useState } from 'react'
import { Check, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/lib/store'
import { ProviderSettingsModal } from '@/components/settings/ProviderSettingsModal'
import type { ProviderType } from '@/types/providers'

export function ProviderSettingsSection() {
  const { providers, activeProvider, setActiveProvider } = useSettingsStore()
  const [settingsProviderId, setSettingsProviderId] = useState<ProviderType | null>(null)

  const handleContextMenu = (e: React.MouseEvent, providerId: ProviderType) => {
    e.preventDefault()
    setSettingsProviderId(providerId)
  }

  return (
    <>
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

      {settingsProviderId && (
        <ProviderSettingsModal
          providerId={settingsProviderId}
          onClose={() => setSettingsProviderId(null)}
        />
      )}
    </>
  )
}
