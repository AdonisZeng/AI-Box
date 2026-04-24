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

  constructor(private apiKey: string, private baseURL: string) {}

  private getVideoBaseURL(): string {
    // Text API uses /anthropic suffix; video API uses the root domain
    return this.baseURL.replace(/\/anthropic\/?$/, '') || 'https://api.minimaxi.com'
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }
  }

  async textToVideo(params: TextToVideoParams): Promise<{ taskId: string }> {
    const body: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
    }
    if (params.duration !== undefined) body.duration = params.duration
    if (params.resolution) body.resolution = params.resolution
    if (params.promptOptimizer !== undefined) body.prompt_optimizer = params.promptOptimizer

    const res = await fetch(`${this.getVideoBaseURL()}/v1/video_generation`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`MiniMax T2V 请求失败: ${res.status}`)
    }

    const data = await res.json()
    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '未知错误')
    }
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

    const res = await fetch(`${this.getVideoBaseURL()}/v1/video_generation`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`MiniMax I2V 请求失败: ${res.status}`)
    }

    const data = await res.json()
    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '未知错误')
    }
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

    const res = await fetch(`${this.getVideoBaseURL()}/v1/video_template_generation`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`MiniMax 视频Agent 请求失败: ${res.status}`)
    }

    const data = await res.json()
    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '未知错误')
    }
    return { taskId: data.task_id }
  }

  async queryVideoTask(
    taskId: string
  ): Promise<Pick<VideoTask, 'status' | 'videoUrl' | 'error'>> {
    const res = await fetch(
      `${this.getVideoBaseURL()}/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!res.ok) {
      throw new Error(`MiniMax 视频查询失败: ${res.status}`)
    }

    const data = await res.json()
    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '未知错误')
    }

    return {
      status: this.normalizeStatus(data.status),
      videoUrl: data.video_url,
      error: data.status === 'Fail' || data.status === 'failed' ? data.base_resp?.status_msg : undefined,
    }
  }

  async queryAgentTask(
    taskId: string
  ): Promise<Pick<VideoTask, 'status' | 'videoUrl' | 'error'>> {
    const res = await fetch(
      `${this.getVideoBaseURL()}/v1/query/video_template_generation?task_id=${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    )

    if (!res.ok) {
      throw new Error(`MiniMax 视频Agent查询失败: ${res.status}`)
    }

    const data = await res.json()
    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '未知错误')
    }

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
