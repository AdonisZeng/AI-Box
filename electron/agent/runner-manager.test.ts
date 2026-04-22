import * as assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { RunnerManager } from './runner-manager.ts'

test('executes a node entrypoint and captures stdout', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ai-box-runner-'))
  const script = join(root, 'echo.mjs')
  writeFileSync(script, `console.log('runner-ok')\n`)

  const runner = new RunnerManager()
  const result = await runner.run({
    runner: 'node',
    command: script,
    cwd: root,
  })

  assert.equal(result.exitCode, 0)
  assert.match(result.stdout, /runner-ok/)
})

test('resolves shell and python commands without executing them', () => {
  const runner = new RunnerManager()

  assert.equal(runner.resolveCommand('python', 'scripts/run.py').command, 'python')
  assert.ok(runner.resolveCommand('shell', 'scripts/run.sh').command.length > 0)
})
