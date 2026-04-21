import { lazy } from 'react'
import { Music } from 'lucide-react'
import type { AppModuleDefinition } from './types'

export const audioModule: AppModuleDefinition = {
  id: 'audio',
  label: '音频',
  description: '音频合成与声音相关能力的预留模块。',
  category: 'media',
  icon: Music,
  order: 40,
  defaultEnabled: true,
  canDisable: true,
  tags: ['audio', 'tts', 'music'],
  Workspace: lazy(async () => {
    const module = await import('@/components/workspace/AudioWorkspace')
    return { default: module.AudioWorkspace }
  }),
}
