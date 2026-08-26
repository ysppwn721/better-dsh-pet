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

import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'

const HOME = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
const VERSION = process.env.DSH_PET_ELECTRON_VERSION || '43.3.0'
const MIRROR = process.env.DSH_PET_ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/'
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

async function download(url, dest) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText} (${url})`)
  }
  await pipeline(response.body, createWriteStream(dest))
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
    console.log(EXE)
    return
  }

  console.log(`[ensure-electron] Electron not found, downloading v${VERSION} ...`)
  mkdirSync(TARGET_DIR, { recursive: true })

  const zipName = `electron-v${VERSION}-win32-x64.zip`
  const url = `${MIRROR.replace(/\/$/, '')}/${VERSION}/${zipName}`
  const zipPath = join(tmpdir(), zipName)

  try {
    console.log(`[ensure-electron] ${url}`)
    await download(url, zipPath)
    extractZip(zipPath, TARGET_DIR)
    if (!existsSync(EXE)) {
      throw new Error('Electron zip extracted, but electron.exe not found')
    }
    console.log(EXE)
  } finally {
    try { rmSync(zipPath, { force: true }) } catch { /* ignore */ }
  }
}

main().catch((error) => {
  console.error(`[ensure-electron] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
