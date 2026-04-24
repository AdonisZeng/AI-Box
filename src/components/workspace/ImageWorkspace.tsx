import { useState, useRef, useEffect } from 'react'
import {
  Image,
  Loader2,
  Trash2,
  Download,
  AlertCircle,
  Upload,
  X,
  ExternalLink,
  Wand2,
} from 'lucide-react'
import { useSettingsStore } from '@/lib/store'
import { useImageStore } from '@/lib/store/image'
import { getActiveImageProvider, getImageProviderConfig } from '@/lib/image/service'
import { fileToBase64 } from '@/lib/utils'
import type { ImageTask } from '@/lib/image/types'

type TabType = 't2i' | 'i2i'

const TABS: { key: TabType; label: string }[] = [
  { key: 't2i', label: '文生图' },
  { key: 'i2i', label: '图生图' },
]

const modelOptions = ['image-01', 'image-01-live']

const aspectRatioOptions = [
  { value: '1:1', label: '1:1 (1024x1024)' },
  { value: '16:9', label: '16:9 (1280x720)' },
  { value: '4:3', label: '4:3 (1152x864)' },
  { value: '3:2', label: '3:2 (1248x832)' },
  { value: '2:3', label: '2:3 (832x1248)' },
  { value: '3:4', label: '3:4 (864x1152)' },
  { value: '9:16', label: '9:16 (720x1280)' },
  { value: '21:9', label: '21:9 (1344x576)' },
]

const styleTypeOptions = ['漫画', '元气', '中世纪', '水彩']

const TAB_LABEL: Record<ImageTask['type'], string> = {
  t2i: '文生图',
  i2i: '图生图',
}

const STATUS_LABEL: Record<ImageTask['status'], string> = {
  Preparing: '准备中',
  Processing: '生成中',
  Success: '已完成',
  Fail: '失败',
}

const STATUS_COLOR: Record<ImageTask['status'], string> = {
  Preparing: 'text-yellow-400',
  Processing: 'text-blue-400',
  Success: 'text-green-400',
  Fail: 'text-red-400',
}

function useImageProvider() {
  const { activeProviders, providers } = useSettingsStore()
  const config = getImageProviderConfig({ activeProviders, providers })
  const provider = config ? getActiveImageProvider({ activeProviders, providers }) : null
  return { config, provider }
}

function TaskCard({ task }: { task: ImageTask }) {
  const removeTask = useImageStore((s) => s.removeTask)
  const images = task.imageUrls ?? task.imageBase64List ?? []

  return (
    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666]">{TAB_LABEL[task.type]}</span>
          <span className={`text-xs font-medium ${STATUS_COLOR[task.status]}`}>
            {STATUS_LABEL[task.status]}
          </span>
          {task.status !== 'Success' && task.status !== 'Fail' && (
            <Loader2 size={12} className="animate-spin text-[#4a9eff]" />
          )}
        </div>
        <button
          onClick={() => removeTask(task.taskId)}
          className="p-1 rounded hover:bg-[#333] text-[#666] hover:text-red-400 cursor-pointer"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {task.prompt && <p className="text-[#aaa] text-xs line-clamp-2">{task.prompt}</p>}

      {task.error && (
        <div className="flex items-center gap-1 text-red-400 text-xs">
          <AlertCircle size={12} />
          <span>{task.error}</span>
        </div>
      )}

      {images.length > 0 && task.status === 'Success' && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt={`生成结果 ${idx + 1}`}
                className="w-full rounded border border-[#3c3c3c] object-cover"
                style={{ aspectRatio: '1' }}
                onClick={() => window.open(url, '_blank')}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-white/20 rounded hover:bg-white/30 text-white"
                  title="在新标签页打开"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={14} />
                </a>
                <a
                  href={url}
                  download={`image-${task.taskId.slice(0, 8)}-${idx + 1}.png`}
                  className="p-1.5 bg-white/20 rounded hover:bg-white/30 text-white"
                  title="下载"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] text-[#555]">
        {new Date(task.createdAt).toLocaleString()}
      </div>
    </div>
  )
}

