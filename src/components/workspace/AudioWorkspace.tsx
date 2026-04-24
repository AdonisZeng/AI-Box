import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Music,
  Loader2,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
  Volume2,
  Gauge,
  SlidersHorizontal,
  Upload,
  FileAudio,
  Mic2,
  Wand2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useSettingsStore } from '@/lib/store'
import { useAudioStore } from '@/lib/store/audio'
import { createAudioProvider, getAudioProviderConfig } from '@/lib/audio/service'
import { isAsyncText } from '@/lib/audio'
import type { AudioTask, AudioTaskStatus, AudioTaskType } from '@/lib/audio/types'

const modelOptions = [
  'speech-2.8-hd',
  'speech-2.8-turbo',
  'speech-2.6-hd',
  'speech-2.6-turbo',
  'speech-02-hd',
  'speech-02-turbo',
  'speech-01-hd',
  'speech-01-turbo',
]

const voiceOptions = [
  { value: 'Chinese (Mandarin)_Lyrical_Voice', label: '中文_抒情女声' },
  { value: 'Chinese (Mandarin)_HK_Flight_Attendant', label: '中文_港航空姐' },
  { value: 'English_Graceful_Lady', label: '英文_优雅女士' },
  { value: 'English_Insightful_Speaker', label: '英文_睿智演说家' },
  { value: 'English_radiant_girl', label: '英文_阳光女孩' },
  { value: 'English_Persuasive_Man', label: '英文_说服力男士' },
  { value: 'English_Lucky_Robot', label: '英文_幸运机器人' },
  { value: 'Japanese_Whisper_Belle', label: '日文_耳语少女' },
]

const emotionOptions = [
  { value: '', label: '自动' },
  { value: 'happy', label: '高兴' },
  { value: 'sad', label: '悲伤' },
  { value: 'angry', label: '愤怒' },
  { value: 'fearful', label: '害怕' },
  { value: 'disgusted', label: '厌恶' },
  { value: 'surprised', label: '惊讶' },
  { value: 'calm', label: '中性' },
  { value: 'fluent', label: '生动' },
  { value: 'whisper', label: '低语' },
]

const formatOptions = ['mp3', 'pcm', 'flac', 'wav'] as const
type Format = (typeof formatOptions)[number]

const sampleRateOptions = [8000, 16000, 22050, 24000, 32000, 44100]
const bitrateOptions = [32000, 64000, 128000, 256000]

const languageBoostOptions = [
  { value: '', label: '不增强' },
  { value: 'auto', label: '自动判断' },
  { value: 'Chinese', label: '中文' },
  { value: 'English', label: '英文' },
  { value: 'Japanese', label: '日文' },
  { value: 'Korean', label: '韩文' },
]

const STATUS_LABEL: Record<AudioTaskStatus, string> = {
  Preparing: '准备中',
  Processing: '生成中',
  Success: '已完成',
  Fail: '失败',
}

const STATUS_COLOR: Record<AudioTaskStatus, string> = {
  Preparing: 'text-yellow-400',
  Processing: 'text-blue-400',
  Success: 'text-green-400',
  Fail: 'text-red-400',
}

const TYPE_LABEL: Record<AudioTaskType, string> = {
  tts: '语音合成',
  voice_clone: '音色复刻',
  voice_design: '音色设计',
}

function useAudioProvider() {
  const { activeProviders, providers } = useSettingsStore()
  const config = getAudioProviderConfig({ activeProviders, providers })
  const provider = config ? createAudioProvider(config) : null
  return { config, provider }
}

function getMimeType(fmt: string): string {
  if (fmt === 'wav') return 'audio/wav'
  if (fmt === 'pcm') return 'audio/L16'
  return `audio/${fmt}`
}

