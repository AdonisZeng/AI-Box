import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ProviderConfig } from '@/lib/providers'

interface OpenAIPanelProps {
  config: ProviderConfig
  onSave: (updates: Partial<ProviderConfig>) => void
  onClose: () => void
}

export function OpenAIPanel({ config, onSave, onClose }: OpenAIPanelProps) {
  const [baseURL, setBaseURL] = useState(config.baseURL)
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [model, setModel] = useState(config.model)

  const handleSave = () => {
    onSave({ baseURL, apiKey, model })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[#858585] text-xs mb-2">基地址</label>
        <input
          type="text"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
        />
      </div>

      <div>
        <label className="block text-[#858585] text-xs mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
        />
      </div>

      <div>
        <label className="block text-[#858585] text-xs mb-2">使用模型</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4o, gpt-4o-mini, gpt-4-turbo..."
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#3c3c3c]">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-[#ccc]">
          取消
        </Button>
        <Button size="sm" onClick={handleSave} className="bg-[#4a9eff] hover:bg-[#3d8bdb]">
          保存
        </Button>
      </div>
    </div>
  )
}
