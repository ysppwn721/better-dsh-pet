/**
 * ============================================================================
 * better-dsh-pet 宿主半侧（host half）—— 桌面宠物插件的 DSH 服务端入口
 * ============================================================================
 *
 * 联动模型（桌面独立气泡版）：
 *   - 插件由 DSH 启动/停止，不要求用户单独打开桌宠；
 *   - 监听 DSH 的 session/event，把真实 Agent 状态压缩成状态对象；
 *   - 通过 /plugins/better-dsh-pet/status HTTP 端点暴露给 Electron 桌面 Helper；
 *   - Electron Helper 轮询该端点，驱动透明置顶气泡窗口播放对应动画；
 *   - 在 DSH 设置页暴露配置项（大小、气泡、活跃度等）。
 *
 * 本文件同时保留 /pet/thumb 静态资源路由，方便需要直接访问动画的旧版页面。
 * ============================================================================
 */
import Schema from '@deepseek-ai/schemastery'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { CompanionReducer } from './pet-reducer.js'
import { HelperProcess } from './pet-helper-process.js'
import { modelReady, transcribeWav } from './sensevoice.js'
import {
  CompanionMessageKind,
  CompanionState,
} from './pet-protocol.js'

export const name = 'better-dsh-pet'
export const inject = ['sessions']
export const CONFIG_ENDPOINT = '/plugins/better-dsh-pet/config'
export const STATUS_ENDPOINT = '/plugins/better-dsh-pet/status'
export const CLOSE_ENDPOINT = '/plugins/better-dsh-pet/close'
export const CHAT_ENDPOINT = '/plugins/better-dsh-pet/chat'
export const TRANSCRIBE_ENDPOINT = '/plugins/better-dsh-pet/transcribe'
export const ROUTE_PREFIX = '/pet'

export const Config = Schema.object({
  enabled: Schema.boolean().default(true).description('启用桌面小宠物'),
  scale: Schema.number().min(0.7).max(1.4).step(0.05).default(1).role('slider').description('角色大小'),
  bubbleScale: Schema.number().min(0.8).max(1.2).step(0.05).default(1).role('slider').description('气泡大小'),
  activityLevel: Schema.union([
    Schema.const('quiet').description('安静'),
    Schema.const('normal').description('标准'),
    Schema.const('lively').description('活泼'),
  ]).default('normal').description('空闲微动作频率'),
  reducedMotion: Schema.boolean().default(false).description('减少走动、循环帧和程序化晃动'),
  bubbleMode: Schema.union([
    Schema.const('always').description('常驻显示'),
    Schema.const('hidden').description('完全隐藏'),
    Schema.const('custom').description('自定义显示状态'),
  ]).default('always').description('气泡显示模式'),
  bubbleStates: Schema.array(Schema.string()).default(['SUCCESS', 'ERROR', 'WAITING']).description('自定义模式下显示气泡的状态'),
  includeSubagents: Schema.boolean().default(false).description('允许子 Agent 抢占宠物状态'),
  workMinutes: Schema.number().min(1).max(120).step(1).default(25).description('番茄钟工作时长（分钟）'),
  breakMinutes: Schema.number().min(1).max(60).step(1).default(5).description('番茄钟休息时长（分钟）'),
  roastEnabled: Schema.boolean().default(false).description('根据本次对话自动吐槽（会消耗 Token）'),
  walkEnabled: Schema.boolean().default(true).description('待机时是否允许走动'),
  enabledActions: Schema.array(Schema.string()).default([]).description('自定义待机动作（留空=全部动作）'),
  actionOrder: Schema.array(Schema.string()).default([]).description('自定义待机动作播放顺序（留空=随机）'),
  petSize: Schema.number().min(100).max(1000).step(10).default(460).description('宠物宽度（px）'),
  moveChance: Schema.number().min(0).max(100).step(1).default(20).description('移动频繁度（百分比）'),
  actionDelayMs: Schema.number().min(0).max(5000).step(100).default(0).description('动作切换间隔（毫秒）'),
  playbackRate: Schema.number().min(1).max(2).step(0.1).default(1).role('slider').description('动画播放速度（1.0x～2.0x）'),
  voiceEnabled: Schema.boolean().default(true).description('是否启用语音功能（麦克风）'),
  voiceWakeAutoStart: Schema.boolean().default(false).description('启动桌宠时自动开启语音唤醒（麦克风）'),
  voiceSilenceMs: Schema.number().min(300).max(5000).step(100).default(1200).description('语音断句静音时长（毫秒）'),
  voiceAutoSend: Schema.boolean().default(true).description('语音识别后自动发送'),
  voiceAutoRecord: Schema.boolean().default(true).description('闲聊时说“大肥鱼”自动开始录音'),
}).description('由 DeepSeek Harness 状态驱动的桌面大肥鱼')