function getVoiceIdError(id: string): string | null {
  if (id.length < 8) return 'voice_id 长度至少 8 个字符'
  if (id.length > 256) return 'voice_id 长度最多 256 个字符'
  if (!/^[a-zA-Z]/.test(id)) return 'voice_id 首字符必须为英文字母'
  if (/[-_]$/.test(id)) return 'voice_id 末位字符不可为 - 或 _'
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return 'voice_id 只能包含字母、数字、-、_'
  return null
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-t cursor-pointer transition-colors ${
        active
          ? 'bg-[#1e1e1e] text-[#ccc]'
          : 'text-[#666] hover:text-[#999] hover:bg-[#333]'
      }`}
    >
      {children}
    </button>
  )
}

function ErrorBar({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1.5 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
      <AlertCircle size={14} />
      <span>{message}</span>
    </div>
  )
}

function SubmitButton({
  loading,
  disabled,
  onClick,
  icon: Icon,
  loadingLabel,
  label,
}: {
  loading: boolean
  disabled: boolean
  onClick: () => void
  icon: React.ElementType
  loadingLabel: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
        disabled
          ? 'bg-[#333] text-[#666] cursor-not-allowed'
          : 'bg-[#4a9eff] hover:bg-[#3d8bdb] text-white'
      }`}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Icon size={16} />
          {label}
        </>
      )}
    </button>
  )
}

function NoProviderHint() {
  return (
    <p className="text-center text-[10px] text-[#666] mt-2">
      请先在设置中启用并配置语音合成分类的 MiniMax 供应商
    </p>
  )
}

