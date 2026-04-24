export type AudioTaskStatus = 'Preparing' | 'Processing' | 'Success' | 'Fail'

export type AudioTaskType = 'tts' | 'voice_clone' | 'voice_design' | 'music'

export interface AudioTask {
  id: string
  taskId: string
  providerId: string
  type: AudioTaskType
  status: AudioTaskStatus
  text: string
  model?: string
  voiceId: string
  audioFormat?: string
  audioBase64?: string
  fileId?: string
  error?: string
  createdAt: number
  updatedAt: number
}

export interface VoiceSetting {
  voice_id: string
  speed?: number
  vol?: number
  pitch?: number
  emotion?: string
}

export interface AudioSetting {
  sample_rate?: number
  bitrate?: number
  format?: 'mp3' | 'pcm' | 'flac' | 'wav'
  channel?: number
}

export interface PronunciationDict {
  tone?: string[]
}

export interface TextToSpeechParams {
  text: string
  model: string
  voiceSetting: VoiceSetting
  audioSetting?: AudioSetting
  pronunciationDict?: PronunciationDict
}

export interface VoiceCloneParams {
  fileId: string
  voiceId: string
  text?: string
  model?: string
  languageBoost?: string
  needNoiseReduction?: boolean
  needVolumeNormalization?: boolean
  clonePrompt?: {
    promptAudioFileId: string
    promptText: string
  }
}

export interface VoiceDesignParams {
  prompt: string
  previewText: string
  voiceId?: string
}

export interface MusicGenerationParams {
  model: string
  prompt?: string
  lyrics?: string
  audioSetting?: {
    sample_rate?: number
    bitrate?: number
    format?: 'mp3' | 'wav' | 'pcm'
  }
  aigcWatermark?: boolean
  lyricsOptimizer?: boolean
  isInstrumental?: boolean
  referenceAudioBase64?: string
  coverFeatureId?: string
}

export interface AudioProvider {
  readonly name: string
  readonly providerId: string

  textToSpeech(params: TextToSpeechParams): Promise<{ taskId: string; audioBase64?: string }>

  queryAudioTask(
    taskId: string
  ): Promise<{ status: AudioTaskStatus; fileId?: string; error?: string }>

  uploadFile?(file: File, purpose: string): Promise<{ fileId: string }>

  cloneVoice?(params: VoiceCloneParams): Promise<{ voiceId: string; demoAudio?: string }>

  designVoice?(params: VoiceDesignParams): Promise<{ voiceId: string; trialAudio?: string }>

  generateMusic?(
    params: MusicGenerationParams
  ): Promise<{ taskId: string; audioBase64: string }>

  preprocessCoverAudio?(
    audioBase64: string
  ): Promise<{ coverFeatureId: string }>
}
