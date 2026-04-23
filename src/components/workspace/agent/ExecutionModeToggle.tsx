interface ExecutionModeToggleProps {
  mode: 'auto' | 'confirm-external'
  onChange: (mode: 'auto' | 'confirm-external') => void
}

const modes: Array<{
  id: 'auto' | 'confirm-external'
  label: string
  description: string
}> = [
  {
    id: 'auto',
    label: '自动执行',
    description: '默认模式，Agent 会直接调用已允许的 MCP 工具和 Skill。',
  },
  {
    id: 'confirm-external',
    label: '外部操作先确认',
    description: '凡是工具调用或脚本执行都会暂停，等待你批准后继续。',
  },
]

export function ExecutionModeToggle({ mode, onChange }: ExecutionModeToggleProps) {
  return (
    <section className="rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 p-4">
      <h3 className="text-sm font-semibold text-[#f2f2f2]">执行模式</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {modes.map((item) => {
          const active = item.id === mode
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? 'border-[#4a9eff] bg-[#4a9eff]/12 shadow-[0_0_0_1px_rgba(74,158,255,0.25)]'
                  : 'border-[#3c3c3c] bg-[#1f1f20] hover:border-[#5a5a5a]'
              }`}
            >
              <div className="text-sm font-medium text-[#e8e8e8]">{item.label}</div>
              <p className="mt-2 text-xs leading-5 text-[#8b8b8b]">{item.description}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