const defaults = Object.freeze({
  enabled: true,
  scale: 1,
  bubbleScale: 1,
  activityLevel: 'normal',
  reducedMotion: false,
  bubbleMode: 'always',
  bubbleStates: ['SUCCESS', 'ERROR', 'WAITING'],
  includeSubagents: false,
  workMinutes: 25,
  breakMinutes: 5,
  roastEnabled: false,
  walkEnabled: true,
  enabledActions: [],
  actionOrder: [],
  petSize: 460,
  moveChance: 20,
  actionDelayMs: 0,
  playbackRate: 1,
  voiceEnabled: true,
  voiceWakeAutoStart: false,
  voiceSilenceMs: 1200,
  voiceAutoSend: true,
  voiceAutoRecord: true,
})

function publicConfig(config = {}) {
  return {
    enabled: config.enabled ?? defaults.enabled,
    scale: config.scale ?? defaults.scale,
    bubbleScale: config.bubbleScale ?? defaults.bubbleScale,
    activityLevel: config.activityLevel ?? defaults.activityLevel,
    reducedMotion: config.reducedMotion ?? defaults.reducedMotion,
    bubbleMode: config.bubbleMode ?? defaults.bubbleMode,
    bubbleStates: Array.isArray(config.bubbleStates) ? config.bubbleStates : defaults.bubbleStates,
    includeSubagents: config.includeSubagents ?? defaults.includeSubagents,
    workMinutes: config.workMinutes ?? defaults.workMinutes,
    breakMinutes: config.breakMinutes ?? defaults.breakMinutes,
    roastEnabled: config.roastEnabled ?? defaults.roastEnabled,
    walkEnabled: config.walkEnabled ?? defaults.walkEnabled,
    enabledActions: Array.isArray(config.enabledActions) ? config.enabledActions : defaults.enabledActions,
    actionOrder: Array.isArray(config.actionOrder) ? config.actionOrder : defaults.actionOrder,
    petSize: config.petSize ?? defaults.petSize,
    moveChance: config.moveChance ?? defaults.moveChance,
    actionDelayMs: config.actionDelayMs ?? defaults.actionDelayMs,
    playbackRate: config.playbackRate ?? defaults.playbackRate,
    voiceEnabled: config.voiceEnabled ?? defaults.voiceEnabled,
    voiceWakeAutoStart: config.voiceWakeAutoStart ?? defaults.voiceWakeAutoStart,
    voiceSilenceMs: config.voiceSilenceMs ?? defaults.voiceSilenceMs,
    voiceAutoSend: config.voiceAutoSend ?? defaults.voiceAutoSend,
    voiceAutoRecord: config.voiceAutoRecord ?? defaults.voiceAutoRecord,
  }
}

function localSettingsScope(value) {
  return {
    get: () => value,
    watch: () => () => {},
  }
}

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function isLoopback(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

async function readPatch(req) {
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > 8192) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('patch must be an object')
  const allowed = new Set(Object.keys(defaults))
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('patch contains an unknown setting')
  return value
}

