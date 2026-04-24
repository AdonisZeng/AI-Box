import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VideoTask } from '@/lib/video/types'

interface VideoState {
  tasks: VideoTask[]
  isGenerating: boolean

  addTask: (task: Omit<VideoTask, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTask: (taskId: string, updates: Partial<VideoTask>) => void
  removeTask: (taskId: string) => void
  clearCompleted: () => void
  setGenerating: (generating: boolean) => void
}

export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      tasks: [],
      isGenerating: false,

      addTask: (task) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const newTask: VideoTask = {
          ...task,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set({ tasks: [newTask, ...get().tasks] })
        return id
      },

      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.taskId === taskId
              ? { ...t, ...updates, updatedAt: Date.now() }
              : t
          ),
        }))
      },

      removeTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.taskId !== taskId),
        }))
      },

      clearCompleted: () => {
        set((state) => ({
          tasks: state.tasks.filter(
            (t) => t.status !== 'Success' && t.status !== 'Fail'
          ),
        }))
      },

      setGenerating: (generating) => {
        set({ isGenerating: generating })
      },
    }),
    {
      name: 'ai-box-video-tasks',
    }
  )
)