function TaskCard({ task, onRefresh }: { task: AudioTask; onRefresh: (taskId: string) => void }) {
  const removeTask = useAudioStore((s) => s.removeTask)

  const audioSrc = useMemo(() => {
    if (!task.audioBase64) return null
    return `data:${getMimeType(task.audioFormat || 'mp3')};base64,${task.audioBase64}`
  }, [task.audioBase64, task.audioFormat])

  const handleDownload = () => {
    if (!audioSrc) return
    const ext = task.audioFormat || 'mp3'
    const link = document.createElement('a')
    link.href = audioSrc
    link.download = `${task.type}-${task.taskId.slice(0, 8)}.${ext}`
    link.click()
  }

  return (
    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#333] text-[#888]">
            {TYPE_LABEL[task.type]}
          </span>
          {task.model && (
            <span className="text-xs text-[#666]">{task.model}</span>
          )}
          <span className={`text-xs font-medium ${STATUS_COLOR[task.status]}`}>
            {STATUS_LABEL[task.status]}
          </span>
          {task.status !== 'Success' && task.status !== 'Fail' && (
            <Loader2 size={12} className="animate-spin text-[#4a9eff]" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {task.type === 'tts' && (
            <button
              onClick={() => onRefresh(task.taskId)}
              disabled={task.status === 'Success' || task.status === 'Fail'}
              className="p-1 rounded hover:bg-[#333] text-[#666] hover:text-[#aaa] disabled:opacity-30 cursor-pointer"
              title="刷新状态"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            onClick={() => removeTask(task.taskId)}
            className="p-1 rounded hover:bg-[#333] text-[#666] hover:text-red-400 cursor-pointer"
            title="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <p className="text-[#aaa] text-xs line-clamp-2">{task.text}</p>

      <div className="text-[10px] text-[#555]">音色: {task.voiceId}</div>

      {task.error && (
        <div className="flex items-center gap-1 text-red-400 text-xs">
          <AlertCircle size={12} />
          <span>{task.error}</span>
        </div>
      )}

      {audioSrc && task.status === 'Success' && (
        <div className="space-y-2">
          <audio
            src={audioSrc}
            controls
            className="w-full rounded border border-[#3c3c3c] h-[40px]"
          />
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 text-xs text-[#4a9eff] hover:underline cursor-pointer"
          >
            <Download size={12} />
            下载音频
          </button>
        </div>
      )}

      {task.status === 'Success' && !task.audioBase64 && task.type === 'tts' && (
        <div className="text-xs text-[#666] bg-[#252526] rounded px-3 py-2">
          异步任务已完成，音频文件待下载（file_id: {task.fileId})
        </div>
      )}

      {task.status === 'Success' && task.type === 'voice_clone' && (
        <div className="text-xs text-[#666] bg-[#252526] rounded px-3 py-2">
          复刻成功，voice_id: <span className="text-[#4a9eff] font-mono">{task.voiceId}</span>
          {task.fileId && <div className="mt-1">文件 ID: {task.fileId}</div>}
        </div>
      )}

      {task.status === 'Success' && task.type === 'voice_design' && (
        <div className="text-xs text-[#666] bg-[#252526] rounded px-3 py-2">
          设计成功，voice_id: <span className="text-[#4a9eff] font-mono">{task.voiceId}</span>
        </div>
      )}

      <div className="text-[10px] text-[#555]">{new Date(task.createdAt).toLocaleString()}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TTS Panel                                                          */
/* ------------------------------------------------------------------ */
function TTSPanel({
  config,
  provider,
  createdVoiceIds,
}: {
  config: ReturnType<typeof useAudioProvider>['config']
  provider: ReturnType<typeof useAudioProvider>['provider']
  createdVoiceIds: string[]
}) {
  const [text, setText] = useState('')
  const [model, setModel] = useState('speech-2.8-hd')
  const [voiceId, setVoiceId] = useState('Chinese (Mandarin)_Lyrical_Voice')
  const [isCustomVoice, setIsCustomVoice] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [vol, setVol] = useState(1)
  const [pitch, setPitch] = useState(0)
  const [emotion, setEmotion] = useState('')
  const [format, setFormat] = useState<Format>('mp3')
  const [sampleRate, setSampleRate] = useState(32000)
  const [bitrate, setBitrate] = useState(128000)
  const [channel, setChannel] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const addTask = useAudioStore((s) => s.addTask)

  useEffect(() => {
    if (config?.categoryModels?.voice) {
      setModel(config.categoryModels.voice)
    }
  }, [config?.categoryModels?.voice])

  const handleGenerate = async () => {
    if (!provider || !config) {
      setError('未配置语音合成供应商，请先在设置中启用并配置 MiniMax')
      return
    }
    if (!text.trim()) {
      setError('请输入要合成的文本')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const result = await provider.textToSpeech({
        text: text.trim(),
        model,
        voiceSetting: {
          voice_id: voiceId,
          speed,
          vol,
          pitch,
          emotion: emotion || undefined,
        },
        audioSetting: {
          sample_rate: sampleRate,
          bitrate,
          format,
          channel,
        },
      })

      const isAsync = !result.audioBase64

      addTask({
        taskId: result.taskId,
        providerId: config.id,
        type: 'tts',
        status: isAsync ? 'Preparing' : 'Success',
        text: text.trim(),
        model,
        voiceId,
        audioFormat: format,
        audioBase64: result.audioBase64,
      })

      if (!isAsync) {
        setText('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '合成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleCustomVoice = (checked: boolean) => {
    setIsCustomVoice(checked)
    if (!checked) {
      const isPreset = voiceOptions.some((v) => v.value === voiceId)
      if (!isPreset && !createdVoiceIds.includes(voiceId)) {
        setVoiceId(voiceOptions[0].value)
      }
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Provider Info */}
        <div className="flex items-center gap-2 text-xs text-[#666]">
          <Music size={14} />
          <span>供应商: {config?.name || '未配置'}</span>
          {config?.categoryModels?.voice && (
            <span className="text-[#4a9eff]">模型: {config.categoryModels.voice}</span>
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

        {/* Text Input */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">文本</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要合成语音的文本..."
            rows={4}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] resize-none"
          />
          <div className="flex justify-between text-[10px] text-[#555] mt-1">
            <span>{text.length} 字符</span>
            <span>{isAsyncText(text) ? '将使用异步接口' : '将使用同步接口'}</span>
          </div>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">音色</label>
          {isCustomVoice ? (
            <input
              type="text"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="输入自定义音色 ID..."
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
            />
          ) : (
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
            >
              <optgroup label="系统音色">
                {voiceOptions.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </optgroup>
              {createdVoiceIds.length > 0 && (
                <optgroup label="已创建音色">
                  {createdVoiceIds.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isCustomVoice}
              onChange={(e) => handleToggleCustomVoice(e.target.checked)}
              className="accent-[#4a9eff]"
            />
            <span className="text-[10px] text-[#666]">使用自定义音色 ID</span>
          </label>
        </div>

        {/* Speed Slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[#858585] text-xs flex items-center gap-1">
              <Gauge size={12} />
              语速
            </label>
            <span className="text-[#ccc] text-xs">{speed.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full accent-[#4a9eff]"
          />
          <div className="flex justify-between text-[10px] text-[#555]">
            <span>慢</span>
            <span>快</span>
          </div>
        </div>

        {/* Volume Slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[#858585] text-xs flex items-center gap-1">
              <Volume2 size={12} />
              音量
            </label>
            <span className="text-[#ccc] text-xs">{vol.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={vol}
            onChange={(e) => setVol(Number(e.target.value))}
            className="w-full accent-[#4a9eff]"
          />
        </div>

        {/* Pitch Slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[#858585] text-xs">音调</label>
            <span className="text-[#ccc] text-xs">{pitch}</span>
          </div>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-full accent-[#4a9eff]"
          />
          <div className="flex justify-between text-[10px] text-[#555]">
            <span>低沉</span>
            <span>明亮</span>
          </div>
        </div>

        {/* Emotion */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">情绪</label>
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
          >
            {emotionOptions.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Format Settings */}
        <div className="border border-[#3c3c3c] rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-[#858585] text-xs">
            <SlidersHorizontal size={12} />
            <span>音频格式</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#666] text-[10px] mb-1">格式</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as Format)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
              >
                {formatOptions.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#666] text-[10px] mb-1">声道</label>
              <select
                value={channel}
                onChange={(e) => setChannel(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
              >
                <option value={1}>单声道</option>
                <option value={2}>双声道</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#666] text-[10px] mb-1">采样率</label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
              >
                {sampleRateOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}Hz
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#666] text-[10px] mb-1">比特率</label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
              >
                {bitrateOptions.map((b) => (
                  <option key={b} value={b}>
                    {b / 1000}kbps
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <ErrorBar message={error} />}
      </div>

      <div className="p-4 border-t border-[#3c3c3c]">
        <SubmitButton
          loading={isGenerating}
          disabled={isGenerating || !provider}
          onClick={handleGenerate}
          icon={Music}
          loadingLabel="合成中..."
          label="生成语音"
        />
        {!provider && <NoProviderHint />}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Voice Clone Panel                                                  */
/* ------------------------------------------------------------------ */
function VoiceClonePanel({
  config,
  provider,
}: {
  config: ReturnType<typeof useAudioProvider>['config']
  provider: ReturnType<typeof useAudioProvider>['provider']
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [voiceId, setVoiceId] = useState('')
  const [languageBoost, setLanguageBoost] = useState('')
  const [needNoiseReduction, setNeedNoiseReduction] = useState(false)
  const [needVolumeNormalization, setNeedVolumeNormalization] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [previewModel, setPreviewModel] = useState('speech-2.8-hd')
  const [isCloning, setIsCloning] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addTask = useAudioStore((s) => s.addTask)

  const voiceIdError = voiceId ? getVoiceIdError(voiceId) : null

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) void validateAndSetFile(dropped)
  }

  async function validateAndSetFile(f: File) {
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.mp3', '.m4a', '.wav'].includes(ext)) {
      setError('文件格式不支持，请上传 mp3、m4a 或 wav 格式')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('文件大小超过 20MB 限制')
      return
    }

    // Verify file header magic bytes
    try {
      const header = new Uint8Array(await f.slice(0, 8).arrayBuffer())
      const isWav =
        header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
      const isMp3 =
        (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
        (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
      const isM4a =
        header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70

      if (ext === '.wav' && !isWav) {
        setError('文件头不匹配 wav 格式')
        return
      }
      if (ext === '.mp3' && !isMp3) {
        setError('文件头不匹配 mp3 格式')
        return
      }
      if (ext === '.m4a' && !isM4a) {
        setError('文件头不匹配 m4a 格式')
        return
      }
    } catch {
      setError('无法读取文件，请重试')
      return
    }

    setFile(f)
    setError('')
  }

  const handleClone = async () => {
    if (!provider || !config) {
      setError('未配置语音合成供应商')
      return
    }
    if (!file) {
      setError('请上传音频文件')
      return
    }
    if (!voiceId.trim()) {
      setError('请输入自定义 voice_id')
      return
    }
    if (voiceIdError) {
      setError(voiceIdError)
      return
    }
    if (!provider.uploadFile || !provider.cloneVoice) {
      setError('当前供应商不支持音色复刻')
      return
    }

    setIsCloning(true)
    setError('')

    try {
      const uploadResult = await provider.uploadFile(file, 'voice_clone')

      const result = await provider.cloneVoice({
        fileId: uploadResult.fileId,
        voiceId: voiceId.trim(),
        languageBoost: languageBoost || undefined,
        needNoiseReduction,
        needVolumeNormalization,
        text: previewText.trim() || undefined,
        model: previewText.trim() ? previewModel : undefined,
      })

      addTask({
        taskId: result.voiceId,
        providerId: config.id,
        type: 'voice_clone',
        status: 'Success',
        text: previewText.trim() || file.name,
        model: previewText.trim() ? previewModel : undefined,
        voiceId: result.voiceId,
        audioBase64: result.demoAudio,
        audioFormat: 'mp3',
        fileId: uploadResult.fileId,
      })

      setFile(null)
      setVoiceId('')
      setPreviewText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : '复刻失败')
    } finally {
      setIsCloning(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Provider Info */}
        <div className="flex items-center gap-2 text-xs text-[#666]">
          <Mic2 size={14} />
          <span>供应商: {config?.name || '未配置'}</span>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">复刻音频</label>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-[#4a9eff] bg-[#4a9eff]/5'
                : 'border-[#3c3c3c] hover:border-[#555] bg-[#1e1e1e]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.m4a,.wav"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void validateAndSetFile(f)
              }}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-[#ccc]">
                <FileAudio size={18} className="text-[#4a9eff]" />
                <span>{file.name}</span>
                <span className="text-[#666]">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2 text-[#555]" />
                <p className="text-sm text-[#999]">拖拽音频文件到此处，或点击选择</p>
                <p className="text-[10px] text-[#555] mt-1">mp3 / m4a / wav，10秒 - 5分钟，不超过 20MB</p>
              </>
            )}
          </div>
          {file && (
            <button
              onClick={() => {
                setFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="text-[10px] text-[#666] hover:text-red-400 mt-1 cursor-pointer"
            >
              清除文件
            </button>
          )}
        </div>

        {/* Voice ID */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">自定义 voice_id</label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="例如：MyVoice001"
            className={`w-full bg-[#1e1e1e] border rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] ${
              voiceIdError ? 'border-red-400/50' : 'border-[#3c3c3c]'
            }`}
          />
          {voiceIdError ? (
            <p className="text-[10px] text-red-400 mt-1">{voiceIdError}</p>
          ) : (
            <p className="text-[10px] text-[#555] mt-1">
              8-256 字符，首字符为字母，允许字母/数字/-/_，末位不可为 -/_
            </p>
          )}
        </div>

        {/* Advanced Options */}
        <div className="border border-[#3c3c3c] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#858585] hover:bg-[#2a2a2a] cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <SlidersHorizontal size={12} />
              高级选项
            </span>
            {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {showAdvanced && (
            <div className="px-3 pb-3 space-y-3 border-t border-[#3c3c3c]">
              <div className="pt-3">
                <label className="block text-[#666] text-[10px] mb-1">语言增强</label>
                <select
                  value={languageBoost}
                  onChange={(e) => setLanguageBoost(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
                >
                  {languageBoostOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needNoiseReduction}
                    onChange={(e) => setNeedNoiseReduction(e.target.checked)}
                    className="accent-[#4a9eff]"
                  />
                  <span className="text-xs text-[#666]">降噪</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needVolumeNormalization}
                    onChange={(e) => setNeedVolumeNormalization(e.target.checked)}
                    className="accent-[#4a9eff]"
                  />
                  <span className="text-xs text-[#666]">音量归一化</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="border border-[#3c3c3c] rounded-lg p-3 space-y-3">
          <div className="text-[#858585] text-xs flex items-center gap-1">
            <Volume2 size={12} />
            <span>试听（可选，将根据字符数正常收费）</span>
          </div>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="输入试听文本..."
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff]"
          />
          <select
            value={previewModel}
            onChange={(e) => setPreviewModel(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#ccc] focus:outline-none focus:border-[#4a9eff]"
          >
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorBar message={error} />}
      </div>

      <div className="p-4 border-t border-[#3c3c3c]">
        <SubmitButton
          loading={isCloning}
          disabled={isCloning || !provider}
          onClick={handleClone}
          icon={Mic2}
          loadingLabel="复刻中..."
          label="复刻音色"
        />
        {!provider && <NoProviderHint />}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Voice Design Panel                                                 */
/* ------------------------------------------------------------------ */
function VoiceDesignPanel({
  config,
  provider,
}: {
  config: ReturnType<typeof useAudioProvider>['config']
  provider: ReturnType<typeof useAudioProvider>['provider']
}) {
  const [prompt, setPrompt] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [isDesigning, setIsDesigning] = useState(false)
  const [error, setError] = useState('')

  const addTask = useAudioStore((s) => s.addTask)

  const voiceIdError = voiceId ? getVoiceIdError(voiceId) : null

  const handleDesign = async () => {
    if (!provider || !config) {
      setError('未配置语音合成供应商')
      return
    }
    if (!prompt.trim()) {
      setError('请输入音色描述')
      return
    }
    if (!previewText.trim()) {
      setError('请输入试听文本')
      return
    }
    if (voiceId && voiceIdError) {
      setError(voiceIdError)
      return
    }
    if (!provider.designVoice) {
      setError('当前供应商不支持音色设计')
      return
    }

    setIsDesigning(true)
    setError('')

    try {
      const result = await provider.designVoice({
        prompt: prompt.trim(),
        previewText: previewText.trim(),
        voiceId: voiceId.trim() || undefined,
      })

      addTask({
        taskId: result.voiceId,
        providerId: config.id,
        type: 'voice_design',
        status: 'Success',
        text: prompt.trim(),
        voiceId: result.voiceId,
        audioBase64: result.trialAudio,
        audioFormat: 'mp3',
      })

      setPrompt('')
      setPreviewText('')
      setVoiceId('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '设计失败')
    } finally {
      setIsDesigning(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Provider Info */}
        <div className="flex items-center gap-2 text-xs text-[#666]">
          <Wand2 size={14} />
          <span>供应商: {config?.name || '未配置'}</span>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">音色描述</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：讲述悬疑故事的播音员，声音低沉富有磁性..."
            rows={3}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] resize-none"
          />
        </div>

        {/* Preview Text */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">试听文本</label>
          <textarea
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="输入一段文本用于试听生成的音色..."
            rows={3}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] resize-none"
          />
          <div className="flex justify-between text-[10px] text-[#555] mt-1">
            <span>{previewText.length} 字符</span>
            <span>最多 500 字符</span>
          </div>
        </div>

        {/* Optional Voice ID */}
        <div>
          <label className="block text-[#858585] text-xs mb-1.5">自定义 voice_id（可选）</label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="留空则自动生成"
            className={`w-full bg-[#1e1e1e] border rounded px-3 py-2 text-sm text-[#ccc] placeholder-[#666] focus:outline-none focus:border-[#4a9eff] ${
              voiceIdError ? 'border-red-400/50' : 'border-[#3c3c3c]'
            }`}
          />
          {voiceIdError ? (
            <p className="text-[10px] text-red-400 mt-1">{voiceIdError}</p>
          ) : (
            <p className="text-[10px] text-[#555] mt-1">
              8-256 字符，首字符为字母，允许字母/数字/-/_，末位不可为 -/_
            </p>
          )}
        </div>

        {error && <ErrorBar message={error} />}
      </div>

      <div className="p-4 border-t border-[#3c3c3c]">
        <SubmitButton
          loading={isDesigning}
          disabled={isDesigning || !provider}
          onClick={handleDesign}
          icon={Wand2}
          loadingLabel="设计中..."
          label="设计音色"
        />
        {!provider && <NoProviderHint />}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
type AudioTab = 'tts' | 'voice_clone' | 'voice_design'

export function AudioWorkspace() {
  const [activeTab, setActiveTab] = useState<AudioTab>('tts')

  const { config, provider } = useAudioProvider()
  const tasks = useAudioStore((s) => s.tasks)
  const updateTask = useAudioStore((s) => s.updateTask)
  const clearCompleted = useAudioStore((s) => s.clearCompleted)

  const createdVoiceIds = useMemo(() => {
    const ids = tasks
      .filter(
        (t) =>
          t.status === 'Success' &&
          (t.type === 'voice_clone' || t.type === 'voice_design')
      )
      .map((t) => t.voiceId)
    return [...new Set(ids)]
  }, [tasks])

  // Poll unfinished async TTS tasks. Re-reads store state before comparing
  // to avoid stale closure issues.
  useEffect(() => {
    if (!provider) return

    const poll = async () => {
      const currentTasks = useAudioStore.getState().tasks
      const asyncTasks = currentTasks.filter(
        (t) =>
          t.type === 'tts' &&
          t.status !== 'Success' &&
          t.status !== 'Fail' &&
          !t.audioBase64
      )
      if (asyncTasks.length === 0) return

      await Promise.all(
        asyncTasks.map(async (task) => {
          try {
            const result = await provider.queryAudioTask(task.taskId)
            const latest = useAudioStore
              .getState()
              .tasks.find((t) => t.taskId === task.taskId)
            if (!latest) return
            if (
              result.status !== latest.status ||
              result.fileId !== latest.fileId ||
              result.error !== latest.error
            ) {
              updateTask(task.taskId, {
                status: result.status,
                fileId: result.fileId,
                error: result.error,
              })
            }
          } catch (e) {
            console.error('Poll failed for', task.taskId, e)
          }
        })
      )
    }

    const initialTimeout = setTimeout(poll, 2000)
    const interval = setInterval(poll, 5000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [provider, updateTask])

  const handleRefreshOne = useCallback(
    async (taskId: string) => {
      if (!provider) return
      const task = tasks.find((t) => t.taskId === taskId)
      if (!task || task.audioBase64) return
      try {
        const result = await provider.queryAudioTask(taskId)
        if (
          result.status !== task.status ||
          result.fileId !== task.fileId ||
          result.error !== task.error
        ) {
          updateTask(taskId, {
            status: result.status,
            fileId: result.fileId,
            error: result.error,
          })
        }
      } catch (e) {
        console.error('Query failed:', e)
      }
    },
    [provider, tasks, updateTask]
  )

  const tabItems: { id: AudioTab; label: string }[] = [
    { id: 'tts', label: '语音合成' },
    { id: 'voice_clone', label: '音色快速复刻' },
    { id: 'voice_design', label: '音色设计' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="h-10 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center px-3 gap-1">
        {tabItems.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Input Panel */}
        <div className="w-[420px] flex flex-col border-r border-[#3c3c3c] bg-[#252526]">
          {activeTab === 'tts' && (
            <TTSPanel
              config={config}
              provider={provider}
              createdVoiceIds={createdVoiceIds}
            />
          )}
          {activeTab === 'voice_clone' && (
            <VoiceClonePanel config={config} provider={provider} />
          )}
          {activeTab === 'voice_design' && (
            <VoiceDesignPanel config={config} provider={provider} />
          )}
        </div>

        {/* Right: Task List */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <div className="h-10 border-b border-[#3c3c3c] flex items-center justify-between px-4">
            <span className="text-[#ccc] text-sm font-medium">任务列表</span>
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
                <Music size={32} className="mb-3 opacity-30" />
                <p className="text-sm">暂无任务</p>
                <p className="text-xs mt-1 opacity-50">在左侧操作并点击生成</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={handleRefreshOne} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
