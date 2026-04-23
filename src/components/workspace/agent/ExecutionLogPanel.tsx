interface ExecutionLogPanelProps {
  logs: string[]
}

export function ExecutionLogPanel({ logs }: ExecutionLogPanelProps) {
  return (
    <section className="rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 p-4">
      <h3 className="text-sm font-semibold text-[#f2f2f2]">脚本执行日志</h3>
      <pre className="mt-4 max-h-[340px] overflow-y-auto rounded-2xl border border-[#343434] bg-[#181818] p-4 text-xs leading-6 text-[#b7d2ff]">
        {logs.length === 0 ? '等待日志输出…' : logs.join('\n\n')}
      </pre>
    </section>
  )
}