export function ImageWorkspace() {
  const [activeTab, setActiveTab] = useState<TabType>('t2i')
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('image-01')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [n, setN] = useState(1)
  const [seed, setSeed] = useState('')
  const [promptOptimizer, setPromptOptimizer] = useState(false)
  const [aigcWatermark, setAigcWatermark] = useState(false)
  const [styleType, setStyleType] = useState('')
  const [styleWeight, setStyleWeight] = useState(0.8)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [sourceImage, setSourceImage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { config, provider } = useImageProvider()
  const tasks = useImageStore((s) => s.tasks)
  const addTask = useImageStore((s) => s.addTask)
  const clearCompleted = useImageStore((s) => s.clearCompleted)

  // Sync model when config changes
  useEffect(() => {
    if (config?.categoryModels?.image) {
      setModel(config.categoryModels.image)
    }
  }, [config?.categoryModels?.image])

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小超过 10MB 限制')
      return
    }
    try {
      const dataUrl = await fileToBase64(file, false)
      setSourceImage(dataUrl)
      setError('')
    } catch {
      setError('图片读取失败')
    }
  }

  const handleGenerate = async () => {
    if (!provider || !config) {
      setError('未配置图片生成供应商，请先在设置中启用并配置 MiniMax')
      return
    }
    if (!prompt.trim()) {
      setError('请输入图片描述')
      return
    }
    if (activeTab === 'i2i' && !sourceImage) {
      setError('请上传参考图片')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const commonParams = {
        prompt: prompt.trim(),
        model,
        aspectRatio,
        n,
        seed: seed ? Number(seed) : undefined,
        promptOptimizer,
        aigcWatermark,
        style:
          model === 'image-01-live' && styleType
            ? { styleType, styleWeight }
            : undefined,
      }

      let result: { taskId: string; imageUrls?: string[]; imageBase64List?: string[] }

      if (activeTab === 't2i') {
        result = await provider.textToImage(commonParams)
      } else {
        result = await provider.imageToImage({
          ...commonParams,
          subjectReference: [{ type: 'character', imageFile: sourceImage }],
        })
      }

      const success = !!result.imageUrls?.length || !!result.imageBase64List?.length

      addTask({
        taskId: result.taskId,
        providerId: config.id,
        type: activeTab,
        status: success ? 'Success' : 'Fail',
        prompt: prompt.trim(),
        imageUrls: result.imageUrls,
        imageBase64List: result.imageBase64List,
        sourceImageUrl: activeTab === 'i2i' ? sourceImage : undefined,
        model,
        error: success ? undefined : '未返回图片数据',
      })

      if (success && activeTab === 't2i') {
        setPrompt('')
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : '生成失败'
      const friendly = raw.toLowerCase().includes('insufficient balance')
        ? `${raw} — 请检查 MiniMax 后台额度`
        : raw
      setError(friendly)
    } finally {
      setIsGenerating(false)
    }
  }

  const isLiveModel = model === 'image-01-live'

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="h-10 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center px-3 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-xs rounded-t transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[#1e1e1e] text-[#ccc]'
                : 'text-[#666] hover:text-[#999]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Input Panel */}
        <div className="w-[420px] flex flex-col border-r border-[#3c3c3c] bg-[#252526]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Provider Info */}
            <div className="flex items-center gap-2 text-xs text-[#666]">
              <Image size={14} />
              <span>供应商: {config?.name || '未配置'}</span>
              {config?.categoryModels?.image && (
                <span className="text-[#4a9eff]">模型: {config.categoryModels.image}</span>
              )}
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-[#858585] text-xs mb-1.5">模型</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
              >
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-[#858585] text-xs mb-1.5">描述</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要生成的图片内容..."
                rows={4}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] resize-none"
              />
              <div className="flex justify-between text-[10px] text-[#555] mt-1">
                <span>{prompt.length} 字符</span>
                <span>最多 1500 字符</span>
              </div>
            </div>

            {/* Image Upload (I2I only) */}
            {activeTab === 'i2i' && (
              <div>
                <label className="block text-[#858585] text-xs mb-1.5">参考图片</label>
                {sourceImage ? (
                  <div className="relative">
                    <img
                      src={sourceImage}
                      alt="参考图"
                      className="w-full rounded border border-[#3c3c3c] object-contain"
                      style={{ maxHeight: 200 }}
                    />
                    <button
                      onClick={() => setSourceImage('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white hover:bg-black/80 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      const f = e.dataTransfer.files[0]
                      if (f) void handleImageUpload(f)
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      dragOver
                        ? 'border-[#4a9eff] bg-[#4a9eff]/5'
                        : 'border-[#3c3c3c] hover:border-[#555] bg-[#1e1e1e]'
                    }`}
                  >
                    <Upload size={20} className="mx-auto mb-1 text-[#555]" />
                    <p className="text-sm text-[#999]">拖拽图片到此处，或点击选择</p>
                    <p className="text-[10px] text-[#555] mt-1">JPG / PNG，小于 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleImageUpload(f)
                  }}
                  className="hidden"
                />
              </div>
            )}

            {/* Aspect Ratio */}
            <div>
              <label className="block text-[#858585] text-xs mb-1.5">宽高比</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
              >
                {aspectRatioOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {aspectRatio === '21:9' && model === 'image-01-live' && (
                <p className="text-[10px] text-yellow-400 mt-1">21:9 仅适用于 image-01 模型</p>
              )}
            </div>

            {/* Style (live model only) */}
            {isLiveModel && (
              <div className="border border-[#3c3c3c] rounded-lg p-3 space-y-3">
                <div className="text-[#858585] text-xs">画风设置</div>
                <div>
                  <label className="block text-[#666] text-[10px] mb-1">风格</label>
                  <select
                    value={styleType}
                    onChange={(e) => setStyleType(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
                  >
                    <option value="">自动</option>
                    {styleTypeOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {styleType && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[#666] text-[10px]">权重</label>
                      <span className="text-[#ccc] text-xs">{styleWeight.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={styleWeight}
                      onChange={(e) => setStyleWeight(Number(e.target.value))}
                      className="w-full accent-[#4a9eff]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#858585] text-xs mb-1.5">数量</label>
                <select
                  value={n}
                  onChange={(e) => setN(Number(e.target.value))}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
                >
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} 张
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#858585] text-xs mb-1.5">随机种子</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="留空则随机"
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promptOptimizer}
                  onChange={(e) => setPromptOptimizer(e.target.checked)}
                  className="accent-[#4a9eff]"
                />
                <span className="text-xs text-[#666]">Prompt 自动优化</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aigcWatermark}
                  onChange={(e) => setAigcWatermark(e.target.checked)}
                  className="accent-[#4a9eff]"
                />
                <span className="text-xs text-[#666]">AIGC 水印</span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-[#3c3c3c]">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !provider}
              className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isGenerating || !provider
                  ? 'bg-[#333] text-[#666] cursor-not-allowed'
                  : 'bg-[#4a9eff] hover:bg-[#3d8bdb] text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  生成图片
                </>
              )}
            </button>
            {!provider && (
              <p className="text-center text-[10px] text-[#666] mt-2">
                请先在设置中启用并配置图片生成分类的 MiniMax 供应商
              </p>
            )}
          </div>
        </div>

        {/* Right: Task List */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <div className="h-10 border-b border-[#3c3c3c] flex items-center justify-between px-4">
            <span className="text-[#ccc] text-sm font-medium">生成记录</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#666]">{tasks.length} 个任务</span>
              {tasks.some((t) => t.status === 'Success' || t.status === 'Fail') && (
                <button
                  onClick={clearCompleted}
                  className="text-[10px] text-[#666] hover:text-red-400 transition-colors cursor-pointer"
                >
                  清除已完成
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#666]">
                <Image size={32} className="mb-3 opacity-30" />
                <p className="text-sm">暂无生成记录</p>
                <p className="text-xs mt-1 opacity-50">在左侧输入描述并点击生成</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
