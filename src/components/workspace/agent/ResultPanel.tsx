import type { AgentApprovalRequest } from '@/types/agent'

interface ResultPanelProps {
  status: 'idle' | 'running' | 'awaiting-approval' | 'completed' | 'failed' | 'rejected'
  finalMessage: string | null
  approval: AgentApprovalRequest | null
  activeTaskId: string | null
}

const statusLabelMap: Record<ResultPanelProps['status'], string> = {
  idle: '空闲',
  running: '执行中',
  'awaiting-approval': '等待确认',
  completed: '已完成',
  failed: '失败',
  rejected: '已拒绝',
}

export function ResultPanel({
  status,
  finalMessage,
  approval,
  activeTaskId,
}: ResultPanelProps) {
  return (
    <section className="rounded-2xl border border-[#3c3c3c] bg-[#252526]/95 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#f2f2f2]">结果与确认</h3>
        <span className="rounded-full border border-[#3d4e67] bg-[#243346] px-3 py-1 text-xs text-[#9ac7ff]">
          {statusLabelMap[status]}
        </span>
      </div>

      {approval ? (
        <div className="mt-4 rounded-2xl border border-[#70561f] bg-[#2f2613] p-4">
          <div className="text-sm font-medium text-[#ffd78a]">{approval.title}</div>
          <p className="mt-2 text-sm leading-6 text-[#d7c08d]">{approval.details}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() =>
                activeTaskId
                  ? window.electronAPI.agent.approveAction(activeTaskId, approval.actionId)
                  : undefined
              }
              disabled={!activeTaskId}
              className="rounded-xl bg-[#c88a28] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#dd9a2e] disabled:cursor-not-allowed disabled:bg-[#6e5733]"
            >
              批准继续
            </button>
            <button
              onClick={() =>
                activeTaskId
                  ? window.electronAPI.agent.rejectAction(activeTaskId, approval.actionId)
                  : undefined
              }
              disabled={!activeTaskId}
              className="rounded-xl border border-[#6b5630] bg-transparent px-4 py-2 text-sm text-[#f2d199] transition hover:bg-[#3a2f18] disabled:cursor-not-allowed disabled:text-[#8b7a58]"
            >
              拒绝
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#343434] bg-[#1f1f20] p-4">
          <p className="text-sm leading-6 text-[#d4d4d4]">
            {finalMessage ?? '任务尚未结束，Agent 会在这里给出最终答复。'}
          </p>
        </div>
      )}
    </section>
  )
}
