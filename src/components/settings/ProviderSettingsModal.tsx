import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/lib/store'
import { LMStudioProvider, type LMStudioModel } from '@/lib/providers/lmstudio'
import type { ProviderType, APICompatibility } from '@/types/providers'
import { cn } from '@/lib/utils'

interface ProviderSettingsModalProps {
  providerId: ProviderType
  onClose: () => void
}

const apiTypeLabels: Record<APICompatibility, string> = {
  openai: 'OpenAI 兼容',
  anthropic: 'Anthropic 兼容',
  custom: '自定义',
}

export function ProviderSettingsModal({ providerId, onClose }: ProviderSettingsModalProps) {
  const { providers, updateProvider } = useSettingsStore()
  const provider = providers.find((p) => p.id === providerId)

  const [baseURL, setBaseURL] = useState(provider?.baseURL || '')
  const [apiKey, setApiKey] = useState(provider?.apiKey || '')
  const [model, setModel] = useState(provider?.model || '')
  const [apiType, setApiType] = useState<APICompatibility>(provider?.apiType || 'openai')
  const [models, setModels] = useState<LMStudioModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => {
    if (provider) {
      setBaseURL(provider.baseURL)
      setApiKey(provider.apiKey)
      setModel(provider.model)
      setApiType(provider.apiType)
    }
  }, [provider])

  // Fetch models for LMStudio
  useEffect(() => {
    if (providerId === 'lmstudio' && baseURL) {
      setLoadingModels(true)
      LMStudioProvider.fetchModels(baseURL)
        .then(( fetchedModels) => {
          setModels(fetchedModels)
          if (fetchedModels.length > 0 && !model) {
            setModel(fetchedModels[0].id)
          }
        })
        .finally(() => setLoadingModels(false))
    }
  }, [providerId, baseURL])

  const handleSave = () => {
    updateProvider(providerId, {
      baseURL,
      apiKey,
      model,
      apiType,
    })
    onClose()
  }

  if (!provider) return null

  const isLMStudio = providerId === 'lmstudio'
  const isCustom = providerId === 'custom'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg w-[480px] border border-[#3c3c3c]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
          <span className="text-[#ccc] font-medium">{provider.name} 设置</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#333] text-[#666] hover:text-[#aaa]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Base URL */}
          <div>
            <label className="block text-[#858585] text-xs mb-2">
              {isLMStudio ? '服务器地址' : '基地址'}
            </label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder={isLMStudio ? 'http://127.0.0.1:1234/v1' : 'https://api.example.com/v1'}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
            />
            {isLMStudio && (
              <p className="text-[#666] text-xs mt-1">默认: http://127.0.0.1:1234/v1</p>
            )}
          </div>

          {/* API Type (for custom provider) */}
          {isCustom && (
            <div>
              <label className="block text-[#858585] text-xs mb-2">API 兼容类型</label>
              <div className="flex gap-2">
                {(['openai', 'anthropic', 'custom'] as APICompatibility[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setApiType(type)}
                    className={cn(
                      'px-3 py-1.5 rounded text-xs transition-colors',
                      apiType === type
                        ? 'bg-[#4a9eff] text-white'
                        : 'bg-[#333] text-[#aaa] hover:bg-[#444]'
                    )}
                  >
                    {apiTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Key (not for LMStudio) */}
          {!isLMStudio && (
            <div>
              <label className="block text-[#858585] text-xs mb-2">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={providerId === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="block text-[#858585] text-xs mb-2">
              {isLMStudio ? '选择模型' : '使用模型'}
            </label>

            {isLMStudio ? (
              loadingModels ? (
                <div className="flex items-center gap-2 text-[#666] text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  正在获取模型列表...
                </div>
              ) : models.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
                  >
                    <option value="">选择模型...</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[#666] text-xs">
                    已发现 {models.length} 个模型
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="输入模型名称"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
                  />
                  <p className="text-[#666] text-xs">
                    无法获取模型列表，请确保 LMStudio 已启动并加载模型
                  </p>
                </div>
              )
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  providerId === 'openai'
                    ? 'gpt-4o, gpt-4o-mini, gpt-4-turbo...'
                    : providerId === 'anthropic'
                    ? 'claude-3-5-sonnet-20241022...'
                    : 'model-name'
                }
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3c3c3c]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[#ccc]"
          >
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-[#4a9eff] hover:bg-[#3d8bdb]"
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}
