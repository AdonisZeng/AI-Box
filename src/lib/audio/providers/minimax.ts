import type {
  AudioProvider,
  AudioTaskStatus,
  TextToSpeechParams,
  VoiceCloneParams,
  VoiceDesignParams,
  MusicGenerationParams,
} from '../types'

export function isAsyncText(text: string): boolean {
  return text.length >= 3000
}

export class MiniMaxAudioProvider implements AudioProvider {
  name = 'MiniMax'
  providerId = 'minimax'
  private baseURL: string
  private headers: Record<string, string>

  constructor(apiKey: string, baseURL: string) {
    this.baseURL = baseURL.replace(/\/anthropic\/?$/, '') || 'https://api.minimaxi.com'
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>
  ): Promise<T> {
    let url = `${this.baseURL}${path}`
    if (query) {
      const params = new URLSearchParams(query)
      url += `?${params.toString()}`
    }

    const res = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new Error(`MiniMax API 错误 (${path}): ${res.status}`)
    }

    const data = (await res.json()) as { base_resp?: { status_code: number; status_msg: string } }
    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '未知错误')
    }

    return data as T
  }

  async textToSpeech(
    params: TextToSpeechParams
  ): Promise<{ taskId: string; audioBase64?: string }> {
    const isAsync = isAsyncText(params.text)

    const voiceSetting: Record<string, unknown> = {
      voice_id: params.voiceSetting.voice_id,
    }
    if (params.voiceSetting.speed !== undefined) voiceSetting.speed = params.voiceSetting.speed
    if (params.voiceSetting.vol !== undefined) voiceSetting.vol = params.voiceSetting.vol
    if (params.voiceSetting.pitch !== undefined) voiceSetting.pitch = params.voiceSetting.pitch
    if (params.voiceSetting.emotion !== undefined) voiceSetting.emotion = params.voiceSetting.emotion

    const body: Record<string, unknown> = {
      model: params.model,
      text: params.text,
      voice_setting: voiceSetting,
    }

    if (params.audioSetting) {
      const audioSetting: Record<string, unknown> = {}
      if (params.audioSetting.sample_rate !== undefined)
        audioSetting.sample_rate = params.audioSetting.sample_rate
      if (params.audioSetting.bitrate !== undefined)
        audioSetting.bitrate = params.audioSetting.bitrate
      if (params.audioSetting.format !== undefined)
        audioSetting.format = params.audioSetting.format
      if (params.audioSetting.channel !== undefined)
        audioSetting.channel = params.audioSetting.channel
      if (Object.keys(audioSetting).length > 0) {
        body.audio_setting = audioSetting
      }
    }

    if (params.pronunciationDict?.tone?.length) {
      body.pronunciation_dict = { tone: params.pronunciationDict.tone }
    }

    if (isAsync) {
      const data = await this.request<{
        task_id: string
        file_id?: number
        base_resp?: { status_msg: string }
      }>('POST', '/v1/t2a_async_v2', body)
      return { taskId: data.task_id }
    }

    body.stream = false
    body.output_format = 'hex'

    const data = await this.request<{
      trace_id: string
      data?: { audio?: string; status?: number }
      extra_info?: {
        audio_length?: number
        audio_sample_rate?: number
        audio_size?: number
        bitrate?: number
        audio_format?: string
        audio_channel?: number
        usage_characters?: number
        word_count?: number
      }
      base_resp?: { status_msg: string }
    }>('POST', '/v1/t2a_v2', body)

    const hexAudio = data.data?.audio
    if (!hexAudio) {
      throw new Error('未返回音频数据')
    }

    const audioBase64 = this.hexToBase64(hexAudio)
    return { taskId: data.trace_id, audioBase64 }
  }

  async queryAudioTask(
    taskId: string
  ): Promise<{ status: AudioTaskStatus; fileId?: string; error?: string }> {
    const data = await this.request<{
      task_id?: number
      status: string
      file_id?: number
      base_resp?: { status_msg: string }
    }>('GET', '/v1/query/t2a_async_query_v2', undefined, { task_id: taskId })

    return {
      status: this.normalizeStatus(data.status),
      fileId: data.file_id ? String(data.file_id) : undefined,
      error:
        data.status === 'Failed' || data.status === 'failed'
          ? data.base_resp?.status_msg
          : undefined,
    }
  }

  async uploadFile(file: File, purpose: string): Promise<{ fileId: string }> {
    const formData = new FormData()
    formData.append('purpose', purpose)
    formData.append('file', file)

    const res = await fetch(`${this.baseURL}/v1/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: this.headers.Authorization,
      },
      body: formData,
    })

    if (!res.ok) {
      throw new Error(`MiniMax 文件上传错误: ${res.status}`)
    }

    const data = (await res.json()) as {
      file?: { file_id?: number }
      base_resp?: { status_code: number; status_msg: string }
    }

    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '文件上传失败')
    }

    const fileId = data.file?.file_id
    if (!fileId) {
      throw new Error('上传成功但未返回 file_id')
    }

    return { fileId: String(fileId) }
  }

  async cloneVoice(params: VoiceCloneParams): Promise<{ voiceId: string; demoAudioUrl?: string }> {
    const body: Record<string, unknown> = {
      file_id: Number(params.fileId),
      voice_id: params.voiceId,
    }

    if (params.languageBoost) body.language_boost = params.languageBoost
    if (params.needNoiseReduction !== undefined) body.need_noise_reduction = params.needNoiseReduction
    if (params.needVolumeNormalization !== undefined)
      body.need_volume_normalization = params.needVolumeNormalization

    if (params.clonePrompt) {
      body.clone_prompt = {
        prompt_audio: Number(params.clonePrompt.promptAudioFileId),
        prompt_text: params.clonePrompt.promptText,
      }
    }

    if (params.text && params.model) {
      body.text = params.text
      body.model = params.model
    }

    const data = await this.request<{
      demo_audio?: string
      base_resp?: { status_msg: string }
    }>('POST', '/v1/voice_clone', body)

    return { voiceId: params.voiceId, demoAudioUrl: data.demo_audio || undefined }
  }

  async designVoice(params: VoiceDesignParams): Promise<{ voiceId: string; trialAudio?: string }> {
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      preview_text: params.previewText,
    }

    if (params.voiceId) body.voice_id = params.voiceId

    const data = await this.request<{
      voice_id?: string
      trial_audio?: string
      base_resp?: { status_msg: string }
    }>('POST', '/v1/voice_design', body)

    const voiceId = data.voice_id
    if (!voiceId) {
      throw new Error('未返回音色 ID')
    }

    const trialAudio = data.trial_audio ? this.hexToBase64(data.trial_audio) : undefined
    return { voiceId, trialAudio }
  }

  async generateMusic(
    params: MusicGenerationParams
  ): Promise<{ taskId: string; audioBase64: string }> {
    const body: Record<string, unknown> = {
      model: params.model,
      stream: false,
      output_format: 'hex',
    }

    if (params.prompt) body.prompt = params.prompt
    if (params.lyrics) body.lyrics = params.lyrics

    if (params.audioSetting) {
      const audioSetting: Record<string, unknown> = {}
      if (params.audioSetting.sample_rate !== undefined)
        audioSetting.sample_rate = params.audioSetting.sample_rate
      if (params.audioSetting.bitrate !== undefined)
        audioSetting.bitrate = params.audioSetting.bitrate
      if (params.audioSetting.format !== undefined)
        audioSetting.format = params.audioSetting.format
      if (Object.keys(audioSetting).length > 0) {
        body.audio_setting = audioSetting
      }
    }

    if (params.aigcWatermark !== undefined) body.aigc_watermark = params.aigcWatermark
    if (params.lyricsOptimizer !== undefined) body.lyrics_optimizer = params.lyricsOptimizer
    if (params.isInstrumental !== undefined) body.is_instrumental = params.isInstrumental

    if (params.referenceAudioBase64) {
      body.audio_base64 = params.referenceAudioBase64
    }

    if (params.coverFeatureId) {
      body.cover_feature_id = params.coverFeatureId
    }

    const data = await this.request<{
      trace_id: string
      data?: { audio?: string; status?: number }
      extra_info?: {
        music_duration?: number
        music_sample_rate?: number
        music_channel?: number
        bitrate?: number
        music_size?: number
      }
      base_resp?: { status_msg: string }
    }>('POST', '/v1/music_generation', body)

    const hexAudio = data.data?.audio
    if (!hexAudio) {
      throw new Error('未返回音频数据')
    }

    const audioBase64 = this.hexToBase64(hexAudio)
    return { taskId: data.trace_id, audioBase64 }
  }

  async preprocessCoverAudio(audioBase64: string): Promise<{ coverFeatureId: string }> {
    const data = await this.request<{
      cover_feature_id?: string
      base_resp?: { status_msg: string }
    }>('POST', '/v1/music_cover_preprocess', {
      audio_base64: audioBase64,
    })

    const coverFeatureId = data.cover_feature_id
    if (!coverFeatureId) {
      throw new Error('未返回 cover_feature_id')
    }

    return { coverFeatureId }
  }

  private hexToBase64(hex: string): string {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
    return btoa(binary)
  }

  private normalizeStatus(raw: string): AudioTaskStatus {
    const s = String(raw).toLowerCase()
    if (s === 'preparing') return 'Preparing'
    if (s === 'processing') return 'Processing'
    if (s === 'success') return 'Success'
    if (s === 'fail' || s === 'failed' || s === 'expired') return 'Fail'
    return 'Processing'
  }
}
