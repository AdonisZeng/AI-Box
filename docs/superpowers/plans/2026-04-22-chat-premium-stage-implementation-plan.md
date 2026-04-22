# Chat Premium Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the chat workspace into a centered Premium Stage layout with a spotlight-stage background, calmer top chrome, tighter message bubbles, attached thinking panels, and a docked composer without changing chat logic.

**Architecture:** Keep `ChatWorkspace.tsx` as the orchestration layer, but move repeated Tailwind decisions into focused chat-specific style helper files that can be covered with `node:test`. Implement the redesign in layers: stage shell first, then message surfaces, then thinking/composer polish, and finish with full verification.

**Tech Stack:** Electron, React 18, TypeScript, Tailwind CSS, Zustand, Node `node:test`

---

## File Map

### Create

- `src/components/chat/stage-shell-styles.ts`
- `src/components/chat/stage-shell-styles.test.ts`
- `src/components/chat/message-surface-styles.ts`
- `src/components/chat/message-surface-styles.test.ts`
- `src/components/chat/composer-surface-styles.ts`
- `src/components/chat/composer-surface-styles.test.ts`

### Modify

- `src/components/chat/ChatWorkspace.tsx`
- `src/components/chat/thinking-panel-styles.ts`
- `src/components/chat/thinking-panel-styles.test.ts`

### Verification Commands

- `node --test src/components/chat/stage-shell-styles.test.ts`
- `node --test src/components/chat/message-surface-styles.test.ts`
- `node --test src/components/chat/composer-surface-styles.test.ts`
- `node --test src/components/chat/thinking-panel-styles.test.ts`
- `npx tsc --noEmit`
- `npm run build`

## Task 1: Build the Premium Stage Shell Helpers

**Files:**
- Create: `src/components/chat/stage-shell-styles.ts`
- Test: `src/components/chat/stage-shell-styles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getStageShellClass,
  getStageStatusClusterClass,
  getStageToolbarClass,
  getStageWorkspaceBackdropClass,
  getSessionTabClass,
} from './stage-shell-styles.ts'

test('workspace backdrop creates the spotlight-stage atmosphere', () => {
  const className = getStageWorkspaceBackdropClass()

  assert.ok(className.includes('relative'))
  assert.ok(className.includes('overflow-hidden'))
  assert.ok(className.includes('bg-[radial-gradient('))
  assert.ok(className.includes('dark:bg-[radial-gradient('))
})

test('stage shell centers the conversation in a premium container', () => {
  const className = getStageShellClass()

  assert.ok(className.includes('mx-auto'))
  assert.ok(className.includes('max-w-5xl'))
  assert.ok(className.includes('rounded-[28px]'))
  assert.ok(className.includes('backdrop-blur-xl'))
})

test('toolbar and status cluster stay visually light', () => {
  assert.ok(getStageToolbarClass().includes('border-b'))
  assert.ok(getStageToolbarClass().includes('bg-white/72'))
  assert.ok(getStageStatusClusterClass().includes('rounded-full'))
  assert.ok(getStageStatusClusterClass().includes('text-slate-500'))
})

test('active and inactive session tabs diverge in emphasis', () => {
  const active = getSessionTabClass(true)
  const inactive = getSessionTabClass(false)

  assert.ok(active.includes('bg-white/88'))
  assert.ok(active.includes('shadow-sm'))
  assert.ok(inactive.includes('hover:bg-white/60'))
  assert.ok(inactive.includes('text-slate-500'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/chat/stage-shell-styles.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` because `stage-shell-styles.ts` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function getStageWorkspaceBackdropClass(): string {
  return [
    'relative h-full overflow-hidden px-4 py-4 md:px-6 md:py-5',
    'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98)_0%,_rgba(239,246,255,0.96)_34%,_rgba(226,232,240,0.94)_100%)]',
    'dark:bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.32)_0%,_rgba(15,23,42,0.96)_42%,_rgba(2,6,23,1)_100%)]',
  ].join(' ')
}

export function getStageShellClass(): string {
  return [
    'mx-auto flex h-full w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-[28px]',
    'border border-white/70 bg-white/72 shadow-[0_28px_80px_rgba(148,163,184,0.20)] backdrop-blur-xl',
    'dark:border-slate-700/70 dark:bg-slate-950/46 dark:shadow-[0_32px_90px_rgba(2,6,23,0.44)]',
  ].join(' ')
}

