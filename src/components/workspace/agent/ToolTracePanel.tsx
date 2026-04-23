interface ToolTracePanelProps {
  toolCalls: Array<{
    name: string
    status: 'running' | 'success' | 'error'
    arguments?: Record<string, unknown>
    result?: unknown
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
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    tool.status === 'running'
                      ? 'bg-[#4b3a16] text-[#ffd48d]'
                      : tool.status === 'error'
                        ? 'bg-[#4a2020] text-[#ffb3b3]'
                        : 'bg-[#2b3e59] text-[#9ac7ff]'
                  }`}
                >
                  {tool.status === 'running'
                    ? '执行中'
                    : tool.status === 'error'
                      ? '失败'
                      : '已完成'}
                </span>
              </div>
              {tool.arguments ? (
                <div className="mt-3">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#7c8ea8]">
                    Arguments
                  </div>
                  <pre className="overflow-x-auto rounded-xl bg-[#181818] p-3 text-xs leading-5 text-[#d4d4d4]">
                    {stringifyResult(tool.arguments)}
                  </pre>
                </div>
              ) : null}
              <div className="mt-3">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#7c8ea8]">
                  Result
                </div>
                <pre className="overflow-x-auto rounded-xl bg-[#181818] p-3 text-xs leading-5 text-[#b8d4ff]">
                  {tool.result === undefined ? '等待结果输出…' : stringifyResult(tool.result)}
                </pre>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
