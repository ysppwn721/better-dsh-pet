/**
 * lib/settings-store.js 的单元测试。
 *
 * 重点是回归 0.3.6 及以前的那个 bug：DSH 0.2 删掉了 ctx.settings.register，
 * 插件落到本地作用域，而当时的本地作用域没有 update —— 设置卡片的每次
 * PATCH 都会在宿主侧抛 TypeError（"settings.update is not a function"），
 * 用户改完的值立刻回弹成默认值。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  createLocalSettingsScope,
  normalizeSettingsPatch,
  readPersistedSettings,
} from '../lib/settings-store.js'

const DEFAULTS = Object.freeze({
  enabled: true,
  petSize: 460,
  scale: 1,
  activityLevel: 'normal',
  wakeWord: '大肥鱼',
  enabledActions: [],
})

function makeScope() {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pet-settings-'))
  const persistPath = join(dir, 'settings.json')
  const scope = createLocalSettingsScope({ ...DEFAULTS }, { defaults: DEFAULTS, persistPath })
  return { dir, persistPath, scope }
}

test('本地作用域提供 update，写入立即生效（0.3.6 之前这里没有 update）', async () => {
  const { scope } = makeScope()
  assert.equal(typeof scope.update, 'function')
  await scope.update({ petSize: 300 })
  assert.equal(scope.get().petSize, 300)
})

test('数值夹紧到边界并吸附步长', () => {
  assert.equal(normalizeSettingsPatch({ petSize: 282 }, DEFAULTS).petSize, 280)
  assert.equal(normalizeSettingsPatch({ petSize: 5000 }, DEFAULTS).petSize, 1000)
  assert.equal(normalizeSettingsPatch({ petSize: 10 }, DEFAULTS).petSize, 100)
  assert.equal(normalizeSettingsPatch({ scale: 1.02 }, DEFAULTS).scale, 1)
  assert.equal(normalizeSettingsPatch({ scale: 9 }, DEFAULTS).scale, 1.4)
})

test('未知键被丢弃，空补丁不写盘', async () => {
  assert.deepEqual(normalizeSettingsPatch({ notASetting: 1 }, DEFAULTS), {})
  const { scope } = makeScope()
  await scope.update({ notASetting: 1 })
  assert.deepEqual(scope.get(), { ...DEFAULTS })
})

test('非法枚举与类型错误直接抛错', async () => {
  assert.throws(() => normalizeSettingsPatch({ activityLevel: 'extreme' }, DEFAULTS), /取值不合法/)
  assert.throws(() => normalizeSettingsPatch({ wakeWord: 42 }, DEFAULTS), /需要字符串/)
  const { scope } = makeScope()
  await assert.rejects(scope.update({ petSize: 'abc' }), /需要数字/)
})

test('update 落盘，重启后能读回', async () => {
  const { persistPath, scope } = makeScope()
  await scope.update({ wakeWord: '小鱼', petSize: 300 })
  const raw = JSON.parse(readFileSync(persistPath, 'utf8'))
  assert.equal(raw.wakeWord, '小鱼')
  assert.equal(raw.petSize, 300)

  const restored = readPersistedSettings(persistPath, DEFAULTS)
  assert.equal(restored.wakeWord, '小鱼')
  const revived = createLocalSettingsScope(
    { ...DEFAULTS, ...restored },
    { defaults: DEFAULTS, persistPath },
  )
  assert.equal(revived.get().petSize, 300)
})

test('损坏的配置文件退回默认值，不抛错', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pet-settings-'))
  const file = join(dir, 'settings.json')
  assert.deepEqual(readPersistedSettings(file, DEFAULTS), {})
  writeFileSync(file, '{ this is not json')
  assert.deepEqual(readPersistedSettings(file, DEFAULTS), {})
})

test('watch 收到变更，注销后不再触发', async () => {
  const { scope } = makeScope()
  const seen = []
  const off = scope.watch((next) => seen.push(next.petSize))
  await scope.update({ petSize: 320 })
  assert.deepEqual(seen, [320])
  off()
  await scope.update({ petSize: 340 })
  assert.deepEqual(seen, [320])
})