export function getStageToolbarClass(): string {
  return [
    'flex items-center justify-between gap-3 border-b border-slate-200/75 bg-white/72 px-4 py-3',
    'backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-950/34',
  ].join(' ')
}

export function getStageStatusClusterClass(): string {
  return [
    'flex items-center gap-3 rounded-full border border-white/80 bg-white/74 px-4 py-1.5 text-xs text-slate-500',
    'shadow-[0_10px_24px_rgba(148,163,184,0.12)] dark:border-slate-700/70 dark:bg-slate-900/58 dark:text-slate-400',
  ].join(' ')
}

export function getSessionTabClass(active: boolean): string {
  return active
    ? [
        'flex items-center gap-1 rounded-full bg-white/88 px-3 py-1.5 text-xs text-slate-900 shadow-sm',
        'dark:bg-slate-900/80 dark:text-slate-50',
      ].join(' ')
    : [
        'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-slate-500 transition-colors',
        'hover:bg-white/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900/55 dark:hover:text-slate-200',
      ].join(' ')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/chat/stage-shell-styles.test.ts`

Expected: PASS for all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/stage-shell-styles.ts src/components/chat/stage-shell-styles.test.ts
git commit -m "test: add premium stage shell style helpers"
```

## Task 2: Apply the Stage Shell to ChatWorkspace

**Files:**
- Modify: `src/components/chat/ChatWorkspace.tsx`
- Use: `src/components/chat/stage-shell-styles.ts`

- [ ] **Step 1: Import the tested shell helpers into ChatWorkspace**

```ts
import {
  getSessionTabClass,
  getStageShellClass,
  getStageStatusClusterClass,
  getStageToolbarClass,
  getStageWorkspaceBackdropClass,
} from './stage-shell-styles'
```

- [ ] **Step 2: Replace the flat chat wrapper with the Premium Stage structure**

```tsx
return (
  <div className={getStageWorkspaceBackdropClass()}>
    <div className={getStageShellClass()}>
      <div className={getStageToolbarClass()}>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {sessions.slice(0, 8).map((session) => (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={getSessionTabClass(activeSessionId === session.id)}
            >
              <span className="max-w-[88px] truncate">{session.title}</span>
            </div>
          ))}
          <button
            onClick={handleNewChat}
            className={getSessionTabClass(false)}
            aria-label="新建对话"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className={getStageStatusClusterClass()}>
          <span>Provider: {providerConfig?.name || chatProviderId}</span>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span>Model: {providerConfig?.model || '未设置'}</span>
          <div className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full', statusDotClassName)} />
            <span>{connectionLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* messages and composer move into this stage body in later tasks */}
      </div>
    </div>
  </div>
)
```

- [ ] **Step 3: Remove the old redundant tab bar and provider row blocks**

```tsx
// Delete the old top "Tab Bar" wrapper:
// <div className="h-10 ...">...</div>

// Delete the old "Provider & Model Badge" wrapper:
// <div className="h-9 ...">...</div>
```

- [ ] **Step 4: Run type-checking to verify the new shell wiring**

Run: `npx tsc --noEmit`

Expected: PASS with exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatWorkspace.tsx
git commit -m "feat: apply premium stage shell to chat workspace"
```

## Task 3: Create Tight Message Surface Helpers

**Files:**
- Create: `src/components/chat/message-surface-styles.ts`
- Test: `src/components/chat/message-surface-styles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getAvatarClass,
  getMessageBubbleClass,
  getMessageColumnClass,
  getMessageRowClass,
} from './message-surface-styles.ts'

test('assistant rows keep a wider reading column with tighter bubble padding', () => {
  const row = getMessageRowClass('assistant')
  const column = getMessageColumnClass('assistant')
  const bubble = getMessageBubbleClass('assistant')

  assert.ok(row.includes('items-start'))
  assert.ok(column.includes('max-w-[min(42rem,78%)]'))
  assert.ok(bubble.includes('px-4'))
  assert.ok(bubble.includes('py-3'))
  assert.ok(bubble.includes('rounded-[22px]'))
})

