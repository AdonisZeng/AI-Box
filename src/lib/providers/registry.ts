import type { ProviderConfig, LLMProvider, ProviderCategory } from './types'
import { lmstudioDefinition } from './lmstudio'
import { openaiDefinition } from './openai'
import { anthropicDefinition } from './anthropic'
import { customDefinition } from './custom'
import { minimaxDefinition } from './minimax'

export interface ProviderDefinition {
  id: string
  name: string
  getDefaultConfig(): ProviderConfig
  validateConfig(config: ProviderConfig): string | null
  createProvider(config: ProviderConfig): LLMProvider | null
}

export const providerRegistry = [
  lmstudioDefinition,
  openaiDefinition,
  anthropicDefinition,
  customDefinition,
  minimaxDefinition,
] as const

export type ProviderType = (typeof providerRegistry)[number]['id']

const registryMap = new Map<string, ProviderDefinition>(
  providerRegistry.map((def) => [def.id, def])
)

export const CATEGORY_PROVIDER_MAP: Record<ProviderCategory, ProviderType[]> = {
  text: ['lmstudio', 'openai', 'anthropic', 'custom', 'minimax'],
  image: ['minimax', 'custom'],
  video: ['minimax', 'custom'],
  voice: ['minimax', 'custom'],
  music: ['minimax', 'custom'],
}

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  text: '文本生成',
  image: '图片生成',
  video: '视频生成',
  voice: '语音合成',
  music: '音乐生成',
}

export function getProviderDefinition(id: string): ProviderDefinition | undefined {
  return registryMap.get(id)
}

export function getAllProviderDefinitions(): ProviderDefinition[] {
  return [...providerRegistry]
}

export function getDefaultProviders(): ProviderConfig[] {
  return providerRegistry.map((def) => def.getDefaultConfig())
}

export function getProviderValidationError(config: ProviderConfig): string | null {
  if (!config.enabled) {
    return `${config.name} 当前已禁用，请先在设置中启用后再试。`
  }
  const definition = getProviderDefinition(config.id)
  if (!definition) {
    return `未知的 Provider 类型: ${config.id}`
  }
  return definition.validateConfig(config)
}

export function createProvider(config: ProviderConfig): LLMProvider | null {
  const validationError = getProviderValidationError(config)
  if (validationError) {
    return null
  }
  const definition = getProviderDefinition(config.id)
  if (!definition) {
    return null
  }
  return definition.createProvider(config)
}

export function isValidProviderType(value: unknown): value is ProviderType {
  return typeof value === 'string' && registryMap.has(value)
}

export function getProviderTypeList(): string[] {
  return providerRegistry.map((def) => def.id)
}

export function getProvidersForCategory(category: ProviderCategory): ProviderType[] {
  return CATEGORY_PROVIDER_MAP[category]
}
