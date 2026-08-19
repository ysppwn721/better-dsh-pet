import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, '..')
const defaultHelperMain = resolve(packageRoot, 'runtime', 'electron-helper', 'main.js')

/**
 * 解析 Electron 可执行文件。
 * 优先级：
 *   1. options.electronPath / DSH_PET_ELECTRON_PATH
 *   2. 本机已安装的 electron npm 包（require('electron') 返回二进制路径）
 *   3. 常见本地开发目录（便于当前 DSH Desktop 环境直接使用）
 */
function resolveElectronPath(candidates = []) {
  const seen = new Set()
  const list = []
  const push = (value) => {
    if (!value || seen.has(value)) return
    seen.add(value)
    list.push(value)
  }
  for (const value of candidates) push(value)
  if (process.env.DSH_PET_ELECTRON_PATH) push(process.env.DSH_PET_ELECTRON_PATH)
  try {
    const resolved = require('electron')
    if (typeof resolved === 'string' && resolved) push(resolved)
  } catch {
    /* electron 未安装时跳过 */
  }
  // 当前机器上的 dsh-desktop-electron 开发依赖，便于本地直接跑通。
  const localCandidates = [
    'D:/deepseek harness/tools/desktop-eval/dsh-desktop-electron/node_modules/electron/dist/electron.exe',
    'D:/deepseek harness/tools/desktop-eval/dsh-desktop-electron/node_modules/electron/dist/electron',
    join(process.env.USERPROFILE || '', '.dsh', 'electron', 'electron.exe'),
  ]
  for (const candidate of localCandidates) push(candidate)
  return list.find((value) => existsSync(value))
}

function defaultLaunch(options = {}) {
  const electronPath = resolveElectronPath([options.electronPath])
  if (!electronPath) {
    throw new Error('better-dsh-pet: cannot resolve Electron executable. Set DSH_PET_ELECTRON_PATH or install electron.')
  }
  const helperPath = options.helperPath || defaultHelperMain
  return { command: electronPath, args: [helperPath] }
}

/**
 * 桌面 Helper 进程管理器。
 *
 * 新架构下 Helper 不再通过 stdin 协议通信，而是轮询宿主暴露的
 * /plugins/better-dsh-pet/status HTTP 端点；因此这里只负责拉起/守护 Electron 进程。
 */
export class HelperProcess {
  constructor(options = {}, logger = console) {
    this.options = options
    this.logger = logger
    this.child = undefined
    this.stopping = false
    this.restartSuppressed = false
    this.restartTimer = undefined
  }

  start() {
    if (this.child || this.stopping || this.restartSuppressed) return this.child
    const helperPath = this.options.helperPath || defaultHelperMain
    const launch = this.options.command
      ? { command: this.options.command, args: this.options.args || [helperPath] }
      : defaultLaunch(this.options)
    const command = launch.command
    const args = this.options.args || launch.args

    const child = spawn(command, args, {
      cwd: this.options.cwd || packageRoot,
      env: { ...process.env, ...this.options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    this.child = child
    child.once('error', (error) => {
      this.logger.error?.(`better-dsh-pet helper failed to start: ${error.message}`)
    })
    child.once('exit', (code, signal) => {
      if (this.child !== child) return
      this.child = undefined
      if (!this.stopping && !this.restartSuppressed) {
        this.logger.warn?.(`better-dsh-pet helper exited (code=${String(code)}, signal=${String(signal)}); restarting`)
        this.#scheduleRestart()
      }
    })
    child.stdout.on('data', (chunk) => {
      const line = String(chunk).trim()
      if (line) this.logger.debug?.(`better-dsh-pet helper: ${line}`)
    })
    child.stderr.on('data', (chunk) => {
      const line = String(chunk).trim()
      if (line) this.logger.warn?.(`better-dsh-pet helper: ${line}`)
    })
    return child
  }

  stop(reason = 'plugin-disposed') {
    this.stopping = true
    if (this.restartTimer) clearTimeout(this.restartTimer)
    this.restartTimer = undefined
    const child = this.child
    if (!child) return
    child.kill()
  }

  #scheduleRestart() {
    if (this.restartTimer || this.stopping || this.restartSuppressed) return
    const delay = this.options.restartDelayMs ?? 750
    this.restartTimer = setTimeout(() => {
      this.restartTimer = undefined
      this.start()
    }, delay)
    this.restartTimer.unref?.()
  }
}

export {
  defaultHelperMain,
  defaultLaunch,
  packageRoot,
  resolveElectronPath,
}
