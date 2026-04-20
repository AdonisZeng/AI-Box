import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Plus, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn, parseThinking } from '@/lib/utils'
import { useChatStore } from '@/lib/store'
import { useSettingsStore } from '@/lib/store'
import { createProvider, type Message } from '@/lib/providers'

const GREETING_MESSAGE = '你好！我是 LanShan AI 助手。有什么我可以帮助你的吗？'

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
    appendToMessage,
    updateThinking,
    toggleThinkingExpanded,
    setGenerating,
  } = useChatStore()

  const { activeProvider, getProviderConfig } = useSettingsStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  const activeSession = sessions.find((s) => s.id === activeSessionId)

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

    const providerConfig = getProviderConfig(activeProvider)
    if (!providerConfig) {
      setGenerating(false)
      return
    }

    const provider = createProvider(providerConfig)
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
    let thinkingBuffer = ''
    let inThinkingBlock = false

    try {
      // Filter out the initial greeting message from conversation history
      const conversationMessages = [...activeSession.messages, userMessage]
        .filter((m) => {
          if (m === activeSession.messages[0] && m.role === 'assistant' && m.content === GREETING_MESSAGE) {
            return false
          }
          return true
        })
        .map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }))

      await provider.chat(
        conversationMessages,
        (chunk) => {
          if (!chunk.done) {
            fullContent += chunk.content
            thinkingBuffer += chunk.content

            // Check for thinking block boundaries
            if (thinkingBuffer.includes('<think>')) {
              inThinkingBlock = true
            }

            if (inThinkingBlock) {
              // Extract thinking content - only update when we have a complete block
              const { thinking, response } = parseThinking(fullContent)
              if (thinking !== null) {
                updateThinking(activeSession.id, assistantMessageId, thinking)
                updateMessage(activeSession.id, assistantMessageId, response)
              }
            } else {
              // No thinking block yet, just update content
              updateMessage(activeSession.id, assistantMessageId, fullContent)
            }

            if (thinkingBuffer.includes('</think>')) {
              inThinkingBlock = false
              thinkingBuffer = ''
            }
          }
        }
      )

      // Final update - ensure thinking is finalized
      const { thinking, response } = parseThinking(fullContent)
      if (thinking !== null) {
        updateThinking(activeSession.id, assistantMessageId, thinking)
        updateMessage(activeSession.id, assistantMessageId, response)
      }

    } catch (error) {
      console.error('Chat error:', error)
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

  const providerNames: Record<string, string> = {
    lmstudio: 'LMStudio',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    custom: '自定义',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="h-10 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center px-2 gap-1 overflow-x-auto">
        {sessions.slice(0, 8).map((session) => (
          <div
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className={cn(
              'flex items-center gap-1 px-3 py-1 text-xs rounded-t cursor-pointer transition-colors group min-w-fit',
              activeSessionId === session.id
                ? 'bg-[#1e1e1e] text-[#ccc]'
                : 'text-[#666] hover:text-[#aaa] hover:bg-[#333]'
            )}
          >
            <span className="max-w-[80px] truncate">{session.title}</span>
            {sessions.length > 1 && (
              <button
                onClick={(e) => handleDeleteChat(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#444] transition-opacity"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1 px-2 py-1 text-[#666] text-xs rounded-t hover:text-[#aaa] hover:bg-[#333] transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Provider & Model Badge */}
      <div className="h-8 bg-[#252526] border-b border-[#3c3c3c] flex items-center px-4 gap-4">
        <span className="text-[#858585] text-xs">
          Provider:{' '}
          <span className="text-[#4a9eff]">
            {providerNames[activeProvider] || activeProvider}
          </span>
        </span>
        <span className="text-[#858585] text-xs">
          Model:{' '}
          <span className="text-[#ccc]">
            {getProviderConfig(activeProvider)?.model || '未设置'}
          </span>
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeSession?.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-medium',
                message.role === 'assistant'
                  ? 'bg-[#4a9eff] text-white'
                  : 'bg-[#3c3c3c] text-[#ccc]'
              )}
            >
              {message.role === 'assistant' ? 'AI' : 'U'}
            </div>

            {/* Content */}
            <div className="max-w-[600px]">
              {/* Thinking Section */}
              {message.thinking !== undefined && message.thinking !== null && (
                <div className="mb-2">
                  <button
                    onClick={() => handleToggleThinking(message.id)}
                    className="flex items-center gap-1 text-xs text-[#666] hover:text-[#aaa] transition-colors mb-1"
                  >
                    {message.thinkingExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    <span>思考过程</span>
                  </button>
                  {message.thinkingExpanded && (
                    <div className="bg-[#252526] rounded-lg px-3 py-2 text-xs text-[#999] border border-[#3c3c3c]">
                      <div className="flex items-center gap-2 mb-1 text-[#666]">
                        <Loader2 size={10} className="animate-spin" />
                        <span>模型正在思考...</span>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono">{message.thinking}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div
                className={cn(
                  'rounded-lg px-4 py-3 text-sm leading-relaxed',
                  message.role === 'assistant'
                    ? 'bg-[#2d2d2d] text-[#ccc]'
                    : 'bg-[#4a9eff] text-white'
                )}
              >
                {message.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const isInline = !match && !className
                        return !isInline ? (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match?.[1] || 'text'}
                            PreTag="div"
                            className="rounded mt-2 !bg-[#1e1e1e] !p-3 text-xs"
                            {...props}
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
                  <span className="flex items-center gap-2 text-[#666]">
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
      <div className="p-4 border-t border-[#3c3c3c]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift+Enter 换行)"
            className="flex-1 bg-[#3c3c3c] border border-[#4a4a4a] rounded-lg px-4 py-3 text-sm text-[#ccc] placeholder-[#666] resize-none focus:outline-none focus:border-[#4a9eff] focus:ring-1 focus:ring-[#4a9eff] min-h-[44px] max-h-[120px]"
            rows={1}
          />
          {isGenerating ? (
            <button
              onClick={stopGeneration}
              className="w-12 h-12 bg-[#d32f2f] hover:bg-[#c62828] text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              title="停止生成"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-12 h-12 bg-[#4a9eff] hover:bg-[#3d8bdb] disabled:bg-[#333] disabled:text-[#666] text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
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
