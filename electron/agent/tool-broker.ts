import type { MCPServer, MCPTool } from '../../src/types/mcp.ts'
import { MCPClient } from '../../src/lib/mcp/client.ts'
import { LocalToolDispatcher } from './local-tool-dispatcher.ts'

type ClientLike = Pick<MCPClient, 'connect' | 'getServer' | 'callTool'>

export interface ToolBrokerOptions {
  clientFactory?: (server: MCPServer) => ClientLike
  localRootDir?: string
  localTools?: LocalToolDispatcher | null
}

export class ToolBroker {
  private clientFactory: (server: MCPServer) => ClientLike
  private localTools: LocalToolDispatcher | null

  constructor(options: ToolBrokerOptions = {}) {
    this.clientFactory = options.clientFactory ?? ((server) => new MCPClient(server))
    this.localTools =
      options.localTools === undefined
        ? new LocalToolDispatcher({ rootDir: options.localRootDir ?? process.cwd() })
        : options.localTools
  }

  async listTools(servers: MCPServer[]): Promise<MCPTool[]> {
    const tools: MCPTool[] = []
    if (this.localTools) {
      tools.push(...this.localTools.listTools())
    }

    for (const server of servers) {
      const client = this.clientFactory(server)
      await client.connect()
      tools.push(...client.getServer().tools)
    }

    return tools
  }

  async callTool(
    server: MCPServer | null,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (this.localTools?.canHandle(toolName)) {
      return this.localTools.callTool(toolName, args)
    }

    if (!server) {
      throw new Error(`No MCP server is available for tool ${toolName}`)
    }

    const client = this.clientFactory(server)
    await client.connect()
    const result = await client.callTool({ name: toolName, arguments: args })

    if (result.error) {
      throw new Error(result.error)
    }

    return result.result
  }
}
