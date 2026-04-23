export type APICompatibility = 'openai' | 'anthropic' | 'custom'

export interface MiniMaxSubModelConfig {
  text: string
  image: string
  video: string
  speech: string
  music: string
}

export interface ProviderConfig {
  id: string
  name: string
  baseURL: string
  apiKey: string
  model: string
  apiType: APICompatibility
  enabled: boolean
  miniMaxConfig?: MiniMaxSubModelConfig
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string
  thinkingExpanded?: boolean
  timestamp: number
}

export interface StreamChunk {
  content: string
  done: boolean
  reasoning_content?: string
}

export interface ChatOptions {
  onChunk?: (chunk: StreamChunk) => void
  signal?: AbortSignal
}

export interface LLMProvider {
  name: string
  chat(messages: Message[], options?: ChatOptions): Promise<string>
  getDefaultModel(): string
}
