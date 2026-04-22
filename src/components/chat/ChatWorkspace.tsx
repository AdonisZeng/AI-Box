import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Square, Plus, Trash2, ChevronDown, Loader2, Sparkles, User, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn, parseThinking } from '@/lib/utils'
import { resolveChatProviderId } from '@/lib/chat/provider-resolution'
import {
  getThinkingBodyClass,
  getThinkingPanelClass,
  getThinkingWrapperClass,
} from './thinking-panel-styles'
import {
  getSessionTabClass,
  getStageShellClass,
  getStageStatusClusterClass,
  getStageToolbarClass,
  getStageWorkspaceBackdropClass,
} from './stage-shell-styles'
import {
  getAvatarClass,
  getMessageBubbleClass,
  getMessageColumnClass,
  getMessageRowClass,
  type ChatVisualRole,
} from './message-surface-styles'
import { useChatStore } from '@/lib/store'
import { useSettingsStore } from '@/lib/store'
import { createProvider, getProviderValidationError, type Message, type ProviderType } from '@/lib/providers'

function useLocalStorageSync(_storeKey: string) {
  const [storageVersion, setStorageVersion] = useState(0)

  useEffect(() => {
    const handleStorageChange = () => {
      setStorageVersion((v) => v + 1)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return storageVersion
}

function useRefreshSettings() {
  const { updateProvider, setActiveProvider } = useSettingsStore()
  const storageVersion = useLocalStorageSync('ai-box-settings')

  useEffect(() => {
    if (storageVersion === 0) return

    try {
      const stored = localStorage.getItem('ai-box-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.state?.providers) {
          parsed.state.providers.forEach((provider: { id: string; [key: string]: unknown }) => {
            const { id, ...updates } = provider
            updateProvider(id as ProviderType, updates)
          })
        }
        if (parsed.state?.activeProvider) {
          setActiveProvider(parsed.state.activeProvider as ProviderType)
        }
      }
    } catch (error) {
      console.error('Failed to refresh settings:', error)
    }
  }, [storageVersion, updateProvider, setActiveProvider])
}

const GREETING_MESSAGE = '你好！我是 AI Box 助手。有什么我可以帮助你的吗？'
const GENERATION_STOPPED_MESSAGE = '已停止生成。'

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export function ChatWorkspace() {
  useRefreshSettings()

  const {
    sessions,
    activeSessionId,
    isGenerating,
    createSession,
    deleteSession,
    setActiveSession,
    addMessage,
    updateMessage,
    updateThinking,
    setThinkingExpanded,
    toggleThinkingExpanded,
    setGenerating,
  } = useChatStore()

  const { activeProvider, providers, getProviderConfig } = useSettingsStore()

  const [input, setInput] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId]
  )
  const chatProviderId = resolveChatProviderId(activeProvider)
  const providerConfig = useMemo(
    () => providers.find((p) => p.id === chatProviderId),
    [providers, chatProviderId]
  )

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages, scrollToBottom])

  // Create initial session if none exists
  useEffect(() => {
    if (!initRef.current && sessions.length === 0) {
      initRef.current = true
      createSession()
    }
  }, [createSession, sessions.length])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const appendAssistantMessage = useCallback(
    (sessionId: string, content: string) => {
      addMessage(sessionId, {
        id: createMessageId(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
      })
    },
    [addMessage]
  )

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !activeSession) return

    const currentProviderConfig = getProviderConfig(chatProviderId)
    if (!currentProviderConfig) {
      appendAssistantMessage(
        activeSession.id,
        `错误: 当前激活的 Provider "${chatProviderId}" 不存在，请检查设置。`
      )
      return
    }

    const validationError = getProviderValidationError(currentProviderConfig)
    if (validationError) {
      appendAssistantMessage(activeSession.id, `错误: ${validationError}`)
      return
    }

    const provider = createProvider(currentProviderConfig)
    if (!provider) {
      appendAssistantMessage(
        activeSession.id,
        `错误: 无法创建 Provider "${currentProviderConfig.name}"，请检查配置。`
      )
      return
    }

    const userMessage: Message = {
      id: createMessageId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    addMessage(activeSession.id, userMessage)
    setInput('')
    setGenerating(true)

    const assistantMessageId = createMessageId()
    addMessage(activeSession.id, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    })

    let fullContent = ''
    let fullThinking = ''
    let hasReasoningContent = false
    let hasThinking = false

    try {
      // Filter out the initial greeting message from conversation history
      const conversationMessages: Message[] = [...activeSession.messages, userMessage]
        .filter((m) => {
          if (m === activeSession.messages[0] && m.role === 'assistant' && m.content === GREETING_MESSAGE) {
            return false
          }
          return true
        })

      await provider.chat(conversationMessages, {
        signal: abortController.signal,
        onChunk: (chunk) => {
          if (abortController.signal.aborted || requestIdRef.current !== requestId) {
            return
          }

          if (!chunk.done) {
            // Handle reasoning_content from LMStudio reasoning separation
            if (chunk.reasoning_content) {
              hasReasoningContent = true
              hasThinking = true
              fullThinking += chunk.reasoning_content
              updateThinking(activeSession.id, assistantMessageId, fullThinking)
              setThinkingExpanded(activeSession.id, assistantMessageId, true)
            }

            // Handle regular content
            if (chunk.content) {
              fullContent += chunk.content
              updateMessage(activeSession.id, assistantMessageId, fullContent)
            }

            // Fallback: if no reasoning_content field, parse thinking tags from content
            if (!hasReasoningContent && chunk.content) {
              const { thinking, response } = parseThinking(fullContent)
              if (thinking !== null) {
                hasThinking = true
                updateThinking(activeSession.id, assistantMessageId, thinking)
                updateMessage(activeSession.id, assistantMessageId, response)
                setThinkingExpanded(activeSession.id, assistantMessageId, true)
              }
            }
          }
        },
      })

      // Final update - ensure thinking is finalized for tag-based parsing
      if (!abortController.signal.aborted && requestIdRef.current === requestId && !hasReasoningContent) {
        const { thinking, response } = parseThinking(fullContent)
        if (thinking !== null) {
          hasThinking = true
          updateThinking(activeSession.id, assistantMessageId, thinking)
          updateMessage(activeSession.id, assistantMessageId, response)
        }
      }

    } catch (error) {
      if (abortController.signal.aborted || isAbortError(error)) {
        if (!fullContent.trim()) {
          updateMessage(activeSession.id, assistantMessageId, GENERATION_STOPPED_MESSAGE)
        }
        return
      }

      updateMessage(
        activeSession.id,
        assistantMessageId,
        `错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }

      if (requestIdRef.current === requestId) {
        setGenerating(false)
        if (hasThinking) {
          setThinkingExpanded(activeSession.id, assistantMessageId, false)
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const testConnection = useCallback(async () => {
    if (!providerConfig || !providerConfig.baseURL) {
      setConnectionStatus('unknown')
      return
    }

    setConnectionStatus('unknown')
    try {
      const response = await fetch(`${providerConfig.baseURL}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      setConnectionStatus(response.ok ? 'connected' : 'disconnected')
    } catch {
      setConnectionStatus('disconnected')
    }
  }, [providerConfig])

  useEffect(() => {
    testConnection()
  }, [testConnection])

  const stopGeneration = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setGenerating(false)
  }

  const handleNewChat = () => {
    createSession()
  }

  const handleDeleteChat = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    deleteSession(sessionId)
  }

  const handleToggleThinking = (messageId: string) => {
    if (activeSession) {
      toggleThinkingExpanded(activeSession.id, messageId)
    }
  }

  const connectionLabel =
    connectionStatus === 'connected'
      ? '已连接'
      : connectionStatus === 'disconnected'
        ? '未连接'
        : '检测中'

  const statusDotClassName =
    connectionStatus === 'connected'
      ? 'bg-green-500 shadow-sm shadow-green-500/50'
      : connectionStatus === 'disconnected'
        ? 'bg-red-500 shadow-sm shadow-red-500/50'
        : 'bg-gray-500'

  return (
    <div className={getStageWorkspaceBackdropClass()}>
      <div className={getStageShellClass()}>
        <div className={getStageToolbarClass()}>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {sessions.slice(0, 8).map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={cn(
                  getSessionTabClass(activeSessionId === session.id),
                  'group min-w-fit cursor-pointer'
                )}
              >
                <span className="max-w-[88px] truncate">{session.title}</span>
                {sessions.length > 1 && (
                  <span
                    onClick={(e) => handleDeleteChat(e, session.id)}
                    className="rounded-full p-0.5 opacity-0 transition-opacity hover:bg-slate-200/80 group-hover:opacity-100 dark:hover:bg-slate-700/60"
                  >
                    <Trash2 size={10} />
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={handleNewChat}
              className={cn(getSessionTabClass(false), 'min-w-fit')}
              aria-label="新建对话"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className={getStageStatusClusterClass()}>
            <span>
              Provider:
              <span className="ml-1 font-medium text-[#4a9eff]">
                {providerConfig?.name || chatProviderId}
              </span>
            </span>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
            <span>
              Model:
              <span className="ml-1 font-medium text-slate-900 dark:text-slate-50">
                {providerConfig?.model || '未设置'}
              </span>
            </span>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full', statusDotClassName)} />
              <span>{connectionLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100/70 transition-colors duration-200 dark:bg-transparent">
            {activeSession?.messages.map((message) => {
              const visualRole: ChatVisualRole = message.role === 'user' ? 'user' : 'assistant'

              return (
                <div
                  key={message.id}
                  className={getMessageRowClass(visualRole)}
                >
                  <div className={getAvatarClass(visualRole)}>
                    {visualRole === 'assistant' ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>

                  <div className={getMessageColumnClass(visualRole)}>
                    {message.thinking !== undefined && message.thinking !== null && (
                      <div className="w-full">
                        <button
                          onClick={() => handleToggleThinking(message.id)}
                          className={cn(
                            'flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 px-3 py-1.5 text-xs font-medium text-slate-500',
                            'transition-all duration-200 hover:scale-105 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 active:scale-95',
                            'dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
                          )}
                        >
                          <Brain className="h-3.5 w-3.5" />
                          <span>思考过程</span>
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 transition-transform duration-200',
                              message.thinkingExpanded ? 'rotate-180' : ''
                            )}
                          />
                        </button>

                        <div className={getThinkingWrapperClass(!!message.thinkingExpanded)}>
                          <div className={getThinkingPanelClass()}>
                            <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 pt-4 pb-2 text-[11px] text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                              {isGenerating && message.id === activeSession?.messages[activeSession.messages.length - 1]?.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>模型推理中...</span>
                                </>
                              ) : (
                                <>
                                  <Brain className="h-3 w-3" />
                                  <span>思考完成</span>
                                </>
                              )}
                            </div>
                            <div className={getThinkingBodyClass()}>
                              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-500 dark:text-slate-300">
                                {message.thinking}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={getMessageBubbleClass(visualRole)}>
                      {message.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '')
                              const isInline = !match && !className
                              return !isInline ? (
                                <SyntaxHighlighter
                                  style={oneDark as Record<string, React.CSSProperties>}
                                  language={match?.[1] || 'text'}
                                  PreTag="div"
                                  className="rounded mt-2 !bg-[#1e1e1e] !p-3 text-xs"
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code
                                  className={cn(
                                    'rounded bg-[#1e1e1e] px-1 py-0.5 text-[#4a9eff]',
                                    className
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              )
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : isGenerating && message.role === 'assistant' ? (
                        <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Loader2 size={14} className="animate-spin" />
                          <span>生成中...</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200 bg-white/85 backdrop-blur-sm transition-colors duration-200 dark:border-[#1E293B] dark:bg-[#0F172A]/50">
            <div className="relative flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Shift+Enter 换行)"
                className={cn(
                  'w-full rounded-xl px-4 py-3.5 pr-12 border-2',
                  'bg-white text-slate-900 placeholder:text-slate-400 border-slate-200',
                  'dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:placeholder-[#64748b]',
                  'dark:border-transparent',
                  'focus:outline-none',
                  'transition-all duration-200 ease-out',
                  'resize-none min-h-[48px] max-h-[120px]',
                  'focus:border-[#4a9eff] focus:shadow-lg focus:shadow-[#4a9eff]/10',
                  'hover:border-slate-300 dark:hover:border-[#334155]'
                )}
                rows={1}
              />
              {input.length > 0 && (
                <div className="absolute bottom-2 right-16 text-xs text-slate-400 dark:text-[#475569]">
                  {input.length}
                </div>
              )}
              {isGenerating ? (
                <button
                  onClick={stopGeneration}
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'bg-[#dc2626] hover:bg-[#b91c1c]',
                    'text-white',
                    'shadow-lg shadow-[#dc2626]/30',
                    'transition-all duration-200',
                    'hover:scale-105 active:scale-95'
                  )}
                  title="停止生成"
                >
                  <Square size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'bg-gradient-to-br from-[#4a9eff] to-[#3b82f6]',
                    'disabled:from-[#334155] disabled:to-[#1E293B]',
                    'text-white disabled:text-[#64748b]',
                    'shadow-lg',
                    'transition-all duration-200 ease-out',
                    'hover:scale-105 hover:shadow-xl hover:shadow-[#4a9eff]/30',
                    'active:scale-95',
                    'disabled:hover:scale-100 disabled:hover:shadow-lg'
                  )}
                  title="发送"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
