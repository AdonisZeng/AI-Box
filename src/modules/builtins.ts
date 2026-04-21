import type { AppModuleDefinition } from './types'
import { agentModule } from './agent'
import { audioModule } from './audio'
import { chatModule } from './chat'
import { mcpModule } from './mcp'
import { videoModule } from './video'

export const builtInModules: AppModuleDefinition[] = [
  chatModule,
  agentModule,
  videoModule,
  audioModule,
  mcpModule,
]
