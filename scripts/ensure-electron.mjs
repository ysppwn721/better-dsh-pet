#!/usr/bin/env node
/**
 * ensure-electron.mjs
 *
 * 自动下载 Electron 到 $DSH_HOME/electron（默认 ~/.dsh/electron），
 * 供 better-dsh-pet 桌面 Helper 使用。
 *
 * 用法：
 *   node scripts/ensure-electron.mjs
 *
 * 环境变量：
 *   DSH_HOME                     DSH 主目录（默认 ~/.dsh）
 *   DSH_PET_ELECTRON_VERSION     Electron 版本（默认 43.3.0）
 *   DSH_PET_ELECTRON_MIRROR      镜像地址（默认 npmmirror）
 */

import { appendFileSync, createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

function inferDshHomeFromPackage() {
  let dir = ROOT
  while (true) {
    if (basename(dir) === 'profiles') return dirname(dir)
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

const HOME = (process.env.DSH_HOME && process.env.DSH_HOME.trim())
  || inferDshHomeFromPackage()
  || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
const VERSION = process.env.DSH_PET_ELECTRON_VERSION || '43.3.0'
const MIRROR_TEMPLATES = [
  (version, zip) => `${(process.env.DSH_PET_ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/').replace(/\/$/, '')}/${version}/${zip}`,
  (version, zip) => `https://github.com/electron/electron/releases/download/v${version}/${zip}`,
  (version, zip) => `https://ghfast.top/https://github.com/electron/electron/releases/download/v${version}/${zip}`,
  (version, zip) => `https://gh-proxy.com/https://github.com/electron/electron/releases/download/v${version}/${zip}`,
]
const TARGET_DIR = resolve(HOME, 'electron')
const EXE = join(TARGET_DIR, 'electron.exe')
const REQUIRED_FILES = [
  'electron.exe',
  'icudtl.dat',
  'resources.pak',
  'snapshot_blob.bin',
  'chrome_100_percent.pak',
  'v8_context_snapshot.bin',
]
const LOG_FILE = join(HOME, 'logs', 'better-dsh-pet-electron.log')

function log(msg) {
  console.log(msg)
  try {
    mkdirSync(join(HOME, 'logs'), { recursive: true })
    appendFileSync(LOG_FILE, `${msg}\n`)
  } catch {
    // 日志写入失败不影响下载。
  }
}

async function download(url, dest, label = 'download') {
  const controller = new AbortController()
  let connected = false
  let lastChunkAt = Date.now()
  const connectTimer = setTimeout(() => {
    if (!connected) controller.abort(new Error('连接超时（30秒未响应）'))
  }, 30000)
  let stallTimer
  try {
    log(`[${label}] 等待响应...`)
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal })
    if (!response.ok) {
      throw new Error(`download failed: ${response.status} ${response.statusText} (${url})`)
    }
    connected = true
    clearTimeout(connectTimer)
    const total = Number(response.headers.get('content-length')) || 0
    let received = 0
    let lastLoggedAt = 0
    let lastPercent = -1
    lastChunkAt = Date.now()
    stallTimer = setInterval(() => {
      if (Date.now() - lastChunkAt > 30000) {
        controller.abort(new Error('下载停滞（30秒无数据）'))
      }
    }, 5000)
    const progress = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length
        lastChunkAt = Date.now()
        const percent = total ? Math.floor((received / total) * 100) : 0
        const shouldLog = total
          ? (percent !== lastPercent && (percent % 10 === 0 || percent === 100))
          : (received - lastLoggedAt >= 10 * 1024 * 1024)
        if (shouldLog) {
          lastPercent = percent
          lastLoggedAt = received
          const mb = (received / 1024 / 1024).toFixed(1)
          const totalMb = total ? ` / ${(total / 1024 / 1024).toFixed(1)}MB` : ''
          log(`[${label}] ${total ? `${percent}%` : mb} (${mb}MB${totalMb})`)
        }
        callback(null, chunk)
      },
    })
    await pipeline(response.body, progress, createWriteStream(dest))
    log(`[${label}] 下载完成：${(received / 1024 / 1024).toFixed(1)}MB`)
  } finally {
    clearTimeout(connectTimer)
    if (stallTimer) clearInterval(stallTimer)
  }
}

function extractZip(zipPath, targetDir) {
  mkdirSync(targetDir, { recursive: true })
  // Windows 自带 tar（bsdtar）可以直接解压 zip；失败时退回 PowerShell Expand-Archive。
  const tar = spawnSync('tar', ['-xf', zipPath, '-C', targetDir], { stdio: 'inherit' })
  if (tar.status !== 0) {
    const ps = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${targetDir}' -Force`,
    ], { stdio: 'inherit' })
    if (ps.status !== 0) {
      throw new Error('failed to extract Electron zip')
    }
  }
  // 校验关键文件是否完整；不完整说明下载/解压失败，清理后重试。
  const missing = REQUIRED_FILES.filter((name) => !existsSync(join(targetDir, name)))
  if (missing.length > 0) {
    rmSync(targetDir, { recursive: true, force: true })
    throw new Error(`Electron zip incomplete, missing: ${missing.join(', ')}`)
  }
}

async function main() {
  if (existsSync(EXE)) {
    log(EXE)
    return
  }

  log(`[ensure-electron] Electron not found, downloading v${VERSION} ...`)
  mkdirSync(TARGET_DIR, { recursive: true })

  const zipName = `electron-v${VERSION}-win32-x64.zip`
  const zipPath = join(tmpdir(), zipName)
  try { rmSync(zipPath, { force: true }) } catch { /* 清理残留 zip */ }

  try {
    let lastError
    for (const makeUrl of MIRROR_TEMPLATES) {
      const url = makeUrl(VERSION, zipName)
      log(`[ensure-electron] trying: ${url}`)
      try {
        await download(url, zipPath, 'Electron')
        lastError = undefined
        break
      } catch (error) {
        lastError = error
        log(`[ensure-electron] mirror failed: ${error instanceof Error ? error.message : String(error)}`)
        try { rmSync(zipPath, { force: true }) } catch { /* ignore */ }
      }
    }
    if (lastError) throw lastError
    extractZip(zipPath, TARGET_DIR)
    if (!existsSync(EXE)) {
      throw new Error('Electron zip extracted, but electron.exe not found')
    }
    log(EXE)
  } finally {
    try { rmSync(zipPath, { force: true }) } catch { /* ignore */ }
  }
}

main().catch((error) => {
  log(`[ensure-electron] ERROR: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