test('user rows reverse alignment and keep a denser footprint', () => {
  const row = getMessageRowClass('user')
  const column = getMessageColumnClass('user')
  const bubble = getMessageBubbleClass('user')

  assert.ok(row.includes('flex-row-reverse'))
  assert.ok(column.includes('items-end'))
  assert.ok(column.includes('max-w-[min(34rem,72%)]'))
  assert.ok(bubble.includes('rounded-[20px]'))
})

test('avatars stay compact enough to reduce wasted horizontal space', () => {
  const assistantAvatar = getAvatarClass('assistant')
  const userAvatar = getAvatarClass('user')

  assert.ok(assistantAvatar.includes('h-10'))
  assert.ok(assistantAvatar.includes('w-10'))
  assert.ok(userAvatar.includes('h-10'))
  assert.ok(userAvatar.includes('w-10'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/chat/message-surface-styles.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` because `message-surface-styles.ts` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export type ChatVisualRole = 'assistant' | 'user'

export function getMessageRowClass(role: ChatVisualRole): string {
  return role === 'user'
    ? 'flex flex-row-reverse items-end gap-3'
    : 'flex items-start gap-3'
}

export function getMessageColumnClass(role: ChatVisualRole): string {
  return role === 'user'
    ? 'flex max-w-[min(34rem,72%)] flex-col items-end gap-2'
    : 'flex max-w-[min(42rem,78%)] flex-col gap-2'
}

export function getAvatarClass(role: ChatVisualRole): string {
  return role === 'user'
    ? 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16a34a] text-white shadow-lg shadow-[#22C55E]/20'
    : 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4a9eff] to-[#3b82f6] text-white shadow-lg shadow-[#4a9eff]/18'
}

export function getMessageBubbleClass(role: ChatVisualRole): string {
  return role === 'user'
    ? [
        'rounded-[20px] rounded-tr-[12px] px-4 py-3 text-sm leading-relaxed text-white',
        'bg-gradient-to-br from-[#4a9eff] to-[#2563eb] shadow-[0_16px_34px_rgba(37,99,235,0.18)]',
      ].join(' ')
    : [
        'rounded-[22px] rounded-tl-[12px] border px-4 py-3 text-sm leading-relaxed',
        'border-slate-200/80 bg-white/88 text-slate-800 shadow-[0_16px_34px_rgba(148,163,184,0.14)]',
        'dark:border-slate-700/80 dark:bg-slate-900/74 dark:text-slate-100',
      ].join(' ')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/chat/message-surface-styles.test.ts`

Expected: PASS for all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/message-surface-styles.ts src/components/chat/message-surface-styles.test.ts
git commit -m "test: add message surface style helpers"
```

## Task 4: Wire Messages and Thinking Panels into the Premium Stage

**Files:**
- Modify: `src/components/chat/ChatWorkspace.tsx`
- Modify: `src/components/chat/thinking-panel-styles.ts`
- Modify: `src/components/chat/thinking-panel-styles.test.ts`
- Use: `src/components/chat/message-surface-styles.ts`

- [ ] **Step 1: Update the thinking panel tests to capture the new attached-card treatment**

```ts
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getThinkingBodyClass,
  getThinkingPanelClass,
  getThinkingWrapperClass,
} from './thinking-panel-styles'

test('expanded thinking wrapper keeps the new attached spacing', () => {
  const className = getThinkingWrapperClass(true)

  assert.ok(className.includes('max-h-[70vh]'))
  assert.ok(className.includes('mt-2'))
})

test('thinking panel uses the premium stage card treatment', () => {
  const className = getThinkingPanelClass()

  assert.ok(className.includes('rounded-2xl'))
  assert.ok(className.includes('backdrop-blur-xl'))
  assert.ok(className.includes('border-slate-200/80'))
})

test('thinking body still scrolls long reasoning content', () => {
  const className = getThinkingBodyClass()

  assert.ok(className.includes('overflow-y-auto'))
  assert.ok(className.includes('max-h-[60vh]'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/chat/thinking-panel-styles.test.ts`

Expected: FAIL because the old panel classes do not yet include `rounded-2xl`, `backdrop-blur-xl`, and the new `mt-2` spacing.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function getThinkingWrapperClass(expanded: boolean): string {
  return expanded
    ? 'overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out max-h-[70vh] opacity-100 mt-2'
    : 'overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out max-h-0 opacity-0 mt-0'
}

export function getThinkingPanelClass(): string {
  return [
    'rounded-2xl border border-slate-200/80 bg-white/78 shadow-[0_16px_38px_rgba(148,163,184,0.16)] backdrop-blur-xl',
    'dark:border-slate-700/80 dark:bg-slate-900/68 dark:shadow-[0_18px_42px_rgba(2,6,23,0.34)]',
  ].join(' ')
}

export function getThinkingBodyClass(): string {
  return 'max-h-[60vh] overflow-y-auto px-4 pb-4'
}
```

```tsx
const visualRole = message.role === 'user' ? 'user' : 'assistant'

<div key={message.id} className={getMessageRowClass(visualRole)}>
  <div className={getAvatarClass(visualRole)}>
    {visualRole === 'assistant' ? <Sparkles className="h-5 w-5" /> : <User className="h-5 w-5" />}
  </div>

  <div className={getMessageColumnClass(visualRole)}>
    {message.thinking && (
      <div className="w-full">
        <button className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-400">
          <Brain className="h-3.5 w-3.5" />
          <span>思考过程</span>
        </button>

        <div className={getThinkingWrapperClass(!!message.thinkingExpanded)}>
          <div className={getThinkingPanelClass()}>
            <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 pt-4 pb-2 text-[11px] text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
              <Brain className="h-3 w-3" />
              <span>{isGenerating ? '模型推理中...' : '思考完成'}</span>
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
      {/* existing ReactMarkdown rendering stays here */}
    </div>
  </div>
</div>
```

- [ ] **Step 4: Run tests and type-checking**

Run:

```bash
node --test src/components/chat/message-surface-styles.test.ts
node --test src/components/chat/thinking-panel-styles.test.ts
npx tsc --noEmit
```

Expected:

- both test files PASS
- TypeScript exits with code `0`

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatWorkspace.tsx src/components/chat/thinking-panel-styles.ts src/components/chat/thinking-panel-styles.test.ts
git commit -m "feat: tighten chat message surfaces"
```

## Task 5: Add Docked Composer Surface Helpers

**Files:**
- Create: `src/components/chat/composer-surface-styles.ts`
- Test: `src/components/chat/composer-surface-styles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getComposerActionButtonClass,
  getComposerRowClass,
  getComposerShellClass,
  getComposerTextareaClass,
} from './composer-surface-styles.ts'

test('composer shell docks into the bottom of the stage', () => {
  const className = getComposerShellClass()

  assert.ok(className.includes('mt-auto'))
  assert.ok(className.includes('border-t'))
  assert.ok(className.includes('backdrop-blur-xl'))
})

test('composer row keeps the input compact but premium', () => {
  const row = getComposerRowClass()
  const textarea = getComposerTextareaClass()

  assert.ok(row.includes('rounded-[24px]'))
  assert.ok(row.includes('shadow-[0_18px_40px_rgba(148,163,184,0.14)]'))
  assert.ok(textarea.includes('min-h-[48px]'))
  assert.ok(textarea.includes('px-4'))
})

test('send and stop buttons diverge by intent and disabled state', () => {
  const send = getComposerActionButtonClass('send', false)
  const stop = getComposerActionButtonClass('stop', false)
  const disabled = getComposerActionButtonClass('send', true)

  assert.ok(send.includes('from-[#4a9eff]'))
  assert.ok(stop.includes('bg-[#dc2626]'))
  assert.ok(disabled.includes('cursor-not-allowed'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/chat/composer-surface-styles.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` because `composer-surface-styles.ts` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function getComposerShellClass(): string {
  return [
    'mt-auto border-t border-slate-200/80 bg-white/60 px-4 py-4 backdrop-blur-xl',
    'dark:border-slate-700/70 dark:bg-slate-950/40',
  ].join(' ')
}

export function getComposerRowClass(): string {
  return [
    'relative flex items-end gap-3 rounded-[24px] border border-white/80 bg-white/86 p-3',
    'shadow-[0_18px_40px_rgba(148,163,184,0.14)] dark:border-slate-700/80 dark:bg-slate-900/72 dark:shadow-[0_20px_44px_rgba(2,6,23,0.32)]',
  ].join(' ')
}

export function getComposerTextareaClass(): string {
  return [
    'min-h-[48px] max-h-[132px] w-full resize-none rounded-[18px] border border-slate-200/80 bg-transparent px-4 py-3 text-sm text-slate-900',
    'placeholder:text-slate-400 focus:border-[#4a9eff] focus:outline-none dark:border-slate-700/80 dark:text-slate-100 dark:placeholder:text-slate-500',
  ].join(' ')
}

export function getComposerActionButtonClass(kind: 'send' | 'stop', disabled: boolean): string {
  if (kind === 'stop') {
    return [
      'flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dc2626] text-white shadow-lg shadow-[#dc2626]/25',
      'transition-transform duration-200 hover:scale-105 active:scale-95',
    ].join(' ')
  }

  if (disabled) {
    return 'flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-2xl bg-slate-300 text-slate-500'
  }

  return [
    'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4a9eff] to-[#2563eb] text-white',
    'shadow-[0_14px_32px_rgba(37,99,235,0.28)] transition-transform duration-200 hover:scale-105 active:scale-95',
  ].join(' ')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/chat/composer-surface-styles.test.ts`

Expected: PASS for all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/composer-surface-styles.ts src/components/chat/composer-surface-styles.test.ts
git commit -m "test: add docked composer style helpers"
```

## Task 6: Dock the Composer into the Stage and Finish Verification

**Files:**
- Modify: `src/components/chat/ChatWorkspace.tsx`
- Use: `src/components/chat/composer-surface-styles.ts`

- [ ] **Step 1: Import the composer helpers**

```ts
import {
  getComposerActionButtonClass,
  getComposerRowClass,
  getComposerShellClass,
  getComposerTextareaClass,
} from './composer-surface-styles'
```

- [ ] **Step 2: Replace the old footer with the docked stage composer**

```tsx
<div className="flex min-h-0 flex-1 flex-col">
  <div className="flex-1 overflow-y-auto px-5 py-5">
    <div className="space-y-5">
      {/* existing mapped messages */}
    </div>
    <div ref={messagesEndRef} />
  </div>

  <div className={getComposerShellClass()}>
    <div className={getComposerRowClass()}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息... (Shift+Enter 换行)"
        className={getComposerTextareaClass()}
        rows={1}
      />

      {isGenerating ? (
        <button
          onClick={stopGeneration}
          className={getComposerActionButtonClass('stop', false)}
          title="停止生成"
        >
          <Square size={18} />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={getComposerActionButtonClass('send', !input.trim())}
          title="发送"
        >
          <Send size={18} />
        </button>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Run all chat style tests together**

Run:

```bash
node --test src/components/chat/stage-shell-styles.test.ts
node --test src/components/chat/message-surface-styles.test.ts
node --test src/components/chat/composer-surface-styles.test.ts
node --test src/components/chat/thinking-panel-styles.test.ts
```

Expected: PASS for every chat style helper test file.

- [ ] **Step 4: Run final type-check and production build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected:

- TypeScript exits with code `0`
- production build completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatWorkspace.tsx
git commit -m "feat: ship premium stage chat redesign"
```

## Spec Coverage Check

- Spotlight-stage background and centered hierarchy: Tasks 1-2
- Stage-container focus instead of bubble-only focus: Tasks 1-2
- Tighter, less empty message bubbles: Tasks 3-4
- Thinking panel as attached secondary surface: Task 4
- Docked composer and calmer bottom region: Tasks 5-6
- Final verification in both technical and build layers: Task 6

## Placeholder Scan

The plan intentionally avoids placeholder markers and deferred-action phrasing. Every task names exact files, exact commands, and concrete code to add or replace.

## Type Consistency Check

The plan uses the same helper names across tasks:

- `getStageWorkspaceBackdropClass`
- `getStageShellClass`
- `getStageToolbarClass`
- `getStageStatusClusterClass`
- `getSessionTabClass`
- `getMessageRowClass`
- `getMessageColumnClass`
- `getAvatarClass`
- `getMessageBubbleClass`
- `getComposerShellClass`
- `getComposerRowClass`
- `getComposerTextareaClass`
- `getComposerActionButtonClass`

No later task renames these symbols.
