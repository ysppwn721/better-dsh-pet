#!/usr/bin/env node
/**
 * download-sensevoice.mjs —— 下载并解压 SenseVoice 本地识别模型。
 *
 * 模型来源：
 *   https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.tar.bz2
 *
 * 下载后放到 ~/.dsh/voice/sensevoice，供宿主端 sherpa-onnx-node 转写使用。
 */
import { appendFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, renameSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const MODEL_DIR = process.env.DSH_VOICE_MODEL_DIR || join(DSH_HOME, 'voice', 'sensevoice')
const MODEL_URL = process.env.DSH_VOICE_MODEL_URL || 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.tar.bz2'
const REQUIRED = ['model.int8.onnx', 'tokens.txt']
const LOG_FILE = join(DSH_HOME, 'logs', 'better-dsh-pet-sensevoice.log')

function log(msg) {
  console.log(msg)
  try {
    mkdirSync(join(DSH_HOME, 'logs'), { recursive: true })
    appendFileSync(LOG_FILE, `${msg}\n`)
  } catch {
    // 日志写入失败不影响下载。
  }
}

function ok(msg) {
  log(`[download-sensevoice] ok: ${msg}`)
}

function fail(msg) {
  log(`[download-sensevoice] FAIL: ${msg}`)
  process.exitCode = 1
}

function hasModel() {
  return REQUIRED.every((name) => existsSync(join(MODEL_DIR, name)))
}

async function download(url, dest, label = 'download') {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
  const total = Number(response.headers.get('content-length')) || 0
  const file = createWriteStream(dest)
  const reader = response.body.getReader()
  let received = 0
  let lastLoggedAt = 0
  let lastPercent = -1
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.length
      file.write(value)
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
    }
  } finally {
    file.end()
  }
  log(`[${label}] 下载完成：${(received / 1024 / 1024).toFixed(1)}MB`)
}

function extract(archive, target) {
  mkdirSync(target, { recursive: true })
  const result = spawnSync('tar', ['-xjf', archive, '-C', target], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('tar extraction failed')
}

function flatten(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const subdirs = entries.filter((e) => e.isDirectory())
  if (subdirs.length === 1 && subdirs[0].name.startsWith('sherpa-onnx-sense-voice')) {
    const sub = join(dir, subdirs[0].name)
    for (const entry of readdirSync(sub)) {
      renameSync(join(sub, entry), join(dir, entry))
    }
    rmSync(sub, { recursive: true, force: true })
  }
}

async function main() {
  if (hasModel()) {
    ok(`model already present in ${MODEL_DIR}`)
    return
  }
  mkdirSync(MODEL_DIR, { recursive: true })
  const archive = join(MODEL_DIR, 'sensevoice.tar.bz2')
  const extractDir = join(MODEL_DIR, '.extract')
  log(`[download-sensevoice] downloading model (约 230MB) ...`)
  try {
    await download(MODEL_URL, archive, 'SenseVoice')
    ok('downloaded archive')
    rmSync(extractDir, { recursive: true, force: true })
    extract(archive, extractDir)
    flatten(extractDir)
    for (const name of REQUIRED) {
      if (!existsSync(join(extractDir, name))) throw new Error(`missing ${name}`)
    }
    for (const name of readdirSync(extractDir)) {
      renameSync(join(extractDir, name), join(MODEL_DIR, name))
    }
    rmSync(extractDir, { recursive: true, force: true })
    rmSync(archive, { force: true })
    ok(`model ready at ${MODEL_DIR}`)
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
    rmSync(archive, { force: true })
    rmSync(extractDir, { recursive: true, force: true })
  }
}

main()
