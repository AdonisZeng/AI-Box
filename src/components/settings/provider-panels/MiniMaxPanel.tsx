import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ProviderConfig, ProviderCategory } from '@/lib/providers'

interface MiniMaxPanelProps {
  config: ProviderConfig
  category?: ProviderCategory
  onSave: (updates: Partial<ProviderConfig>) => void
  onClose: () => void
}

const modelOptions: Record<ProviderCategory, string[]> = {
  text: [
    'MiniMax-M2.7',
    'MiniMax-M2.7-highspeed',
    'MiniMax-M2.5',
    'MiniMax-M2.5-highspeed',
    'MiniMax-M2.1',
    'MiniMax-M2.1-highspeed',
    'MiniMax-M2',
  ],
  image: ['image-01', 'image-01-live'],
  video: [
    'MiniMax-Hailuo-2.3',
    'MiniMax-Hailuo-2.3-Fast',
    'MiniMax-Hailuo-02',
    'T2V-01-Director',
    'T2V-01',
    'I2V-01-Director',
    'I2V-01-live',
    'I2V-01',
  ],
  voice: [
    'speech-2.8-hd',
    'speech-2.8-turbo',
    'speech-2.6-hd',
    'speech-2.6-turbo',
    'speech-02-hd',
    'speech-02-turbo',
    'speech-01-hd',
    'speech-01-turbo',
  ],
  music: ['music-2.6', 'music-cover', 'music-2.6-free', 'music-cover-free'],
}

const categoryLabels: Record<ProviderCategory, string> = {
  text: '文本生成模型',
  image: '图片生成模型',
  video: '视频生成模型',
  voice: '语音合成模型',
  music: '音乐生成模型',
}

export function MiniMaxPanel({ config, category = 'text', onSave, onClose }: MiniMaxPanelProps) {
  const [baseURL, setBaseURL] = useState(config.baseURL)
  const [apiKey, setApiKey] = useState(config.apiKey)

  const currentModel =
    category === 'text'
      ? config.model
      : config.categoryModels?.[category] ?? modelOptions[category][0]
  const [model, setModel] = useState(currentModel)

  const handleSave = () => {
    if (category === 'text') {
      onSave({
        baseURL,
        apiKey,
        model,
        categoryModels: {
          ...config.categoryModels,
          text: model,
        },
      })
    } else {
      onSave({
        baseURL,
        apiKey,
        categoryModels: {
          ...config.categoryModels,
          [category]: model,
        },
      })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[#858585] text-xs mb-2">API 基地址</label>
        <input
          type="text"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.minimaxi.com/anthropic"
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
        />
        <p className="text-[#666] text-xs mt-1">默认: https://api.minimaxi.com/anthropic</p>
      </div>

      <div>
        <label className="block text-[#858585] text-xs mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="MiniMax API Key..."
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
        />
      </div>

      <div>
        <label className="block text-[#858585] text-xs mb-2">{categoryLabels[category]}</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
        >
          {modelOptions[category].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
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
