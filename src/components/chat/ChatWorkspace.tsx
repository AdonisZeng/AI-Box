import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Square, Plus, Trash2, ChevronDown, Loader2, Sparkles, User, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn, parseThinking } from '@/lib/utils'
import { useChatStore } from '@/lib/store'
import { useSettingsStore } from '@/lib/store'
import { createProvider, type Message } from '@/lib/providers'

const GREETING_MESSAGE = '你好！我是 AI Box 助手。有什么我可以帮助你的吗？'

export function ChatWorkspace() {
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
    toggleThinkingExpanded,
    setGenerating,
  } = useChatStore()

  const { activeProvider, providers, getProviderConfig } = useSettingsStore()

  const providerConfig = useMemo(
    () => providers.find((p) => p.id === activeProvider),
    [providers, activeProvider]
  )

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId]
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
      createSession(activeProvider)
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !activeSession) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    addMessage(activeSession.id, userMessage)
    setInput('')
    setGenerating(true)

    const currentProviderConfig = getProviderConfig(activeProvider)
    if (!currentProviderConfig) {
      setGenerating(false)
      return
    }

    const provider = createProvider(currentProviderConfig)
    if (!provider) {
      setGenerating(false)
      return
    }

    const assistantMessageId = (Date.now() + 1).toString()
    addMessage(activeSession.id, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    })

    let fullContent = ''
    let fullThinking = ''
    let hasReasoningContent = false

    try {
      // Filter out the initial greeting message from conversation history
      const conversationMessages: Message[] = [...activeSession.messages, userMessage]
        .filter((m) => {
          if (m === activeSession.messages[0] && m.role === 'assistant' && m.content === GREETING_MESSAGE) {
            return false
          }
          return true
        })

      await provider.chat(
        conversationMessages,
        (chunk) => {
          if (!chunk.done) {
            // Handle reasoning_content from LMStudio reasoning separation
            if (chunk.reasoning_content) {
              hasReasoningContent = true
              fullThinking += chunk.reasoning_content
              updateThinking(activeSession.id, assistantMessageId, fullThinking)
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
                updateThinking(activeSession.id, assistantMessageId, thinking)
                updateMessage(activeSession.id, assistantMessageId, response)
              }
            }
          }
        }
      )

      // Final update - ensure thinking is finalized for tag-based parsing
      if (!hasReasoningContent) {
        const { thinking, response } = parseThinking(fullContent)
        if (thinking !== null) {
          updateThinking(activeSession.id, assistantMessageId, thinking)
          updateMessage(activeSession.id, assistantMessageId, response)
        }
      }

    } catch (error) {
      updateMessage(
        activeSession.id,
        assistantMessageId,
        `错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }

    setGenerating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const stopGeneration = () => {
    setGenerating(false)
  }

  const handleNewChat = () => {
    createSession(activeProvider)
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

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="h-10 bg-[#0F172A]/50 border-b border-[#1E293B] flex items-center px-2 gap-1 overflow-x-auto">
        {sessions.slice(0, 8).map((session) => (
          <div
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all duration-200 group min-w-fit',
              activeSessionId === session.id
                ? 'bg-[#1E293B] text-[#F8FAFC] shadow-md'
                : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1E293B]/50'
            )}
          >
            <span className="max-w-[80px] truncate">{session.title}</span>
            {sessions.length > 1 && (
              <button
                onClick={(e) => handleDeleteChat(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#334155] transition-opacity"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1 px-2 py-1.5 text-[#64748b] text-xs rounded-lg hover:text-[#94a3b8] hover:bg-[#1E293B]/50 transition-all duration-200"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Provider & Model Badge */}
      <div className="h-9 bg-[#1E293B]/50 border-b border-[#1E293B] flex items-center px-4 gap-3">
        <div className="h-7 bg-[#1E293B] border border-[#334155] rounded-full px-4 flex items-center gap-3">
          <span className="text-xs text-[#64748b]">
            Provider:
            <span className="text-[#4a9eff] font-medium ml-1">
              {providerConfig?.name || activeProvider}
            </span>
          </span>
          <div className="w-px h-3 bg-[#334155]" />
          <span className="text-xs text-[#64748b]">
            Model:
            <span className="text-[#F8FAFC] font-medium ml-1">
              {providerConfig?.model || '未设置'}
            </span>
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeSession?.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-4',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-semibold transition-transform duration-200 hover:scale-105',
                message.role === 'assistant'
                  ? 'bg-gradient-to-br from-[#4a9eff] to-[#3b82f6] text-white shadow-lg shadow-[#4a9eff]/20'
                  : 'bg-gradient-to-br from-[#22C55E] to-[#16a34a] text-white shadow-lg shadow-[#22C55E]/20'
              )}
            >
              {message.role === 'assistant' ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="max-w-[65%] flex flex-col gap-2">
              {/* Thinking Section */}
              {message.thinking !== undefined && message.thinking !== null && (
                <div className="mb-3">
                  <button
                    onClick={() => handleToggleThinking(message.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
                      'bg-[#1E293B] hover:bg-[#334155]',
                      'text-[#64748b] hover:text-[#94a3b8]',
                      'border border-[#334155] hover:border-[#475569]',
                      'transition-all duration-200',
                      'hover:scale-105 active:scale-95'
                    )}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>思考过程</span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        message.thinkingExpanded ? 'rotate-180' : ''
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-out',
                      message.thinkingExpanded
                        ? 'max-h-[500px] opacity-100 mt-3'
                        : 'max-h-0 opacity-0 mt-0'
                    )}
                  >
                    <div className={cn(
                      'rounded-xl p-4',
                      'bg-[#1E293B]/80 backdrop-blur-sm',
                      'border border-[#334155]',
                      'shadow-lg'
                    )}>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#334155]">
                        <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                          {isGenerating && message.id === activeSession?.messages[activeSession.messages.length - 1]?.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>模型推理中...</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-3 h-3" />
                              <span>思考完成</span>
                            </>
                          )}
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-xs text-[#94a3b8] leading-relaxed">
                        {message.thinking}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div
                className={cn(
                  'rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-md transition-all duration-200',
                  message.role === 'assistant'
                    ? [
                        'bg-[#1E293B]',
                        'text-[#E2E8F0]',
                        'rounded-tl-md border border-[#334155]',
                        'hover:shadow-lg'
                      ]
                    : [
                        'bg-gradient-to-br from-[#4a9eff] to-[#3b82f6]',
                        'text-white',
                        'rounded-tr-md',
                        'hover:shadow-lg hover:shadow-[#4a9eff]/20'
                      ]
                )}
              >
                {message.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ref, ...props }) {
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
                              'px-1 py-0.5 rounded bg-[#1e1e1e] text-[#4a9eff]',
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
                  <span className="flex items-center gap-2 text-[#64748b]">
                    <Loader2 size={14} className="animate-spin" />
                    <span>生成中...</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0F172A]/50 backdrop-blur-sm">
        <div className="relative flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift+Enter 换行)"
            className={cn(
              'w-full bg-[#1E293B] rounded-xl px-4 py-3.5 pr-12',
              'text-sm text-[#E2E8F0] placeholder-[#64748b]',
              'border-2 border-transparent',
              'focus:outline-none',
              'transition-all duration-200 ease-out',
              'resize-none min-h-[48px] max-h-[120px]',
              'focus:border-[#4a9eff] focus:shadow-lg focus:shadow-[#4a9eff]/10',
              'hover:border-[#334155]'
            )}
            rows={1}
          />
          {input.length > 0 && (
            <div className="absolute bottom-2 right-16 text-xs text-[#475569]">
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
  )
}
