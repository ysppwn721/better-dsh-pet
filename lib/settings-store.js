/**
 * ============================================================================
 * better-dsh-pet 设置存储（宿主半侧的降级实现）
 * ============================================================================
 *
 * DSH 0.2 起删除了 `ctx.settings.register`（设置命名空间改由插件条目的
 * config 派生），本插件在 0.2.x 宿主上会落到这里的本地实现。
 *
 * 0.3.6 及以前的本地实现只有 `get` / `watch` 两个方法，没有 `update`：
 * 设置卡片（浏览器半侧）每次改动都发 `PATCH /plugins/better-dsh-pet/config`，
 * 宿主侧 handler 调用 `settings.update(...)` 直接抛 TypeError → 返回 500 →
 * 卡片把状态置为 unavailable → 用户刚改的值立刻回弹成默认值。
 *
 * 这里的实现补齐三件事：
 *   1. `update`：浅合并补丁并广播给 `watch` 监听者；
 *   2. 校验：未知键丢弃，数值夹紧到边界并吸附步长，类型不符直接抛错；
 *   3. 持久化：写入 `$DSH_HOME/better-dsh-pet/settings.json`（原子替换），
 *      重启后仍然生效，不再只活在内存里。
 *
 * 本文件不 import 任何宿主侧包，便于单元测试直接跑。
 * ============================================================================
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** 数值型设置项的边界，与 lib/index.js 里 Config 的 min/max/step 一一对应。 */
export const NUMERIC_LIMITS = Object.freeze({
  scale: { min: 0.7, max: 1.4, step: 0.05 },
  bubbleScale: { min: 0.8, max: 1.2, step: 0.05 },
  workMinutes: { min: 1, max: 120, step: 1 },
  breakMinutes: { min: 1, max: 60, step: 1 },
  petSize: { min: 100, max: 1000, step: 10 },
  moveChance: { min: 0, max: 100, step: 1 },
  actionDelayMs: { min: 0, max: 5000, step: 100 },
  playbackRate: { min: 1, max: 2, step: 0.1 },
  voiceSilenceMs: { min: 300, max: 5000, step: 100 },
})

const ENUM_VALUES = Object.freeze({
  activityLevel: ['quiet', 'normal', 'lively'],
  bubbleMode: ['always', 'hidden', 'custom'],
  voiceEngine: ['edge', 'sapi'],
})

const ARRAY_FIELDS = new Set(['bubbleStates', 'enabledActions', 'actionOrder', 'speakStates'])
const STRING_FIELDS = new Set(['wakeWord', 'taskCwd', 'weatherCity', 'voiceName', 'voiceChatSession'])
const BOOLEAN_FIELDS = new Set([
  'enabled',
  'reducedMotion',
  'includeSubagents',
  'roastEnabled',
  'walkEnabled',
  'voiceEnabled',
  'voiceWakeAutoStart',
  'voiceAutoSend',
  'voiceAutoRecord',
  'holidayEnabled',
  'speakEnabled',
  'speakChat',
])

/**
 * 校验并规范化设置补丁：丢掉未知键，数值夹紧到边界后吸附到步长，
 * 枚举与类型不符的一律抛错（由 createConfigHandler 转成 400）。
 *
 * @param patch    设置卡片提交的补丁
 * @param defaults 插件的默认配置（同时充当允许键的清单）
 */
export function normalizeSettingsPatch(patch = {}, defaults = {}) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('patch must be an object')
  }
  const next = {}
  for (const [key, raw] of Object.entries(patch)) {
    if (!Object.hasOwn(defaults, key)) continue
    const limits = NUMERIC_LIMITS[key]
    if (limits) {
      const value = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(value)) throw new Error(`设置项 ${key} 需要数字`)
      const clamped = Math.min(limits.max, Math.max(limits.min, value))
      const stepped = limits.min + Math.round((clamped - limits.min) / limits.step) * limits.step
      next[key] = Number(Math.min(limits.max, Math.max(limits.min, stepped)).toFixed(4))
      continue
    }
    if (ENUM_VALUES[key]) {
      if (!ENUM_VALUES[key].includes(raw)) throw new Error(`设置项 ${key} 取值不合法`)
      next[key] = raw
      continue
    }
    if (ARRAY_FIELDS.has(key)) {
      if (!Array.isArray(raw)) throw new Error(`设置项 ${key} 需要数组`)
      next[key] = raw.map((item) => String(item))
      continue
    }
    if (STRING_FIELDS.has(key)) {
      if (typeof raw !== 'string') throw new Error(`设置项 ${key} 需要字符串`)
      next[key] = raw
      continue
    }
    if (BOOLEAN_FIELDS.has(key)) {
      if (typeof raw !== 'boolean') throw new Error(`设置项 ${key} 需要布尔值`)
      next[key] = raw
    }
  }
  return next
}

/** 读回落盘的设置；文件缺失或损坏时返回空对象，不让桌宠起不来。 */
export function readPersistedSettings(file, defaults = {}) {
  try {
    if (!file || !existsSync(file)) return {}
    return normalizeSettingsPatch(JSON.parse(readFileSync(file, 'utf8')), defaults)
  } catch {
    return {}
  }
}

/** 原子写盘：先写临时文件再 rename，避免半截 JSON。 */
export function writePersistedSettings(file, value) {
  if (!file) return
  try {
    mkdirSync(dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    renameSync(temp, file)
  } catch {
    // 落盘失败只影响重启后的持久化，本次会话内的设置照常生效
  }
}

/**
 * 本地设置作用域：补齐 `ctx.settings.register` 缺失时的 `update` / `watch`。
 *
 * @param initial  初始配置（条目 config 已经持久化的值叠在上面）
 * @param options  { defaults, persistPath }
 */
export function createLocalSettingsScope(initial = {}, options = {}) {
  const defaults = options.defaults ?? {}
  const persistPath = options.persistPath
  let value = { ...initial }
  const listeners = new Set()
  const emit = () => {
    for (const listener of [...listeners]) {
      try {
        listener(value)
      } catch {
        // 单个监听器出错不影响其他监听器
      }
    }
  }
  return {
    get: () => value,
    watch: (listener) => {
      if (typeof listener !== 'function') return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async update(patch = {}) {
      const normalized = normalizeSettingsPatch(patch, defaults)
      if (Object.keys(normalized).length === 0) return value
      value = { ...value, ...normalized }
      writePersistedSettings(persistPath, value)
      emit()
      return value
    },
  }
}