async function readJsonBody(req) {
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > 64 * 1024) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function createConfigHandler(settings) {
  return async (req, res) => {
    if (!isLoopback(req.socket?.remoteAddress)) {
      jsonResponse(res, 403, { error: 'local access only' })
      return
    }
    const origin = req.headers?.origin
    if (origin) {
      let originHost
      try { originHost = new URL(origin).host } catch {}
      if (!originHost || originHost !== req.headers.host) {
        jsonResponse(res, 403, { error: 'origin mismatch' })
        return
      }
    }
    if (req.method === 'GET') {
      jsonResponse(res, 200, settings.get())
      return
    }
    if (req.method !== 'PATCH') {
      jsonResponse(res, 405, { error: 'method not allowed' })
      return
    }
    try {
      await settings.update(await readPatch(req))
      jsonResponse(res, 200, settings.get())
    } catch (error) {
      jsonResponse(res, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  }
}

/** 旧版 /pet 静态资源路由：服务插件包内 assets/thumb 下的 WebM。 */
function createAssetHandler(config = {}) {
  const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
  const thumbRoot = join(packageRoot, 'assets', 'thumb')
  const fullRoot = config.fullRoot ?? join(resolveDshHome(), 'pet-assets')
  const MIME = {
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.json': 'application/json; charset=utf-8',
  }

  const resolveAsset = (root, rel) => {
    if (rel.length === 0) return undefined
    const candidate = normalize(join(root, rel))
    const rootWithSep = root.endsWith(sep) ? root : root + sep
    if (candidate !== root && !candidate.startsWith(rootWithSep)) return undefined
    return candidate
  }

  return async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const rest = decodeURIComponent(url.pathname.slice(ROUTE_PREFIX.length + 1))
    const [scope, ...nameParts] = rest.split('/')
    if (scope !== 'thumb' && scope !== 'full') {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('better-dsh-pet: expected /pet/{thumb|full}/<file>')
      return
    }
    const fileName = nameParts.join('/')
    const root = scope === 'thumb' ? thumbRoot : fullRoot
    const file = resolveAsset(root, fileName)
    if (file === undefined) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('better-dsh-pet: invalid path')
      return
    }
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(scope === 'full'
        ? `better-dsh-pet: original asset not downloaded yet — run the fetch-assets script to populate ${fullRoot}`
        : 'better-dsh-pet: asset not found')
      return
    }
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
    const contentType = MIME[ext] ?? 'application/octet-stream'
    const { size } = await stat(file)
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': size,
      'cache-control': 'public, max-age=3600',
    })
    const stream = createReadStream(file)
    stream.on('error', () => { res.destroy() })
    stream.pipe(res)
  }
}

