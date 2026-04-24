export type ImageTaskStatus = 'Preparing' | 'Processing' | 'Success' | 'Fail'

export type ImageTaskType = 't2i' | 'i2i'

export interface ImageTask {
  id: string
  taskId: string
  providerId: string
  type: ImageTaskType
  status: ImageTaskStatus
  prompt: string
  imageUrls?: string[]
  imageBase64List?: string[]
  sourceImageUrl?: string
  model: string
  error?: string
  createdAt: number
  updatedAt: number
}

export interface TextToImageParams {
  prompt: string
  model: string
  aspectRatio?: string
  width?: number
  height?: number
  responseFormat?: 'url' | 'base64'
  n?: number
  seed?: number
  promptOptimizer?: boolean
  aigcWatermark?: boolean
  style?: { styleType: string; styleWeight?: number }
}

export interface ImageToImageParams extends TextToImageParams {
  subjectReference: { type: string; imageFile: string }[]
}

export interface ImageProvider {
  readonly name: string
  readonly providerId: string

  textToImage(
    params: TextToImageParams
  ): Promise<{ taskId: string; imageUrls?: string[]; imageBase64List?: string[] }>

  imageToImage(
    params: ImageToImageParams
  ): Promise<{ taskId: string; imageUrls?: string[]; imageBase64List?: string[] }>
}
