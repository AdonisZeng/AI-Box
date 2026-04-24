import { lazy } from 'react'
import { Image } from 'lucide-react'
import type { AppModuleDefinition } from './types'

export const imageModule: AppModuleDefinition = {
  id: 'image',
  label: '图片',
  description: '图片生成与相关处理能力的模块。',
  category: 'media',
  icon: Image,
  order: 25,
  defaultEnabled: true,
  canDisable: true,
  tags: ['image', 'generation', 't2i', 'i2i'],
  Workspace: lazy(async () => {
    const module = await import('@/components/workspace/ImageWorkspace')
    return { default: module.ImageWorkspace }
  }),
}
