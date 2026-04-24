import { useState, useRef, useCallback, useEffect } from 'react'
import { Video, Image, Wand2, Loader2, Trash2, RefreshCw, Download, AlertCircle, Upload, X } from 'lucide-react'
import { useSettingsStore } from '@/lib/store'
import { useVideoStore } from '@/lib/store/video'
import { getActiveVideoProvider, getVideoProviderConfig } from '@/lib/video/service'
import type { VideoProvider, VideoTask } from '@/lib/video/types'

type TabType = 't2v' | 'i2v' | 'agent'

const TABS: { key: TabType; label: string }[] = [
  { key: 't2v', label: '文生视频' },
  { key: 'i2v', label: '图生视频' },
  { key: 'agent', label: '视频Agent' },
]

const t2vModels = ['MiniMax-Hailuo-2.3', 'MiniMax-Hailuo-02', 'T2V-01-Director', 'T2V-01']
const i2vModels = [
  'MiniMax-Hailuo-2.3',
  'MiniMax-Hailuo-2.3-Fast',
  'MiniMax-Hailuo-02',
  'I2V-01-Director',
  'I2V-01-live',
  'I2V-01',
]

const durationOptions = [6, 10]
const resolutionOptions = ['720P', '768P', '1080P']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function useVideoProvider() {
  const { activeProviders, providers } = useSettingsStore()
  const config = getVideoProviderConfig({ activeProviders, providers })
  const provider = config ? getActiveVideoProvider({ activeProviders, providers }) : null
  return { config, provider }
}

function TaskCard({ task, provider }: { task: VideoTask; provider: VideoProvider | null }) {
  const { updateTask, removeTask } = useVideoStore()
  const [isPolling, setIsPolling] = useState(false)

  const handleQuery = useCallback(async () => {
    if (!provider || task.status === 'Success' || task.status === 'Fail') return
    setIsPolling(true)
    try {
      const result =
        task.type === 'agent'
          ? await provider.queryAgentTask(task.taskId)
          : await provider.queryVideoTask(task.taskId)
      updateTask(task.taskId, {
        status: result.status,
        videoUrl: result.videoUrl,
        error: result.error,
      })
    } catch (e) {
      console.error('Query failed:', e)
    } finally {
      setIsPolling(false)
    }
  }, [provider, task, updateTask])

  // Auto-poll for unfinished tasks
  useEffect(() => {
    if (task.status === 'Success' || task.status === 'Fail') return
    const interval = setInterval(() => {
      handleQuery()
    }, 5000)
    return () => clearInterval(interval)
  }, [task.status, handleQuery])

  const statusLabel: Record<VideoTask['status'], string> = {
    Preparing: '准备中',
    Processing: '生成中',
    Success: '已完成',
    Fail: '失败',
  }

  const statusColor: Record<VideoTask['status'], string> = {
    Preparing: 'text-yellow-400',
    Processing: 'text-blue-400',
    Success: 'text-green-400',
    Fail: 'text-red-400',
  }

  return (
    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666]">
            {task.type === 't2v' ? '文生视频' : task.type === 'i2v' ? '图生视频' : '视频Agent'}
          </span>
          <span className={`text-xs font-medium ${statusColor[task.status]}`}>
            {statusLabel[task.status]}
          </span>
          {task.status !== 'Success' && task.status !== 'Fail' && (
            <Loader2 size={12} className="animate-spin text-[#4a9eff]" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleQuery}
            disabled={isPolling || task.status === 'Success' || task.status === 'Fail'}
            className="p-1 rounded hover:bg-[#333] text-[#666] hover:text-[#aaa] disabled:opacity-30"
            title="刷新状态"
          >
            <RefreshCw size={12} className={isPolling ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => removeTask(task.taskId)}
            className="p-1 rounded hover:bg-[#333] text-[#666] hover:text-red-400"
            title="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {task.prompt && (
        <p className="text-[#aaa] text-xs line-clamp-2">{task.prompt}</p>
      )}

      {task.error && (
        <div className="flex items-center gap-1 text-red-400 text-xs">
          <AlertCircle size={12} />
          <span>{task.error}</span>
        </div>
      )}

      {task.videoUrl && task.status === 'Success' && (
        <div className="space-y-2">
          <video
            src={task.videoUrl}
            controls
            className="w-full rounded border border-[#3c3c3c]"
            style={{ maxHeight: 240 }}
          />
          <a
            href={task.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#4a9eff] hover:underline"
          >
            <Download size={12} />
            下载视频
          </a>
        </div>
      )}

      <div className="text-[10px] text-[#555]">
        {new Date(task.createdAt).toLocaleString()}
      </div>
    </div>
  )
}

