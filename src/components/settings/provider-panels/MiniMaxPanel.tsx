import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ProviderConfig, MiniMaxSubModelConfig } from '@/lib/providers'

interface MiniMaxPanelProps {
  config: ProviderConfig
  onSave: (updates: Partial<ProviderConfig>) => void
  onClose: () => void
}

const textModels = [
  'MiniMax-M2.7',
  'MiniMax-M2.7-highspeed',
  'MiniMax-M2.5',
  'MiniMax-M2.5-highspeed',
  'MiniMax-M2.1',
  'MiniMax-M2.1-highspeed',
  'MiniMax-M2',
]

const imageModels = ['image-01', 'image-01-live']

const videoModels = [
  'MiniMax-Hailuo-2.3',
  'MiniMax-Hailuo-02',
  'T2V-01-Director',
  'T2V-01',
]

const speechModels = [
  'speech-2.8-hd',
  'speech-2.8-turbo',
  'speech-2.6-hd',
  'speech-2.6-turbo',
  'speech-02-hd',
  'speech-02-turbo',
  'speech-01-hd',
  'speech-01-turbo',
]

const musicModels = ['music-2.6', 'music-cover', 'music-2.6-free', 'music-cover-free']

export function MiniMaxPanel({ config, onSave, onClose }: MiniMaxPanelProps) {
  const [baseURL, setBaseURL] = useState(config.baseURL)
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [model, setModel] = useState(config.model)
  const [miniMaxConfig, setMiniMaxConfig] = useState<MiniMaxSubModelConfig>({
    text: 'MiniMax-M2.7',
    image: 'image-01',
    video: 'MiniMax-Hailuo-2.3',
    speech: 'speech-2.8-hd',
    music: 'music-2.6',
    ...config.miniMaxConfig,
  })

  const handleSave = () => {
    onSave({ baseURL, apiKey, model, miniMaxConfig })
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
        <label className="block text-[#858585] text-xs mb-2">文本生成模型</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
        >
          {textModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2 border-t border-[#3c3c3c] space-y-4">
        <div className="text-[#858585] text-xs font-medium">多模态模型配置</div>

        <div>
          <label className="block text-[#858585] text-xs mb-2">图片生成模型</label>
          <select
            value={miniMaxConfig.image}
            onChange={(e) =>
              setMiniMaxConfig((prev) => ({ ...prev, image: e.target.value }))
            }
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
          >
            {imageModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[#858585] text-xs mb-2">视频生成模型</label>
          <select
            value={miniMaxConfig.video}
            onChange={(e) =>
              setMiniMaxConfig((prev) => ({ ...prev, video: e.target.value }))
            }
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
          >
            {videoModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[#858585] text-xs mb-2">语音合成模型</label>
          <select
            value={miniMaxConfig.speech}
            onChange={(e) =>
              setMiniMaxConfig((prev) => ({ ...prev, speech: e.target.value }))
            }
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
          >
            {speechModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[#858585] text-xs mb-2">音乐生成模型</label>
          <select
            value={miniMaxConfig.music}
            onChange={(e) =>
              setMiniMaxConfig((prev) => ({ ...prev, music: e.target.value }))
            }
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
          >
            {musicModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
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
