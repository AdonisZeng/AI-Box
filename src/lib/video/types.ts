export type VideoTaskStatus = 'Preparing' | 'Processing' | 'Success' | 'Fail'

export type VideoTaskType = 't2v' | 'i2v' | 'agent'

export interface VideoTask {
  id: string
  taskId: string
  providerId: string
  type: VideoTaskType
  status: VideoTaskStatus
  prompt?: string
  imageUrl?: string
  videoUrl?: string
  error?: string
  model?: string
  createdAt: number
  updatedAt: number
}

export interface TextToVideoParams {
  prompt: string
  model: string
  duration?: number
  resolution?: string
  promptOptimizer?: boolean
}

export interface ImageToVideoParams extends TextToVideoParams {
  imageUrl: string
}

export interface VideoAgentParams {
  templateId: string
  textInputs?: string[]
  mediaInputs?: string[]
}

export interface VideoProvider {
  readonly name: string
  readonly providerId: string

  textToVideo(params: TextToVideoParams): Promise<{ taskId: string }>
  imageToVideo(params: ImageToVideoParams): Promise<{ taskId: string }>
  createVideoAgent(params: VideoAgentParams): Promise<{ taskId: string }>

  /** Query T2V / I2V task status */
  queryVideoTask(taskId: string): Promise<Pick<VideoTask, 'status' | 'videoUrl' | 'error'>>

  /** Query video-agent task status */
  queryAgentTask(taskId: string): Promise<Pick<VideoTask, 'status' | 'videoUrl' | 'error'>>
}
