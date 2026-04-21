import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ThinkingParseResult {
  thinking: string | null
  response: string
}

export function parseThinking(content: string): ThinkingParseResult {
  // First try standard markdown thinking tags
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
  const parts = content.split(thinkRegex)

  if (parts.length > 1) {
    const thinking = parts[1]?.trim() || ''
    const response = parts[2]?.trim() || ''
    return { thinking: thinking || null, response }
  }

  // Handle <thinking_start> and <thinking_end> markers (Qwen3 format)
  const qwenThinkRegex = /<thinking_start>([\s\S]*?)<thinking_end>/gi
  const qwenParts = content.split(qwenThinkRegex)

  if (qwenParts.length > 1) {
    const thinking = qwenParts[1]?.trim() || ''
    const response = qwenParts[2]?.trim() || ''
    return { thinking: thinking || null, response }
  }

  return { thinking: null, response: content }
}
