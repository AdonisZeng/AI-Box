interface PlanTimelineProps {
  plan: string[]
}

export function PlanTimeline({ plan }: PlanTimelineProps) {
  return (
    <section className="rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 p-4">
      <h3 className="text-sm font-semibold text-[#f2f2f2]">计划步骤</h3>
      {plan.length === 0 ? (
        <p className="mt-3 text-sm text-[#7c7c7c]">等待规划器生成步骤…</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {plan.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-3 rounded-2xl border border-[#343434] bg-[#1f1f20] px-3 py-3"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4a9eff]/15 text-xs font-semibold text-[#8fc0ff]">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-[#d4d4d4]">{item}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
