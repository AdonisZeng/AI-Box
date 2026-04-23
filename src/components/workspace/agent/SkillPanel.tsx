interface SkillPanelProps {
  selectedSkills: string[]
}

export function SkillPanel({ selectedSkills }: SkillPanelProps) {
  return (
    <section className="rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 p-4">
      <h3 className="text-sm font-semibold text-[#f2f2f2]">选中的 Skill</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {selectedSkills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3d3d3d] bg-[#1f1f20] px-4 py-3 text-sm text-[#7c7c7c]">
            暂未触发 Skill，当前任务会先依赖规划器和 MCP 工具能力。
          </div>
        ) : (
          selectedSkills.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="rounded-full border border-[#4a9eff]/25 bg-[#4a9eff]/12 px-3 py-1 text-xs font-medium text-[#9ac7ff]"
            >
              {skill}
            </span>
          ))
        )}
      </div>
    </section>
  )
}
