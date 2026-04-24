import type {
  VideoProvider,
  TextToVideoParams,
  ImageToVideoParams,
  VideoAgentParams,
  VideoTask,
} from '../types'

export class MiniMaxVideoProvider implements VideoProvider {
  name = 'MiniMax'
  providerId = 'minimax'
  private videoBaseURL: string
  private headers: Record<string, string>

  constructor(apiKey: string, baseURL: string) {
    this.videoBaseURL = baseURL.replace(/\/anthropic\/?$/, '') || 'https://api.minimaxi.com'
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
    let url = `${this.videoBaseURL}${path}`
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

  async textToVideo(params: TextToVideoParams): Promise<{ taskId: string }> {
    const body: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
    }
    if (params.duration !== undefined) body.duration = params.duration
    if (params.resolution) body.resolution = params.resolution
    if (params.promptOptimizer !== undefined) body.prompt_optimizer = params.promptOptimizer

    const data = await this.request<{ task_id: string }>('POST', '/v1/video_generation', body)
    return { taskId: data.task_id }
  }

  async imageToVideo(params: ImageToVideoParams): Promise<{ taskId: string }> {
    const body: Record<string, unknown> = {
      model: params.model,
      first_frame_image: params.imageUrl,
    }
    if (params.prompt) body.prompt = params.prompt
    if (params.duration !== undefined) body.duration = params.duration
    if (params.resolution) body.resolution = params.resolution
    if (params.promptOptimizer !== undefined) body.prompt_optimizer = params.promptOptimizer

    const data = await this.request<{ task_id: string }>('POST', '/v1/video_generation', body)
    return { taskId: data.task_id }
  }

  async createVideoAgent(params: VideoAgentParams): Promise<{ taskId: string }> {
    const body: Record<string, unknown> = {
      template_id: params.templateId,
    }
    if (params.textInputs?.length) {
      body.text_inputs = params.textInputs.map((v) => ({ value: v }))
    }
    if (params.mediaInputs?.length) {
      body.media_inputs = params.mediaInputs.map((v) => ({ value: v }))
    }

    const data = await this.request<{ task_id: string }>('POST', '/v1/video_template_generation', body)
    return { taskId: data.task_id }
  }

  async queryVideoTask(
    taskId: string
  ): Promise<Pick<VideoTask, 'status' | 'videoUrl' | 'error'>> {
    const data = await this.request<{
      status: string
      video_url?: string
      base_resp?: { status_msg: string }
    }>('GET', '/v1/query/video_generation', undefined, { task_id: taskId })

    return {
      status: this.normalizeStatus(data.status),
      videoUrl: data.video_url,
      error: data.status === 'Fail' || data.status === 'failed'
        ? data.base_resp?.status_msg
        : undefined,
    }
  }

  async queryAgentTask(
    taskId: string
  ): Promise<Pick<VideoTask, 'status' | 'videoUrl' | 'error'>> {
    const data = await this.request<{
      status: string
      video_url?: string
      base_resp?: { status_msg: string }
    }>('GET', '/v1/query/video_template_generation', undefined, { task_id: taskId })

    return {
      status: this.normalizeStatus(data.status),
      videoUrl: data.video_url,
      error: data.status === 'Fail' ? data.base_resp?.status_msg : undefined,
    }
  }

  private normalizeStatus(raw: string): VideoTask['status'] {
    const s = String(raw).toLowerCase()
    if (s === 'preparing') return 'Preparing'
    if (s === 'processing') return 'Processing'
    if (s === 'success') return 'Success'
    if (s === 'fail' || s === 'failed') return 'Fail'
    return 'Processing'
  }
}
