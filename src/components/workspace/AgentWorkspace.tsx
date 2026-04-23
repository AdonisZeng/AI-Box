import { useEffect, useMemo, useState } from 'react'
import { Bot } from 'lucide-react'
import { useAgentStore, useMCPStore, useSettingsStore } from '@/lib/store'
import { TaskInputPanel } from './agent/TaskInputPanel'
import { ExecutionModeToggle } from './agent/ExecutionModeToggle'
import { PlanTimeline } from './agent/PlanTimeline'
import { SkillPanel } from './agent/SkillPanel'
import { ToolTracePanel } from './agent/ToolTracePanel'
import { ExecutionLogPanel } from './agent/ExecutionLogPanel'
import { ResultPanel } from './agent/ResultPanel'

export function AgentWorkspace() {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<'auto' | 'confirm-external'>('auto')
  const [isStarting, setIsStarting] = useState(false)
  const currentTaskId = useAgentStore((state) => state.currentTaskId)
  const status = useAgentStore((state) => state.status)
  const plan = useAgentStore((state) => state.plan)
  const selectedSkills = useAgentStore((state) => state.selectedSkills)
  const toolCalls = useAgentStore((state) => state.toolCalls)
  const logs = useAgentStore((state) => state.logs)
  const finalMessage = useAgentStore((state) => state.finalMessage)
  const approval = useAgentStore((state) => state.approval)
  const applyEvent = useAgentStore((state) => state.applyEvent)
  const reset = useAgentStore((state) => state.reset)
  const activeProvider = useSettingsStore((state) => state.activeProvider)
  const getProviderConfig = useSettingsStore((state) => state.getProviderConfig)
  const serverConfigs = useMCPStore((state) => state.serverConfigs)

  useEffect(() => {
    return window.electronAPI.agent.onTaskEvent((event) => {
      applyEvent(event)
    })
  }, [applyEvent])

  const provider = getProviderConfig(activeProvider)
  const connectedServerCount = useMemo(
    () => serverConfigs.filter((server) => server.connected).length,
    [serverConfigs]
  )
  const isBusy = isStarting || status === 'running' || status === 'awaiting-approval'

  const handleStart = async () => {
    if (!provider || !prompt.trim() || isBusy) {
      return
    }

    reset()
    setIsStarting(true)
    try {
      await window.electronAPI.agent.startTask({
        prompt: prompt.trim(),
        mode,
        provider,
        mcpServers: serverConfigs,
      })
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <div className="h-10 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center px-3 gap-1">
        <div className="px-3 py-1 bg-[#1e1e1e] text-[#ccc] text-xs rounded-t">
          Agent
        </div>
        <div className="px-3 py-1 text-[#666] text-xs rounded-t">
          MCP + Skill Runtime
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(74,158,255,0.12),_transparent_28%),linear-gradient(180deg,_#1e1e1e_0%,_#181818_100%)]">
        <div className="mx-auto grid max-w-7xl gap-4 p-4 xl:grid-cols-[1.22fr_0.78fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4a9eff]/12">
                <Bot size={22} className="text-[#6fb2ff]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#f2f2f2]">
                  通用助手型 Agent
                </div>
                <p className="mt-1 text-xs text-[#8b8b8b]">
                  可自动发现本地 Skill，调用 MCP 工具，并把工具/脚本结果回流给 LLM 继续规划。
                </p>
              </div>
            </div>

            <TaskInputPanel
              value={prompt}
              providerName={provider?.name ?? '未配置 Provider'}
              connectedServerCount={connectedServerCount}
              isBusy={isBusy}
              onChange={setPrompt}
              onSubmit={handleStart}
            />
            <ExecutionModeToggle mode={mode} onChange={setMode} />
            <PlanTimeline plan={plan} />
            <ToolTracePanel toolCalls={toolCalls} />
            <ExecutionLogPanel logs={logs} />
          </div>

          <div className="space-y-4">
            <SkillPanel selectedSkills={selectedSkills} />
            <ResultPanel
              status={status}
              finalMessage={finalMessage}
              approval={approval}
              activeTaskId={currentTaskId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