export function VideoWorkspace() {
  const [activeTab, setActiveTab] = useState<TabType>('t2v')
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [model, setModel] = useState('MiniMax-Hailuo-2.3')
  const [duration, setDuration] = useState(6)
  const [resolution, setResolution] = useState('768P')
  const [templateId, setTemplateId] = useState('')
  const [agentTextInputs, setAgentTextInputs] = useState('')
  const [agentMediaInputs, setAgentMediaInputs] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { config, provider } = useVideoProvider()
  const { tasks, addTask, updateTask } = useVideoStore()

  // Sync model when config changes
  useEffect(() => {
    if (config?.categoryModels?.video) {
      setModel(config.categoryModels.video)
    }
  }, [config?.categoryModels?.video])

  // Adjust model list when tab changes
  useEffect(() => {
    const available = activeTab === 'i2v' ? i2vModels : t2vModels
    if (!available.includes(model)) {
      setModel(available[0])
    }
  }, [activeTab, model])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setImageUrl(base64)
    } catch {
      setError('图片读取失败')
    }
  }

  const handleGenerate = async () => {
    if (!provider || !config) {
      setError('未配置视频生成供应商，请先在设置中启用并配置 MiniMax')
      return
    }
    if (!prompt.trim() && activeTab !== 'agent') {
      setError('请输入提示词')
      return
    }
    if (activeTab === 'i2v' && !imageUrl) {
      setError('请上传起始帧图片')
      return
    }
    if (activeTab === 'agent' && !templateId.trim()) {
      setError('请输入模板ID')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      let result: { taskId: string }

      if (activeTab === 't2v') {
        result = await provider.textToVideo({
          prompt: prompt.trim(),
          model,
          duration,
          resolution,
        })
      } else if (activeTab === 'i2v') {
        result = await provider.imageToVideo({
          prompt: prompt.trim(),
          imageUrl,
          model,
          duration,
          resolution,
        })
      } else {
        result = await provider.createVideoAgent({
          templateId: templateId.trim(),
          textInputs: agentTextInputs
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          mediaInputs: agentMediaInputs
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        })
      }

      const taskType = activeTab
      addTask({
        taskId: result.taskId,
        providerId: config.id,
        type: taskType,
        status: 'Preparing',
        prompt: activeTab === 'agent' ? `模板: ${templateId}` : prompt.trim(),
        imageUrl: activeTab === 'i2v' ? imageUrl : undefined,
        model: activeTab === 'agent' ? undefined : model,
      })

      // Immediately query status
      setTimeout(async () => {
        try {
          const queryResult =
            taskType === 'agent'
              ? await provider.queryAgentTask(result.taskId)
              : await provider.queryVideoTask(result.taskId)
          updateTask(result.taskId, {
            status: queryResult.status,
            videoUrl: queryResult.videoUrl,
            error: queryResult.error,
          })
        } catch {
          // ignore initial query error
        }
      }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const currentModels = activeTab === 'i2v' ? i2vModels : t2vModels

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
              <Video size={14} />
              <span>供应商: {config?.name || '未配置'}</span>
              {config?.categoryModels?.video && (
                <span className="text-[#4a9eff]">模型: {config.categoryModels.video}</span>
              )}
            </div>

            {/* Model Selection (not for agent) */}
            {activeTab !== 'agent' && (
              <div>
                <label className="block text-[#858585] text-xs mb-1.5">模型</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
                >
                  {currentModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Prompt */}
            {activeTab !== 'agent' && (
              <div>
                <label className="block text-[#858585] text-xs mb-1.5">提示词</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要生成的视频内容..."
                  rows={4}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] resize-none"
                />
                <div className="text-right text-[10px] text-[#555] mt-1">
                  {prompt.length} / 2000
                </div>
              </div>
            )}

            {/* Image Upload (I2V only) */}
            {activeTab === 'i2v' && (
              <div>
                <label className="block text-[#858585] text-xs mb-1.5">起始帧图片</label>
                {imageUrl ? (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full rounded border border-[#3c3c3c] object-contain"
                      style={{ maxHeight: 200 }}
                    />
                    <button
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white hover:bg-black/80"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-[120px] border-2 border-dashed border-[#3c3c3c] rounded flex flex-col items-center justify-center gap-2 text-[#666] hover:border-[#4a9eff] hover:text-[#4a9eff] transition-colors cursor-pointer"
                  >
                    <Upload size={24} />
                    <span className="text-xs">点击上传图片 (JPG/PNG/WebP, {'<'}20MB)</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Agent Inputs */}
            {activeTab === 'agent' && (
              <>
                <div>
                  <label className="block text-[#858585] text-xs mb-1.5">模板 ID</label>
                  <input
                    type="text"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    placeholder="输入视频模板 ID..."
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
                  />
                </div>
                <div>
                  <label className="block text-[#858585] text-xs mb-1.5">文本输入 (每行一个)</label>
                  <textarea
                    value={agentTextInputs}
                    onChange={(e) => setAgentTextInputs(e.target.value)}
                    placeholder="狮子&#10;老虎"
                    rows={3}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[#858585] text-xs mb-1.5">媒体输入 URL (每行一个)</label>
                  <textarea
                    value={agentMediaInputs}
                    onChange={(e) => setAgentMediaInputs(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    rows={2}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] resize-none"
                  />
                </div>
              </>
            )}

            {/* Parameters (not for agent) */}
            {activeTab !== 'agent' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#858585] text-xs mb-1.5">时长 (秒)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
                  >
                    {durationOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#858585] text-xs mb-1.5">分辨率</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
                  >
                    {resolutionOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
                  提交任务中...
                </>
              ) : activeTab === 'agent' ? (
                <>
                  <Wand2 size={16} />
                  创建视频Agent任务
                </>
              ) : (
                <>
                  <Image size={16} />
                  生成视频
                </>
              )}
            </button>
            {!provider && (
              <p className="text-center text-[10px] text-[#666] mt-2">
                请先在设置中启用并配置视频分类的 MiniMax 供应商
              </p>
            )}
          </div>
        </div>

        {/* Right: Task List */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <div className="h-10 border-b border-[#3c3c3c] flex items-center justify-between px-4">
            <span className="text-[#ccc] text-sm font-medium">任务列表</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#666]">{tasks.length} 个任务</span>
              {tasks.some((t) => t.status === 'Success' || t.status === 'Fail') && (
                <button
                  onClick={() => useVideoStore.getState().clearCompleted()}
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
                <Video size={32} className="mb-3 opacity-30" />
                <p className="text-sm">暂无任务</p>
                <p className="text-xs mt-1 opacity-50">在左侧输入内容并点击生成</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} provider={provider} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
