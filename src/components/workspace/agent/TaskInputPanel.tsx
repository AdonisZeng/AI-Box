interface TaskInputPanelProps {
  value: string
  providerName: string
  connectedServerCount: number
  isBusy: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export function TaskInputPanel({
  value,
  providerName,
  connectedServerCount,
  isBusy,
  onChange,
  onSubmit,
}: TaskInputPanelProps) {
  return (
    <section className="rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#f2f2f2]">任务输入</h3>
          <p className="mt-1 text-xs text-[#8b8b8b]">
            当前 Provider：{providerName}，已连接 MCP 服务：{connectedServerCount}
          </p>
        </div>
        <div className="rounded-full border border-[#4a9eff]/30 bg-[#4a9eff]/10 px-3 py-1 text-xs text-[#8fc0ff]">
          Agent Loop
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-4 min-h-[148px] w-full resize-y rounded-2xl border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-3 text-sm leading-6 text-[#d4d4d4] outline-none transition focus:border-[#4a9eff] focus:ring-2 focus:ring-[#4a9eff]/20"
        placeholder="例如：读取 package.json，总结当前项目结构，并说明 MCP 服务与 Skill 如何协同完成任务。"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-[#6f6f6f]">
          工具调用结果、Skill 执行结果和脚本输出会自动回流到 LLM，继续下一轮决策。
        </p>
        <button
          onClick={onSubmit}
          disabled={isBusy || !value.trim()}
          className="rounded-xl bg-[#4a9eff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#62abff] disabled:cursor-not-allowed disabled:bg-[#355a88] disabled:text-[#b8c9df]"
        >
          {isBusy ? '执行中…' : '开始执行'}
        </button>
      </div>
    </section>
  )
}
