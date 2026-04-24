import type { AppModuleDefinition } from './types'
import { agentModule } from './agent'
import { audioModule } from './audio'
import { chatModule } from './chat'
import { imageModule } from './image'
import { videoModule } from './video'

export const builtInModules: AppModuleDefinition[] = [
  chatModule,
  agentModule,
  imageModule,
  videoModule,
  audioModule,
]
