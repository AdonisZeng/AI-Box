export type ProviderType = 'lmstudio' | 'openai' | 'anthropic' | 'custom'

export type APICompatibility = 'openai' | 'anthropic' | 'custom'

export interface ProviderConfig {
  id: ProviderType
  name: string
  baseURL: string
  apiKey: string
  model: string
  apiType: APICompatibility
  enabled: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string
  thinkingExpanded?: boolean
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
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
