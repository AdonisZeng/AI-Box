import type { MCPServer, MCPTool } from '../../src/types/mcp.ts'
import { MCPClient } from '../../src/lib/mcp/client.ts'

type ClientLike = Pick<MCPClient, 'connect' | 'getServer' | 'callTool'>

export interface ToolBrokerOptions {
  clientFactory?: (server: MCPServer) => ClientLike
}

export class ToolBroker {
  private clientFactory: (server: MCPServer) => ClientLike

  constructor(options: ToolBrokerOptions = {}) {
    this.clientFactory = options.clientFactory ?? ((server) => new MCPClient(server))
  }

  async listTools(servers: MCPServer[]): Promise<MCPTool[]> {
    const tools: MCPTool[] = []

    for (const server of servers) {
      const client = this.clientFactory(server)
      await client.connect()
      tools.push(...client.getServer().tools)
    }

    return tools
  }

  async callTool(
    server: MCPServer,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.clientFactory(server)
    await client.connect()
    const result = await client.callTool({ name: toolName, arguments: args })

    if (result.error) {
      throw new Error(result.error)
    }

    return result.result
  }
}
