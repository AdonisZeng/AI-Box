import { lazy } from 'react'
import { Bot } from 'lucide-react'
import type { AppModuleDefinition } from './types'

export const mcpModule: AppModuleDefinition = {
  id: 'mcp',
  label: 'MCP',
  description: '连接、启停并查看 MCP 服务器与工具的集成模块。',
  category: 'integration',
  icon: Bot,
  order: 50,
  defaultEnabled: true,
  canDisable: true,
  tags: ['mcp', 'tools', 'integration'],
  Workspace: lazy(async () => {
    const module = await import('@/components/mcp/MCPWorkspace')
    return { default: module.MCPWorkspace }
  }),
}
