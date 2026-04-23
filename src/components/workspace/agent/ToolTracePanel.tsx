interface ToolTracePanelProps {
  toolCalls: Array<{
    name: string
    result: unknown
    summary?: string
  }>
}

function stringifyResult(result: unknown): string {
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

export function ToolTracePanel({ toolCalls }: ToolTracePanelProps) {
  return (
    <section className="rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 p-4">
      <h3 className="text-sm font-semibold text-[#f2f2f2]">MCP 调用</h3>
      <div className="mt-4 space-y-3">
        {toolCalls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3d3d3d] bg-[#1f1f20] px-4 py-3 text-sm text-[#7c7c7c]">
            还没有 MCP 调用记录。
          </div>
        ) : (
          toolCalls.map((tool, index) => (
            <article
              key={`${tool.name}-${index}`}
              className="rounded-2xl border border-[#343434] bg-[#1f1f20] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[#e8e8e8]">{tool.name}</div>
                  {tool.summary ? (
                    <p className="mt-1 text-xs text-[#8b8b8b]">{tool.summary}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-[#2b3e59] px-2.5 py-1 text-[11px] text-[#9ac7ff]">
                  已完成
                </span>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-[#181818] p-3 text-xs leading-5 text-[#b8d4ff]">
                {stringifyResult(tool.result)}
              </pre>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
