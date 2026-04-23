import type { ProviderConfig, LLMProvider } from './types'
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