function mount(ctx, config = {}, eventCtx = ctx) {
  const logger = ctx.logger ?? console
  const base = publicConfig(config)
  const settings = ctx.settings?.register?.('better-dsh-pet', Config, {
    base,
    applies: 'live',
  }) ?? localSettingsScope(base)

  let bridge
  let reducer
  let restartTimer
  let statusUrl = config.webuiUrl
    ? String(config.webuiUrl).replace(/\/$/, '') + STATUS_ENDPOINT
    : undefined
  let currentStatus = {
    state: CompanionState.IDLE,
    message: '大肥鱼在这儿等新任务哦~',
    detail: '大肥鱼 · 等待下一次任务',
    project: undefined,
    task: undefined,
    progress: undefined,
  }
  let pulse = undefined
  let tasks = []
  let tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  let balance = null
  let balanceTimer = null
  let transcript = []
  let chatHistory = []
  let roast = null
  let roastTimer = null
  let userClosed = false
  let lastEnabled = base.enabled !== false

  const applyMessages = (messages) => {
    for (const message of messages) {
      if (!message?.kind) continue
      if (message.kind === CompanionMessageKind.STATE) {
        pulse = undefined
        currentStatus = {
          ...currentStatus,
          state: message.state,
          message: message.message || currentStatus.message,
          detail: message.detail || currentStatus.detail,
          project: message.project ?? currentStatus.project,
          task: message.task ?? currentStatus.task,
          progress: message.progress ?? currentStatus.progress,
        }
      } else if (message.kind === CompanionMessageKind.PULSE) {
        const ttlMs = Number(message.ttlMs || 1800)
        pulse = {
          state: message.state,
          message: message.message || '',
          detail: message.detail || '',
          ttlMs,
          expiresAt: Date.now() + ttlMs,
          resumeState: message.resumeState,
          resumeMessage: message.resumeMessage,
          resumeDetail: message.resumeDetail,
        }
        // 脉冲结束后应回到 resumeState。这里立即同步 currentStatus，
        // 避免脉冲过期后状态接口回退到旧的“整理结果”等中间状态。
        if (message.resumeState) {
          currentStatus = {
            ...currentStatus,
            state: message.resumeState,
            message: message.resumeMessage || currentStatus.message,
            detail: message.resumeDetail || currentStatus.detail,
          }
        }
      } else if (message.kind === CompanionMessageKind.TASK) {
        currentStatus = {
          ...currentStatus,
          task: message.task ?? currentStatus.task,
          progress: message.progress ?? currentStatus.progress,
          project: message.project ?? currentStatus.project,
          message: message.message || currentStatus.message,
          detail: message.detail || currentStatus.detail,
        }
      } else if (message.kind === CompanionMessageKind.TASKS) {
        tasks = Array.isArray(message.tasks) ? message.tasks : []
      }
    }
  }

  const resolveApiKey = async () => {
    let apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      try {
        if (eventCtx.credentials?.resolve) {
          const resolved = await eventCtx.credentials.resolve('DEEPSEEK_API_KEY')
          apiKey = resolved?.value
        }
      } catch {
        apiKey = undefined
      }
    }
    if (!apiKey) {
      try {
        const home = resolveDshHome()
        const text = readFileSync(join(home, '.credentials.yaml'), 'utf8')
        const match = text.match(/^\s*DEEPSEEK_API_KEY:\s*(.+?)\s*$/m)
        if (match) apiKey = match[1].trim()
      } catch {
        apiKey = undefined
      }
    }
    return apiKey
  }

  const appendTranscript = (role, content) => {
    const text = Array.isArray(content)
      ? content.map((part) => {
          if (typeof part === 'string') return part
          if (part?.type === 'text') return part.text || ''
          if (part?.text) return part.text
          return ''
        }).filter(Boolean).join(' ')
      : typeof content === 'string' ? content : ''
    if (!text.trim()) return
    transcript.push({ role, content: text.trim() })
    // 只保留最近 10 条，避免上下文无限增长。
    if (transcript.length > 10) transcript = transcript.slice(-10)
  }

  const generateRoast = async (force = false) => {
    const enabled = settings.get().roastEnabled === true
    if (!force && !enabled) return
    const apiKey = await resolveApiKey()
    if (!apiKey || transcript.length === 0) return
    // 只取最近 5 条，且每条截断到 150 字，降低 Token 消耗。
    const recent = transcript.slice(-5).map((item) => {
      const content = item.content.length > 150 ? `${item.content.slice(0, 150)}…` : item.content
      return `${item.role === 'user' ? '用户' : '大肥鱼'}: ${content}`
    }).join('\n')
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一只住在 DeepSeek Harness 里的大肥鱼桌宠。请根据用户和 AI 的对话，用一句简短、可爱、俏皮的话吐槽/点评这次对话。要求：中文，不超过30个字，语气像大肥鱼，不要解释，不要引号。' },
            { role: 'user', content: `对话内容：\n${recent}` },
          ],
          max_tokens: 80,
          temperature: 1.1,
          stream: false,
        }),
      })
      if (!response.ok) return
      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content
      if (typeof text === 'string' && text.trim()) {
        roast = text.trim().replace(/^["“”]+|["“”]+$/g, '')
      }
    } catch {
      // 吐槽失败时静默，不影响主功能。
    }
  }

  const generateChatReply = async (userMessage) => {
    const apiKey = await resolveApiKey()
    if (!apiKey) return '我还没连上 DeepSeek API，暂时不能闲聊哦~'
    const text = String(userMessage || '').trim()
    if (!text) return '你说什么？我没听清~'
    chatHistory.push({ role: 'user', content: text.slice(0, 500) })
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20)
    const messages = [
      { role: 'system', content: '你是一只住在 DeepSeek Harness 里的大肥鱼桌宠，名字叫大肥鱼。你性格可爱、俏皮、有点懒，喜欢用短句和颜文字。请用中文简短回复，一般不超过60字。' },
      ...chatHistory,
    ]
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          max_tokens: 200,
          temperature: 0.9,
          stream: false,
        }),
      })
      if (!response.ok) {
        chatHistory.pop()
        return `DeepSeek 接口出错了（${response.status}），稍后再试吧~`
      }
      const data = await response.json()
      const reply = data?.choices?.[0]?.message?.content
      if (typeof reply === 'string' && reply.trim()) {
        const clean = reply.trim().replace(/^["“”]+|["“”]+$/g, '')
        chatHistory.push({ role: 'assistant', content: clean })
        return clean
      }
      chatHistory.pop()
      return '我好像走神了，再说一遍好吗？'
    } catch {
      chatHistory.pop()
      return '网络开小差了，等会儿再聊吧~'
    }
  }

  const refreshBalance = async () => {
    const apiKey = await resolveApiKey()
    if (!apiKey) {
      balance = null
      return
    }
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        headers: { authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      })
      if (!response.ok) {
        balance = null
        return
      }
      const data = await response.json()
      const info = Array.isArray(data?.balance_infos) ? data.balance_infos[0] : undefined
      if (info) {
        balance = {
          currency: info.currency || 'CNY',
          total: info.total_balance,
          granted: info.granted_balance,
          toppedUp: info.topped_up_balance,
          isAvailable: data.is_available !== false,
          updatedAt: Date.now(),
        }
      } else {
        balance = null
      }
    } catch {
      balance = null
    }
  }

  const getStatus = () => ({
    ...currentStatus,
    tasks,
    pulse: pulse && pulse.expiresAt > Date.now() ? pulse : undefined,
    tokenUsage,
    balance,
    roast,
    config: publicConfig(settings.get()),
  })

  const stopRuntime = (reason = 'settings-change') => {
    bridge?.stop(reason)
    bridge = undefined
    reducer = undefined
  }

  const restartRuntime = (next) => {
    stopRuntime('settings-change')
    startRuntime(next)
  }

  const scheduleRestart = (next) => {
    if (restartTimer) clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      restartTimer = undefined
      restartRuntime(next)
    }, 400)
    restartTimer.unref?.()
  }

  const startRuntime = (resolved) => {
    if (resolved.enabled === false) {
      logger.info?.('better-dsh-pet is disabled')
      return
    }
    if (bridge) return
    const helperConfig = config.helper ?? {}
    const resolvedStatusUrl = statusUrl
      || String(config.webuiUrl ?? process.env.DSH_PET_WEBUI_URL ?? 'http://127.0.0.1:3080/').replace(/\/$/, '') + STATUS_ENDPOINT
    bridge = new HelperProcess({
      ...helperConfig,
      env: {
        ...helperConfig.env,
        DSH_PET_SCALE: String(resolved.scale ?? defaults.scale),
        DSH_PET_BUBBLE_SCALE: String(resolved.bubbleScale ?? defaults.bubbleScale),
        DSH_PET_ACTIVITY_LEVEL: String(resolved.activityLevel ?? defaults.activityLevel),
        DSH_PET_REDUCED_MOTION: resolved.reducedMotion === true ? '1' : '0',
        DSH_PET_BUBBLE_MODE: String(resolved.bubbleMode ?? defaults.bubbleMode),
        DSH_PET_BUBBLE_STATES: (Array.isArray(resolved.bubbleStates) ? resolved.bubbleStates : defaults.bubbleStates).join(','),
        DSH_PET_WORK_MINUTES: String(resolved.workMinutes ?? defaults.workMinutes),
        DSH_PET_BREAK_MINUTES: String(resolved.breakMinutes ?? defaults.breakMinutes),
        DSH_PET_STATUS_URL: resolvedStatusUrl,
        DSH_PET_WEBUI_URL: String(config.webuiUrl ?? process.env.DSH_PET_WEBUI_URL ?? 'http://127.0.0.1:3080/'),
        DSH_PET_PLAYBACK_RATE: String(resolved.playbackRate ?? defaults.playbackRate),
        DSH_PET_VOICE_ENABLED: resolved.voiceEnabled === false ? '0' : '1',
        DSH_PET_VOICE_WAKE_AUTO_START: resolved.voiceWakeAutoStart === true ? '1' : '0',
        DSH_PET_VOICE_SILENCE_MS: String(resolved.voiceSilenceMs ?? defaults.voiceSilenceMs),
        DSH_PET_VOICE_AUTO_SEND: resolved.voiceAutoSend === false ? '0' : '1',
        DSH_PET_VOICE_AUTO_RECORD: resolved.voiceAutoRecord === false ? '0' : '1',
      },
    }, logger)
    reducer = new CompanionReducer({ includeSubagents: resolved.includeSubagents === true })
    bridge.start()
    void refreshBalance()
    if (!balanceTimer) {
      balanceTimer = setInterval(() => void refreshBalance(), 5 * 60 * 1000)
      balanceTimer.unref?.()
    }
    logger.info?.(`better-dsh-pet desktop helper started (status: ${resolvedStatusUrl})`)
  }

  const offEvent = eventCtx.on('session/event', (session, event) => {
    if (!bridge || !reducer) return
    // 捕获 token 用量：assistant/message 会携带 adapter 上报的 usage。
    if (event?.type === 'assistant/message') {
      const usage = event.data?.usage ?? event.data?.message?.usage
      if (usage) {
        const input = Number(usage.inputTokens ?? usage.promptTokens ?? usage.input ?? 0) || 0
        const output = Number(usage.outputTokens ?? usage.completionTokens ?? usage.output ?? 0) || 0
        tokenUsage.inputTokens += input
        tokenUsage.outputTokens += output
        tokenUsage.totalTokens += input + output
      }
    }
    // 记录本次对话文本，供“吐槽”功能使用。
    if (event?.type === 'user/message') {
      appendTranscript('user', event.data?.content)
    } else if (event?.type === 'assistant/message') {
      appendTranscript('assistant', event.data?.message?.content)
    }
    // 每轮对话结束后自动刷新一次余额。
    if (event?.type === 'turn/end') {
      void refreshBalance()
    }
    // 自动吐槽：每轮对话结束后，如果开启了吐槽，则延迟生成一条。
    if (event?.type === 'turn/end' && settings.get().roastEnabled === true) {
      if (roastTimer) clearTimeout(roastTimer)
      roastTimer = setTimeout(() => {
        roastTimer = undefined
        void generateRoast()
      }, 1500)
      roastTimer.unref?.()
    }
    applyMessages(reducer.handle(session, event))
  }, { global: true })
  const offDisposed = eventCtx.on('session/disposed', (session) => {
    if (!bridge || !reducer) return
    applyMessages(reducer.disposeSession(session))
  }, { global: true })

  const unwatch = settings.watch((next) => {
    const wasEnabled = lastEnabled
    lastEnabled = next.enabled !== false
    if (next.enabled === false) {
      if (restartTimer) {
        clearTimeout(restartTimer)
        restartTimer = undefined
      }
      userClosed = true
      stopRuntime('settings-change')
      return
    }
    // 用户从右键菜单“本次关闭”后，只有显式从“禁用”切回“启用”才复活；
    // 其他设置变化不应把已经手动关闭的桌宠又拉起来。
    if (userClosed) {
      if (!(wasEnabled === false && next.enabled === true)) return
      userClosed = false
    }
    if (!bridge) {
      scheduleRestart(next)
      return
    }
    if (restartTimer) {
      clearTimeout(restartTimer)
      restartTimer = undefined
    }
    // 非启用类配置通过 status 里的 config 实时下发给 Helper；这里不重启进程。
    logger.debug?.('better-dsh-pet settings changed; Helper will pick it up on next poll')
  })

  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (httpCtx) => {
      const origin = `http://${httpCtx.webServer.host}:${httpCtx.webServer.port}`
      statusUrl = `${origin}${STATUS_ENDPOINT}`
      httpCtx.effect(
        () => httpCtx.webServer.register({ kind: 'exact', path: CONFIG_ENDPOINT, handler: createConfigHandler(settings) }),
        'better-dsh-pet: local settings endpoint',
      )
      httpCtx.effect(
        () => httpCtx.webServer.register({ kind: 'exact', path: STATUS_ENDPOINT, handler: async (_req, res) => jsonResponse(res, 200, getStatus()) }),
        'better-dsh-pet: local status endpoint',
      )
      httpCtx.effect(
        () => httpCtx.webServer.register({
          kind: 'exact',
          path: '/plugins/better-dsh-pet/roast',
          handler: async (_req, res) => {
            await generateRoast(true)
            jsonResponse(res, 200, { ok: true, roast })
          },
        }),
        'better-dsh-pet: local roast endpoint',
      )
      httpCtx.effect(
        () => httpCtx.webServer.register({
          kind: 'exact',
          path: '/plugins/better-dsh-pet/refresh-balance',
          handler: async (_req, res) => {
            await refreshBalance()
            jsonResponse(res, 200, { ok: true, balance })
          },
        }),
        'better-dsh-pet: local refresh-balance endpoint',
      )
      httpCtx.effect(
        () => httpCtx.webServer.register({
          kind: 'exact',
          path: CHAT_ENDPOINT,
          handler: async (req, res) => {
            try {
              const body = await readJsonBody(req)
              const message = typeof body?.message === 'string' ? body.message : ''
              const reply = await generateChatReply(message)
              jsonResponse(res, 200, { ok: true, reply })
            } catch (error) {
              jsonResponse(res, 400, { error: error instanceof Error ? error.message : String(error) })
            }
          },
        }),
        'better-dsh-pet: local chat endpoint',
      )
      httpCtx.effect(
        () => httpCtx.webServer.register({
          kind: 'exact',
          path: TRANSCRIBE_ENDPOINT,
          handler: async (req, res) => {
            try {
              const chunks = []
              let bytes = 0
              for await (const chunk of req) {
                bytes += chunk.length
                if (bytes > 24 * 1024 * 1024) throw new Error('audio too large')
                chunks.push(chunk)
              }
              const wav = Buffer.concat(chunks)
              if (!modelReady()) {
                jsonResponse(res, 400, { ok: false, error: 'SenseVoice 模型未就绪，请先运行 npm run download:sensevoice' })
                return
              }
              const text = await transcribeWav(wav)
              jsonResponse(res, 200, { ok: true, text })
            } catch (error) {
              jsonResponse(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
            }
          },
        }),
        'better-dsh-pet: local transcribe endpoint',
      )
      httpCtx.effect(
        () => httpCtx.webServer.register({
          kind: 'exact',
          path: CLOSE_ENDPOINT,
          handler: async (_req, res) => {
            // 用户从右键菜单选择“本次关闭”时，先通知宿主停止守护，
            // 避免 Helper 进程退出后被 HelperProcess 自动拉起。
            // 这里不主动 kill，让 Electron 自己 app.quit() 优雅退出。
            userClosed = true
            if (bridge) {
              bridge.suppressRestart()
              bridge = undefined
            }
            jsonResponse(res, 200, { ok: true })
          },
        }),
        'better-dsh-pet: local close endpoint',
      )
      httpCtx.effect(
        () => httpCtx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler: createAssetHandler(config) }),
        'better-dsh-pet: /pet asset route',
      )
      startRuntime(settings.get())
    })
  } else {
    startRuntime(settings.get())
  }

  ctx.effect(() => () => {
    if (restartTimer) clearTimeout(restartTimer)
    restartTimer = undefined
    if (balanceTimer) clearInterval(balanceTimer)
    balanceTimer = undefined
    if (roastTimer) clearTimeout(roastTimer)
    roastTimer = undefined
    offEvent?.()
    offDisposed?.()
    unwatch()
    stopRuntime('dsh-host-stop')
  })
}

export function apply(ctx, config = {}) {
  if (typeof ctx.inject === 'function') {
    ctx.inject(['settings'], (settingsCtx) => mount(settingsCtx, config, ctx))
    return
  }
  mount(ctx, config)
}

export {
  CompanionMessageKind,
  CompanionReducer,
  CompanionState,
  HelperProcess,
}
