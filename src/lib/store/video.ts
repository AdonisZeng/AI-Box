import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VideoTask } from '@/lib/video/types'

const MAX_TASKS = 50

interface VideoState {
  tasks: VideoTask[]

  addTask: (task: Omit<VideoTask, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTask: (taskId: string, updates: Partial<VideoTask>) => void
  removeTask: (taskId: string) => void
  clearCompleted: () => void
}

export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (task) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const newTask: VideoTask = {
          ...task,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        const next = [newTask, ...get().tasks]
        if (next.length > MAX_TASKS) {
          next.pop()
        }
        set({ tasks: next })
        return id
      },

      updateTask: (taskId, updates) => {
        set((state) => {
          let changed = false
          const next = state.tasks.map((t) => {
            if (t.taskId !== taskId) return t
            const updated = { ...t, ...updates, updatedAt: Date.now() }
            if (
              updated.status !== t.status ||
              updated.videoUrl !== t.videoUrl ||
              updated.error !== t.error
            ) {
              changed = true
            }
            return updated
          })
          return changed ? { tasks: next } : state
        })
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
    }),
    {
      name: 'ai-box-video-tasks',
    }
  )
)
