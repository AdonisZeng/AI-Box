import { spawn } from 'node:child_process'

export interface RunnerRequest {
  runner: 'node' | 'python' | 'shell'
  command: string
  cwd: string
}

export interface RunnerResult {
  exitCode: number
  stdout: string
  stderr: string
}

export class RunnerManager {
  resolveCommand(
    runner: RunnerRequest['runner'],
    command: string
  ): {
    command: string
    args: string[]
  } {
    if (runner === 'node') {
      return { command: 'node', args: [command] }
    }

    if (runner === 'python') {
      return { command: 'python', args: [command] }
    }

    if (process.platform === 'win32') {
      return { command: 'powershell', args: ['-File', command] }
    }

    return { command: 'sh', args: [command] }
  }

  run(request: RunnerRequest): Promise<RunnerResult> {
    const resolved = this.resolveCommand(request.runner, request.command)

    return new Promise((resolve, reject) => {
      const child = spawn(resolved.command, resolved.args, {
        cwd: request.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
      })
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })
      child.on('error', reject)
      child.on('close', (exitCode) => {
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
        })
      })
    })
  }
}
