import { Music } from 'lucide-react'

export function AudioWorkspace() {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="h-10 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center px-3 gap-1">
        <div className="px-3 py-1 bg-[#1e1e1e] text-[#ccc] text-xs rounded-t">
          音频合成
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#2d2d2d] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Music size={32} className="text-[#4a9eff]" />
          </div>
          <h3 className="text-[#ccc] text-lg font-medium mb-2">音频合成工作区</h3>
          <p className="text-[#666] text-sm max-w-xs">
            音频合成模块预留接口，一期暂不实现
          </p>
        </div>
      </div>
    </div>
  )
}
