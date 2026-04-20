import { Bot } from 'lucide-react'

export function AgentWorkspace() {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="h-10 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center px-3 gap-1">
        <div className="px-3 py-1 bg-[#1e1e1e] text-[#ccc] text-xs rounded-t">
          Agent
        </div>
        <div className="px-3 py-1 text-[#666] text-xs rounded-t cursor-pointer hover:text-[#aaa]">
          + 新建 Agent
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#2d2d2d] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-[#4a9eff]" />
          </div>
          <h3 className="text-[#ccc] text-lg font-medium mb-2">Agent 工作区</h3>
          <p className="text-[#666] text-sm max-w-xs">
            在此处配置和管理 Agent 技能，MCP 工具将作为技能注册到 Agent
          </p>
        </div>
      </div>
    </div>
  )
}
