import { lazy } from 'react'
import { Video } from 'lucide-react'
import type { AppModuleDefinition } from './types'

export const videoModule: AppModuleDefinition = {
  id: 'video',
  label: '视频',
  description: '视频生成与相关处理能力的预留模块。',
  category: 'media',
  icon: Video,
  order: 30,
  defaultEnabled: true,
  canDisable: true,
  tags: ['video', 'generation'],
  Workspace: lazy(async () => {
    const module = await import('@/components/workspace/VideoWorkspace')
    return { default: module.VideoWorkspace }
  }),
}
