import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const supportedOpacity = new Set([
  '0',
  '5',
  '10',
  '20',
  '25',
  '30',
  '40',
  '50',
  '60',
  '70',
  '75',
  '80',
  '90',
  '95',
  '100',
])

const agentDir = dirname(fileURLToPath(import.meta.url))
const workspaceDir = dirname(agentDir)
const componentsDir = dirname(workspaceDir)
const files = [
  join(workspaceDir, 'AgentWorkspace.tsx'),
  join(componentsDir, 'chat', 'composer-surface-styles.ts'),
  join(agentDir, 'AgentActivityCard.tsx'),
  join(agentDir, 'AgentChatTimeline.tsx'),
  join(agentDir, 'AgentComposer.tsx'),
  join(agentDir, 'AgentContextRail.tsx'),
]

test('agent theme classes use Tailwind-supported opacity modifiers', () => {
  const unsupported: string[] = []
  const classPattern =
    /(?:^|\s|['"`])(?:dark:|hover:|disabled:|group-hover:|active:|focus:)*[-\w:[\]#]+\/(\d{1,3})(?=\s|['"`),])/g

  for (const file of files) {
    const content = readFileSync(file, 'utf8')

    for (const match of content.matchAll(classPattern)) {
      const token = match[0].trim().replace(/^['"`]/, '')
      const opacity = match[1] ?? ''
      if (!supportedOpacity.has(opacity)) {
        unsupported.push(`${file}: ${token}`)
      }
    }
  }

  assert.deepEqual(unsupported, [])
})
