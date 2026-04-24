import type {
  ImageProvider,
  TextToImageParams,
  ImageToImageParams,
} from '../types'

export class MiniMaxImageProvider implements ImageProvider {
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
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
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

  private buildBody(params: TextToImageParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
    }

    if (params.aspectRatio) body.aspect_ratio = params.aspectRatio
    if (params.width !== undefined) body.width = params.width
    if (params.height !== undefined) body.height = params.height
    if (params.responseFormat) body.response_format = params.responseFormat
    if (params.n !== undefined) body.n = params.n
    if (params.seed !== undefined) body.seed = params.seed
    if (params.promptOptimizer !== undefined) body.prompt_optimizer = params.promptOptimizer
    if (params.aigcWatermark !== undefined) body.aigc_watermark = params.aigcWatermark
    if (params.style) {
      body.style = {
        style_type: params.style.styleType,
        style_weight: params.style.styleWeight ?? 0.8,
      }
    }

    return body
  }

  private async generate(
    body: Record<string, unknown>
  ): Promise<{ taskId: string; imageUrls?: string[]; imageBase64List?: string[] }> {
    const data = await this.request<{
      id: string
      data?: { image_urls?: string[]; image_base64?: string[] }
      metadata?: { success_count?: number; failed_count?: number }
      base_resp?: { status_msg: string }
    }>('POST', '/v1/image_generation', body)

    return {
      taskId: data.id,
      imageUrls: data.data?.image_urls,
      imageBase64List: data.data?.image_base64,
    }
  }

  async textToImage(
    params: TextToImageParams
  ): Promise<{ taskId: string; imageUrls?: string[]; imageBase64List?: string[] }> {
    return this.generate(this.buildBody(params))
  }

  async imageToImage(
    params: ImageToImageParams
  ): Promise<{ taskId: string; imageUrls?: string[]; imageBase64List?: string[] }> {
    const body = this.buildBody(params)
    body.subject_reference = params.subjectReference
    return this.generate(body)
  }
}
