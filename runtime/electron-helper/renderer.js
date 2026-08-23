/**
 * better-dsh-pet desktop helper renderer —— 透明窗口里的宠物本体。
 *
 * 使用纯 DOM + 双 video 缓冲播放 better-dsh-pet 的 WebM 动画；接收主进程转发的
 * Companion 消息，根据 DSH 状态切换动画并显示气泡。
 */

// ---------- 配置 ----------
const params = new URLSearchParams(location.search)
const CONFIG = {
  scale: Number(params.get('scale') || '1'),
  bubbleScale: Number(params.get('bubbleScale') || '1'),
  activityLevel: params.get('activityLevel') || 'normal',
  reducedMotion: params.get('reducedMotion') === '1',
  bubbleMode: params.get('bubbleMode') || 'always',
  bubbleStates: (params.get('bubbleStates') || 'SUCCESS,ERROR,WAITING').split(',').filter(Boolean),
  webuiUrl: params.get('webuiUrl') || 'http://127.0.0.1:3080/',
  workMinutes: Number(params.get('workMinutes') || '25'),
  breakMinutes: Number(params.get('breakMinutes') || '5'),
  roastEnabled: params.get('roastEnabled') === '1',
  walkEnabled: params.get('walkEnabled') !== '0',
  enabledActions: [],
  actionOrder: [],
  petSize: Number(params.get('petSize') || '460'),
  moveChance: Number(params.get('moveChance') || '20'),
  actionDelayMs: Number(params.get('actionDelayMs') || '0'),
}

// ---------- 资源根 ----------
const ASSET_BASE = new URL('../../assets/thumb/', location.href).href
const ALARM_URL = new URL('../../assets/alarm.mp3', location.href).href

// ---------- 动画目录 ----------
const CANVAS_H = 360
const FEET_Y = 330
const HIT_BOX = { x0: 200, y0: 50, x1: 440, y1: 335 }

const IDLE = '待机呼吸休闲'
const TURN = '东张西望'
const DRAG = '被鼠标拖拽悬空反馈'
const ACTS = [
  '被落叶淹没', '被吓一跳', '变鸽子', '插茱萸赏菊', '拆礼物',
  '超大伸懒腰', '晨间刷牙', '吃Token', '吃白饭', '吃冰淇淋融化',
  '吃大闸蟹', '吃饺子', '吃腊八粥', '吃年糕', '吃青团',
  '吃汤圆', '吃糖葫芦', '吃晚餐', '吃午餐', '吃西瓜',
  '吃早餐', '吃长寿面', '吃重阳糕', '吃粽子', '抽陀螺',
  '穿针乞巧', '吹笛子', '吹气球', '打瞌睡被惊醒', '大口吃零食',
  '荡秋千', '动物环绕', '堆雪人', '放风筝', '放河灯',
  '放孔明灯', '放烟花', '哈欠连天', '蝴蝶蜜蜂环绕头顶开花', '鲸鱼吐泡泡特效',
  '可爱宅舞', '蓝鲸现世', '撸猫', '萌化小幽灵', '女仆屈膝礼仪',
  '凭空生花', '扑克魔术', '骑木马', '轻快记录', '轻快摇摆舞',
  '三球抛接', '深度思考碎碎念', '是啊，吃什么', '收红包', '涮火锅',
  '讨糖南瓜灯', '踢毽子', '偷吃零食被抓住', '玩水枪', '玩游戏气急败坏',
  '舞狮头', '下五子棋', '小幅度原地360度旋转展示', '小提琴演奏', '写代码',
  '写福字', '摇扇纳凉', '用鲸鱼尾巴拍打地面', '优雅女仆舞', '悠闲哼歌',
  '原地蹲下玩玩具汽车', '原地敲击桌面互动', '原地跳跃抓碎头顶物品', '原地小憩沉眠',
  '原地重力下蹲压缩', '原地专心玩魔方', '照镜子', '整体换装试色',
  '中秋赏月吃月饼', '装点圣诞树',
]
const ACTION_COPY = {
  '东张西望': '大肥鱼东张西望，看看有没有鱼干~',
  '悠闲哼歌': '大肥鱼悠闲地哼着小曲~',
  '超大伸懒腰': '大肥鱼伸了个大大的懒腰~',
  '原地专心玩魔方': '大肥鱼在专心拧魔方呢~',
  '原地敲击桌面互动': '大肥鱼在敲桌面求关注~',
  '原地重力下蹲压缩': '大肥鱼像弹簧一样蹲下去啦~',
  '哈欠连天': '大肥鱼打了个大大的哈欠~',
  '原地小憩沉眠': '大肥鱼偷偷打了个盹儿~',
  '原地蹲下玩玩具汽车': '大肥鱼蹲在地上玩小汽车~',
  '鲸鱼吐泡泡特效': '大肥鱼吐出一串可爱的泡泡~',
  '女仆屈膝礼仪': '大肥鱼向你行了个女仆礼~',
  '被吓一跳': '大肥鱼被吓得炸毛啦！',
  '原地跳跃抓碎头顶物品': '大肥鱼跳起来抓碎了头顶的东西~',
  '小幅度原地360度旋转展示': '大肥鱼原地转圈圈展示自己~',
  '偷吃零食被抓住': '大肥鱼偷吃零食被抓住啦！',
  '玩游戏气急败坏': '大肥鱼玩游戏玩到气急败坏~',
  '用鲸鱼尾巴拍打地面': '大肥鱼用尾巴拍地面抗议~',
  '打瞌睡被惊醒': '大肥鱼打瞌睡被吓醒了！',
  '玩水枪': '大肥鱼拿起水枪滋水玩~',
  '小提琴演奏': '大肥鱼拉起了小提琴~',
  '蓝鲸现世': '蓝鲸大肥鱼现身啦！',
  '吃白饭': '大肥鱼在专心吃白饭~',
  '照镜子': '大肥鱼照镜子臭美中~',
  '优雅女仆舞': '大肥鱼跳起了优雅的女仆舞~',
  '轻快摇摆舞': '大肥鱼轻快地摇摆跳舞~',
  '可爱宅舞': '大肥鱼跳起了可爱宅舞~',
  '整体换装试色': '大肥鱼在试新衣服的颜色~',
  '大口吃零食': '大肥鱼大口大口吃零食~',
  '吹气球': '大肥鱼在努力吹气球~',
  '动物环绕': '好多小动物围着大肥鱼转~',
  '深度思考碎碎念': '大肥鱼陷入深度思考，碎碎念中~',
  '轻快记录': '大肥鱼在轻快地记笔记~',
  '写代码': '大肥鱼在认真写代码~',
  '吃Token': '大肥鱼把 Token 当零食吃掉啦~',
  '吃早餐': '大肥鱼在吃早餐~',
  '吃午餐': '大肥鱼在吃午餐~',
  '吃晚餐': '大肥鱼在吃晚餐~',
  '放风筝': '大肥鱼在放风筝~',
  '摇扇纳凉': '大肥鱼摇着扇子纳凉~',
  '吃冰淇淋融化': '大肥鱼吃冰淇淋，可是化得好快~',
  '被落叶淹没': '大肥鱼被落叶埋住啦~',
  '中秋赏月吃月饼': '大肥鱼中秋赏月吃月饼~',
  '堆雪人': '大肥鱼在堆雪人~',
  '螃蟹走路': '大肥鱼横着走路，超嚣张~',
  '原地漂浮踏步': '大肥鱼原地踏步漂浮中~',
  '原地左转奔跑': '大肥鱼向左奔跑！',
}
const CLICKS = ['点击回应-开心跃动', '点击回应-害羞惊讶', '点击回应-傲娇生气', '点击回应-挠痒咯咯笑', '点击回应-元气挥手']
const CLICK_COPY = {
  '点击回应-开心跃动': '大肥鱼被摸得好开心~',
  '点击回应-害羞惊讶': '大肥鱼害羞地躲了一下~',
  '点击回应-傲娇生气': '大肥鱼傲娇地哼了一声！',
  '点击回应-挠痒咯咯笑': '大肥鱼被挠痒痒，咯咯笑~',
  '点击回应-元气挥手': '大肥鱼元气满满地挥手~',
}
const EAT_ANIMS = ['吃白饭', '吃早餐', '吃午餐', '吃晚餐', '大口吃零食', '吃Token', '吃冰淇淋融化', '偷吃零食被抓住']
const MOVES = ['螃蟹走路', '原地漂浮踏步', '原地左转奔跑']
// 每个走动动画的“开头不动/结尾不动”时长（秒），按动作实际节奏微调。
const MOVE_TIMING = {
  '原地漂浮踏步': { lead: 0.83, tail: 0.83 },
  '螃蟹走路': { lead: 1, tail: 2 },
  '原地左转奔跑': { lead: 1.67, tail: 5.58 },
}
const STATE_ANIMS = {
  IDLE: [IDLE],
  THINKING: ['深度思考碎碎念', '原地专心玩魔方', '东张西望'],
  WORKING: ['写代码', '轻快记录', '原地敲击桌面互动', '吃Token'],
  WAITING: ['东张西望', '悠闲哼歌', '原地敲击桌面互动'],
  SUCCESS: ['点击回应-开心跃动', '优雅女仆舞', '轻快摇摆舞', '可爱宅舞', '女仆屈膝礼仪'],
  ERROR: ['被吓一跳', '玩游戏气急败坏', '偷吃零食被抓住'],
}

// ---------- DOM ----------
const rootEl = document.getElementById('pet-root')
const stageEl = document.getElementById('pet-stage')
const videoA = document.querySelectorAll('video')[0]
const videoB = document.querySelectorAll('video')[1]
const hitEl = document.getElementById('pet-hit')
const bubbleEl = document.getElementById('bubble')
const bubbleTitle = document.getElementById('bubble-title')
const bubbleDetail = document.getElementById('bubble-detail')
const menuEl = document.getElementById('menu')

// ---------- 基础尺寸 ----------
let size = (CONFIG.petSize || 460) * CONFIG.scale
let halfW = size / 2
let halfH = size * 9 / 16 / 2
let bottomPad = (size * 9 / 16 * (CANVAS_H - FEET_Y)) / CANVAS_H
function applySize() {
  size = (CONFIG.petSize || 460) * CONFIG.scale
  halfW = size / 2
  halfH = size * 9 / 16 / 2
  bottomPad = (size * 9 / 16 * (CANVAS_H - FEET_Y)) / CANVAS_H
  stageEl.style.width = size + 'px'
  stageEl.style.height = (size * 9 / 16) + 'px'
  stageEl.style.transform = `translateY(${bottomPad}px)`
  // 尺寸变化后把位置夹回屏幕内。
  petPos.x = Math.min(Math.max(petPos.x, -(HIT_BOX.x0 / 640 * size)), window.innerWidth - (HIT_BOX.x1 / 640 * size))
  petPos.y = Math.min(Math.max(petPos.y, 0), window.innerHeight - size * 9 / 16)
  applyPetPosition()
}
hitEl.style.left = (HIT_BOX.x0 / 640 * 100) + '%'
hitEl.style.top = (HIT_BOX.y0 / 360 * 100) + '%'
hitEl.style.width = ((HIT_BOX.x1 - HIT_BOX.x0) / 640 * 100) + '%'
hitEl.style.height = ((HIT_BOX.y1 - HIT_BOX.y0) / 360 * 100) + '%'
if (CONFIG.reducedMotion) {
  document.documentElement.style.setProperty('--pet-transition', 'none')
}

// 全屏透明画布内，宠物初始放在右下角；拖拽时只移动这个 DOM，不移动窗口。
let petPos = {
  x: window.innerWidth - size - 24,
  y: window.innerHeight - size * 9 / 16 - 24,
}
function applyPetPosition() {
  rootEl.style.left = petPos.x + 'px'
  rootEl.style.top = petPos.y + 'px'
  rootEl.style.right = 'auto'
  rootEl.style.bottom = 'auto'
  rootEl.style.transform = 'none'
}
applyPetPosition()
applySize()

// ---------- 状态 ----------
let front = 0 // 0 = A, 1 = B
let pending = null
let gen = 0
let anim = IDLE
let animOnce = true
let animLoop = false
let currentMode = 'idle' // idle | state | click | drag | move | pulse
let currentState = 'IDLE'
let resumeState = 'IDLE'
let resumeMessage = ''
let resumeDetail = ''
let overlay = null
let overlayTimer = null
let lastPulseKey = null
let status = { state: 'IDLE', message: '', detail: '', project: '', task: '', progress: null }
let tasks = []
let dragging = false
let dragState = { active: false, dragging: false, sx: 0, sy: 0, offX: 0, offY: 0 }
let justDragged = false
let facing = 'left'
let lastMouse = { x: -1, y: -1 }
let tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
let balance = null
let roast = null
let lastRoast = null
let manualBubble = null
let manualBubbleTimer = null
let pomodoro = null
let pomodoroTimer = null
let menuPage = 'main'
let lastMenuPos = { x: 0, y: 0 }
let moveRef = null
let moveToken = 0
let movePlan = null
let actionOrderIndex = 0
let idleDelayTimer = null

// ---------- 工具 ----------
const randomBetween = (min, max) => Math.floor(min + Math.random() * (max - min))
const pick = (pool, exclude) => {
  const entries = exclude ? pool.filter((n) => n !== exclude) : pool
  return entries[Math.floor(Math.random() * entries.length)]
}

function assetUrl(name) {
  return new URL(encodeURIComponent(name) + '.webm', ASSET_BASE).href
}

// ---------- 视频切换 ----------
function currentVideo() {
  return front === 0 ? videoA : videoB
}

function otherVideo() {
  return front === 0 ? videoB : videoA
}

function switchTo(next, { once = true, loop = false } = {}) {
  if (pending && pending.anim === next && pending.once === once && pending.loop === loop) return
  const currentGen = ++gen
  pending = { anim: next, once, loop, gen: currentGen }
  const target = otherVideo()
  const el = target
  const old = currentVideo()
  // 旧视频可能还没播完就被切走：清掉它的 ended 回调，避免稍后触发
  // handleEnded 打断当前正在播放的新动画。
  if (old && old !== el) old.onended = null
  el.src = assetUrl(next)
  el.loop = loop
  el.muted = true
  el.autoplay = true
  el.playsInline = true
  el.onended = loop ? null : () => handleEnded()
  el.load()
  const onReady = () => {
    el.removeEventListener('loadeddata', onReady)
    if (pending?.gen !== currentGen) return
    el.classList.add('is-front')
    if (old !== el) {
      old.classList.remove('is-front')
      old.onended = null
    }
    front = front === 0 ? 1 : 0
    pending = null
    el.style.transform = facing === 'right' ? 'scaleX(-1)' : ''
    el.play().catch(() => {})
    // 走动动画加载完成后，用真实视频时长驱动移动。
    if (currentMode === 'move' && movePlan) startMoveDrive()
  }
  el.addEventListener('loadeddata', onReady)
  if (el.readyState >= 2) onReady()
}

// ---------- 播放控制 ----------
function playIdle() {
  clearIdleDelay()
  stopMove()
  currentMode = 'idle'
  // 自定义动作池：设置了 enabledActions 时只从这些动作里选。
  const actionPool = CONFIG.enabledActions.length > 0
    ? ACTS.filter((name) => CONFIG.enabledActions.includes(name))
    : ACTS
  const usableActions = actionPool.length > 0 ? actionPool : ACTS
  // 自定义播放顺序：非空时按顺序循环播放。
  const order = CONFIG.actionOrder.length > 0
    ? CONFIG.actionOrder.filter((name) => ACTS.includes(name) || MOVES.includes(name) || name === TURN)
    : []
  let next = IDLE
  let isMove = false
  if (order.length > 0) {
    next = order[actionOrderIndex % order.length]
    actionOrderIndex++
    if (MOVES.includes(next) && CONFIG.walkEnabled && tryMove(next)) isMove = true
  } else {
    const roll = Math.random()
    if (roll < 0.3) {
      next = IDLE
    } else if (roll < 0.4) {
      next = TURN
    } else if (roll < 0.8) {
      next = pick(usableActions, anim)
    } else {
      // 按“移动频繁度”概率尝试走动（可关闭）；空间不够或关闭时退回随机动作。
      const moveCandidate = pick(MOVES, anim)
      if (CONFIG.walkEnabled && Math.random() * 100 < CONFIG.moveChance && tryMove(moveCandidate)) {
        next = moveCandidate
        isMove = true
      } else {
        next = pick(usableActions, anim)
      }
    }
  }
  anim = next
  animOnce = true
  animLoop = false
  switchTo(next, { once: true })
  if (isMove) {
    currentMode = 'move'
    // 移动驱动在视频加载完成后启动（switchTo onReady 里调用），
    // 这样可以使用视频真实时长，避免动画还没播完就提前停下。
  }
  // 随机动作/走动播放时，给出与动作匹配的可爱气泡描述。
  if (next !== IDLE) {
    const copy = ACTION_COPY[next] || `大肥鱼正在${next}~`
    showManualBubble(copy, '大肥鱼的小剧场~', 4200)
  }
}

function playState(state, { pulse = false } = {}) {
  stopMove()
  currentMode = pulse ? 'pulse' : 'state'
  const pool = STATE_ANIMS[state] || STATE_ANIMS.IDLE
  const next = state === 'IDLE' ? IDLE : pick(pool, anim)
  anim = next
  // 非空闲状态动画循环播放，避免播完一帧后停在原地；空闲状态仍走随机动画链。
  animLoop = !pulse && state !== 'IDLE'
  animOnce = !animLoop
  switchTo(next, { once: !animLoop, loop: animLoop })
}

function playClick() {
  stopMove()
  currentMode = 'click'
  const next = pick(CLICKS, anim)
  anim = next
  animOnce = true
  animLoop = false
  switchTo(next, { once: true })
  showManualBubble(CLICK_COPY[next] || '大肥鱼被戳了一下~', '大肥鱼的小剧场~', 2500)
}

function playDrag() {
  stopMove()
  currentMode = 'drag'
  anim = DRAG
  animOnce = true
  animLoop = false
  switchTo(DRAG, { once: true })
}

// ---------- 走动效果 ----------
function tryMove(moveName) {
  if (moveRef !== null || movePlan) return true
  const W = window.innerWidth
  const H = window.innerHeight
  const minX = -(HIT_BOX.x0 / 640 * size)
  const maxX = W - (HIT_BOX.x1 / 640 * size)
  const minY = 0
  const maxY = H - size * 9 / 16

  // “原地漂浮踏步”面朝观众，适合稍微向屏幕下方（朝用户）移动一点。
  if (moveName === '原地漂浮踏步') {
    const distance = randomBetween(40, 90)
    const targetY = petPos.y + distance
    if (targetY > maxY) return false
    movePlan = { startX: petPos.x, targetX: petPos.x, startY: petPos.y, targetY }
    return true
  }

  const dir = Math.random() < 0.5 ? -1 : 1
  const distance = randomBetween(200, 450)
  const targetX = petPos.x + dir * distance
  if (targetX < minX || targetX > maxX) return false
  // 让角色面朝移动方向，避免“向左跑却镜像成向右”的错乱。
  facing = dir > 0 ? 'right' : 'left'
  movePlan = { startX: petPos.x, targetX, startY: petPos.y, targetY: petPos.y }
  return true
}

function startMoveDrive() {
  if (!movePlan) return
  const plan = movePlan
  const el = currentVideo()
  const duration = Number.isFinite(el?.duration) && el.duration > 0 ? el.duration : 9
  // 每个动作的“开头不动/结尾不动”时长不同，按动作单独配置。
  const timing = MOVE_TIMING[anim] || { lead: 1.5, tail: 2 }
  const lead = timing.lead
  const tail = timing.tail
  const travelWindow = Math.max(0.1, duration - lead - tail)
  const token = ++moveToken
  const step = () => {
    if (moveToken !== token || !movePlan) return
    const t = el.currentTime || 0
    let x = plan.startX
    let y = plan.startY ?? petPos.y
    if (t > lead && t < duration - tail) {
      const progress = Math.min(1, Math.max(0, (t - lead) / travelWindow))
      x = plan.startX + (plan.targetX - plan.startX) * progress
      y = (plan.startY ?? petPos.y) + ((plan.targetY ?? petPos.y) - (plan.startY ?? petPos.y)) * progress
    } else if (t >= duration - tail) {
      x = plan.targetX
      y = plan.targetY ?? petPos.y
    }
    petPos.x = x
    petPos.y = y
    applyPetPosition()
    if (t < duration - tail) {
      moveRef = requestAnimationFrame(step)
    } else {
      moveRef = null
      movePlan = null
    }
  }
  moveRef = requestAnimationFrame(step)
}

function stopMove() {
  movePlan = null
  moveToken++
  if (moveRef !== null) {
    cancelAnimationFrame(moveRef)
    moveRef = null
  }
}

function clearIdleDelay() {
  if (idleDelayTimer) {
    clearTimeout(idleDelayTimer)
    idleDelayTimer = null
  }
}

function scheduleNextIdle() {
  clearIdleDelay()
  if (CONFIG.actionDelayMs > 0) {
    idleDelayTimer = setTimeout(() => {
      idleDelayTimer = null
      playIdle()
    }, CONFIG.actionDelayMs)
  } else {
    playIdle()
  }
}

function handleEnded() {
  if (dragging || dragState.active) return
  if (overlay && overlay.state) {
    // 脉冲动画播完但 TTL 未结束：气泡保留，动画先回到 resume 状态。
    if (!overlay.animationDone) {
      overlay.animationDone = true
      applyResume()
    }
    return
  }
  if (currentMode === 'click') {
    applyResume()
    return
  }
  if (currentMode === 'move') {
    stopMove()
    scheduleNextIdle()
    return
  }
  if (currentMode === 'state') {
    const state = overlay ? overlay.state : currentState
    if (state && state !== 'IDLE') {
      playState(state)
      return
    }
    scheduleNextIdle()
    return
  }
  if (anim === TURN) {
    facing = facing === 'left' ? 'right' : 'left'
  }
  scheduleNextIdle()
}

function applyResume() {
  const state = resumeState || currentState || 'IDLE'
  currentState = state
  // 强制清掉可能卡住的切换状态，确保拖拽结束后一定切回正常动画。
  pending = null
  if (state === 'IDLE') {
    // 任务刚结束/拖拽结束后先回到纯待机，避免随机链立刻播放“思考类”动画。
    status = {
      ...status,
      state: 'IDLE',
      message: resumeMessage || '大肥鱼在这儿等新任务哦~',
      detail: resumeDetail || '大肥鱼 · 等待下一次任务',
    }
    currentMode = 'idle'
    anim = IDLE
    animOnce = true
    animLoop = false
    switchTo(IDLE, { once: true })
  } else {
    status = {
      ...status,
      state,
      message: resumeMessage || status.message,
      detail: resumeDetail || status.detail,
    }
    playState(state)
  }
  updateBubble()
}

function clearOverlay() {
  if (overlayTimer) clearTimeout(overlayTimer)
  overlayTimer = null
  overlay = null
  lastPulseKey = null
}

// ---------- 消息处理 ----------
function applyStateMessage(message) {
  const state = message.state || 'IDLE'
  status = {
    state,
    message: message.message || status.message,
    detail: message.detail || status.detail,
    project: message.project || status.project,
    task: message.task || status.task,
    progress: message.progress || status.progress,
  }
  currentState = state
  resumeState = state
  resumeMessage = message.message || ''
  resumeDetail = message.detail || ''
  clearOverlay()
  if (state === 'IDLE') playIdle()
  else playState(state)
  updateBubble()
}

function applyPulseMessage(message) {
  const state = message.state || 'SUCCESS'
  resumeState = message.resumeState || currentState || 'IDLE'
  resumeMessage = message.resumeMessage || ''
  resumeDetail = message.resumeDetail || ''
  overlay = {
    state,
    message: message.message || '',
    detail: message.detail || '',
    ttlMs: Number(message.ttlMs || 1800),
    animationDone: false,
  }
  lastPulseKey = `${state}:${message.expiresAt || message.ttlMs || 1800}`
  currentState = state
  if (state === 'SUCCESS') {
    window.petBridge.beep()
    shakePet()
  }
  playState(state, { pulse: true })
  if (overlayTimer) clearTimeout(overlayTimer)
  overlayTimer = setTimeout(() => {
    clearOverlay()
    applyResume()
  }, overlay.ttlMs)
  updateBubble()
}

function applyTaskMessage(message) {
  status.task = message.task || status.task
  status.progress = message.progress || status.progress
  status.project = message.project || status.project
  status.message = message.message || status.message
  status.detail = message.detail || status.detail
  updateBubble()
}

function applyTasksMessage(message) {
  tasks = Array.isArray(message.tasks) ? message.tasks : []
  updateBubble()
}

// ---------- 喂食/互动反馈 ----------
function showManualBubble(message, detail, ttl = 2200) {
  if (manualBubbleTimer) clearTimeout(manualBubbleTimer)
  manualBubble = { message, detail, expiresAt: Date.now() + ttl }
  manualBubbleTimer = setTimeout(() => {
    manualBubble = null
    manualBubbleTimer = null
    updateBubble()
  }, ttl)
  updateBubble()
}

function feedPet() {
  const next = pick(EAT_ANIMS, anim)
  anim = next
  animOnce = true
  animLoop = false
  currentMode = 'click' // 复用“一次性动画播完回当前状态”的路径
  switchTo(next, { once: true })
  showManualBubble('谢谢投喂大肥鱼~', '吃饱了更有力气干活！', 2200)
}

function shakePet() {
  const originX = petPos.x
  const originY = petPos.y
  const offsets = [[6, 0], [-6, 0], [4, 0], [-4, 0], [2, 0], [-2, 0], [0, 0]]
  let index = 0
  const timer = setInterval(() => {
    if (index >= offsets.length) {
      clearInterval(timer)
      applyPetPosition()
      return
    }
    const [dx, dy] = offsets[index++]
    rootEl.style.left = (originX + dx) + 'px'
    rootEl.style.top = (originY + dy) + 'px'
  }, 30)
}

// ---------- 番茄钟 ----------
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function playAlarm() {
  try {
    const audio = new Audio(ALARM_URL)
    audio.volume = 0.8
    audio.play().catch(() => {})
  } catch {
    // 音频不可用时静默失败
  }
}

function startPomodoro(mode, minutes) {
  stopPomodoro()
  const durationMs = Math.max(1, minutes) * 60 * 1000
  pomodoro = { mode, endAt: Date.now() + durationMs, durationMs }
  pomodoroTimer = setInterval(updatePomodoro, 1000)
  updateBubble()
}

function stopPomodoro() {
  if (pomodoroTimer) clearInterval(pomodoroTimer)
  pomodoroTimer = null
  pomodoro = null
  updateBubble()
}

function updatePomodoro() {
  if (!pomodoro) return
  const remaining = pomodoro.endAt - Date.now()
  if (remaining <= 0) {
    completePomodoro()
    return
  }
  updateBubble()
}

function completePomodoro() {
  const mode = pomodoro?.mode || 'work'
  stopPomodoro()
  playAlarm()
  shakePet()
  showManualBubble(
    mode === 'work' ? '🍅 大肥鱼番茄钟结束啦！' : '☕ 大肥鱼休息结束啦！',
    mode === 'work' ? '快休息一下，摸摸鱼~' : '继续加油，大肥鱼陪你！',
    4000,
  )
  playClick()
}

// ---------- 气泡 ----------
function visibleState() {
  if (overlay) return overlay.state
  if (tasks.length >= 2) return status.state
  return status.state || 'IDLE'
}

function updateBubble() {
  const state = visibleState()
  const manualActive = manualBubble && manualBubble.expiresAt > Date.now()
  const pomodoroActive = pomodoro && pomodoro.endAt > Date.now()
  const shouldShow = pomodoroActive || manualActive
    ? CONFIG.bubbleMode !== 'hidden'
    : CONFIG.bubbleMode === 'always'
      || (CONFIG.bubbleMode === 'custom' && CONFIG.bubbleStates.includes(state))
      || (CONFIG.bubbleMode === 'custom' && tasks.length >= 2 && tasks.some((t) => CONFIG.bubbleStates.includes(t.state)))
  if (CONFIG.bubbleMode === 'hidden' || !shouldShow) {
    bubbleEl.classList.remove('visible')
    return
  }
  let title = ''
  let detail = ''
  if (pomodoroActive) {
    const remaining = Math.max(0, pomodoro.endAt - Date.now())
    const label = pomodoro.mode === 'work' ? '🍅 番茄钟' : '☕ 休息'
    title = `${label} ${formatTime(remaining)}`
    detail = pomodoro.mode === 'work' ? '大肥鱼专注中，冲鸭~' : '大肥鱼摸鱼中，放松一下~'
  } else if (manualActive) {
    title = manualBubble.message
    detail = manualBubble.detail || ''
  } else if (tasks.length >= 2) {
    title = `${tasks.length} 个任务进行中`
    detail = tasks.slice(0, 3).map((t) => `${t.state || ''} · ${t.project || t.task || t.message || ''}`).join('；')
  } else if (overlay && overlay.message) {
    title = overlay.message
    detail = overlay.detail || status.detail || ''
  } else if (status.message) {
    title = status.message
    detail = status.detail || ''
  } else {
    title = '大肥鱼正在摸鱼中~'
    detail = ''
  }
  // 余额显示：优先展示 DeepSeek 账户余额，不再显示 Token。
  if (balance && balance.total !== undefined && balance.total !== null) {
    const symbol = balance.currency === 'CNY' ? '¥' : balance.currency === 'USD' ? '$' : `${balance.currency} `
    const balanceText = `余额 ${symbol}${balance.total}`
    detail = detail ? `${detail} · ${balanceText}` : balanceText
  }
  bubbleTitle.textContent = title
  bubbleDetail.textContent = detail
  bubbleEl.style.transform = `translateX(-50%) scale(${CONFIG.bubbleScale})`
  bubbleEl.classList.add('visible')
}

// ---------- 交互 ----------
const DRAG_THRESHOLD = 5

// 让透明窗口只在宠物/菜单区域接收鼠标，其余区域点击穿透到下层应用。
function updateClickThrough() {
  const rect = hitEl.getBoundingClientRect()
  const inside = lastMouse.x >= rect.left && lastMouse.x <= rect.right
    && lastMouse.y >= rect.top && lastMouse.y <= rect.bottom
  const menuVisible = menuEl.classList.contains('visible')
  const ignore = !inside && !dragging && !dragState.active && !menuVisible
  window.petBridge.setIgnoreMouse(ignore)
}

document.addEventListener('mousemove', (e) => {
  lastMouse = { x: e.clientX, y: e.clientY }
  updateClickThrough()
})

function startDrag(e) {
  stopMove()
  e.currentTarget.classList.add('dragging')
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* 忽略捕获失败 */ }
  dragState = {
    active: true,
    dragging: false,
    pointerId: e.pointerId,
    sx: e.screenX,
    sy: e.screenY,
    lastX: e.screenX,
    lastY: e.screenY,
  }
  window.petBridge.setIgnoreMouse(false)
}

function moveDrag(e) {
  const d = dragState
  if (!d.active) return
  const totalDx = e.screenX - d.sx
  const totalDy = e.screenY - d.sy
  if (!d.dragging) {
    if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD) return
    d.dragging = true
    dragging = true
    playDrag()
    showManualBubble('大肥鱼被拎起来啦！', '快放我下来~', 3000)
  }
  // 在全屏透明画布内移动宠物 DOM，避免移动窗口导致的指针事件问题。
  const dx = e.movementX || 0
  const dy = e.movementY || 0
  if (dx || dy) {
    // 按角色实际命中区域贴边，而不是按整个透明舞台贴边，
    // 这样宠物可以真正拖到屏幕最左/最右。
    const hitLeft = HIT_BOX.x0 / 640 * size
    const hitRight = HIT_BOX.x1 / 640 * size
    const minX = -hitLeft
    const maxX = window.innerWidth - hitRight
    petPos.x = Math.min(Math.max(petPos.x + dx, minX), maxX)
    petPos.y = Math.min(Math.max(petPos.y + dy, 0), window.innerHeight - size * 9 / 16)
    applyPetPosition()
  }
}

function endDrag(e) {
  const d = dragState
  if (!d.active) return
  const wasDragging = d.dragging
  dragState = { active: false, dragging: false, sx: 0, sy: 0, lastX: 0, lastY: 0 }
  dragging = false
  window.petBridge.endDrag()
  if (e.currentTarget && e.currentTarget.classList) {
    e.currentTarget.classList.remove('dragging')
  } else {
    hitEl.classList.remove('dragging')
  }
  if (wasDragging) {
    justDragged = true
    setTimeout(() => { justDragged = false }, 100)
    applyResume()
    showManualBubble('终于放我下来啦~', '', 2000)
  }
  updateClickThrough()
}

hitEl.addEventListener('pointerdown', startDrag)
hitEl.addEventListener('pointermove', moveDrag)
// 即使 pointerup 因为窗口移动没有落在宠物元素上，也要保证拖拽状态被重置。
window.addEventListener('pointerup', endDrag)
window.addEventListener('pointercancel', endDrag)
hitEl.addEventListener('lostpointercapture', endDrag)

hitEl.addEventListener('click', (e) => {
  if (dragState.active || dragging || justDragged) return
  playClick()
})

hitEl.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  showMenu(e.clientX, e.clientY)
})

function addMenuButton(label, onClick) {
  const button = document.createElement('button')
  button.textContent = label
  button.addEventListener('click', onClick)
  menuEl.appendChild(button)
  return button
}

function showMenu(x, y) {
  lastMenuPos = { x, y }
  menuEl.innerHTML = ''
  if (menuPage === 'pomodoro') {
    renderPomodoroSettings()
  } else if (menuPage === 'actions') {
    renderActionSettings()
  } else if (menuPage === 'appearance') {
    renderAppearanceSettings()
  } else {
    renderMainMenu()
  }
  // 外层菜单不滚动，动作列表等长内容由内部子面板自己滚动，避免出现双滚动条。
  menuEl.style.maxHeight = 'none'
  menuEl.style.overflowY = 'visible'
  menuEl.classList.add('visible')
  // 让菜单向右上方展开，避开宠物模型；再根据实际尺寸夹在屏幕内。
  const rect = menuEl.getBoundingClientRect()
  let left = x + 24
  let top = y - rect.height - 12
  left = Math.max(4, Math.min(left, window.innerWidth - rect.width - 4))
  top = Math.max(4, Math.min(top, window.innerHeight - rect.height - 4))
  menuEl.style.left = left + 'px'
  menuEl.style.top = top + 'px'
  window.petBridge.setIgnoreMouse(false)
}

function renderMainMenu() {
  addMenuButton('喂食', () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    feedPet()
  })
  addMenuButton(`开始番茄钟 ${CONFIG.workMinutes}分`, () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    startPomodoro('work', CONFIG.workMinutes)
  })
  addMenuButton(`开始短休息 ${CONFIG.breakMinutes}分`, () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    startPomodoro('break', CONFIG.breakMinutes)
  })
  if (pomodoro) {
    addMenuButton('停止番茄钟', () => {
      menuEl.classList.remove('visible')
      updateClickThrough()
      stopPomodoro()
    })
  }
  addMenuButton('番茄钟设置', () => {
    menuPage = 'pomodoro'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
  addMenuButton('行为设置', () => {
    menuPage = 'appearance'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
  // 选择待机动作：鼠标悬停展开，移开自动关闭。
  const actionWrap = document.createElement('div')
  actionWrap.style.cssText = 'position:static'
  const actionBtn = document.createElement('button')
  actionBtn.textContent = '选择待机动作'
  const actionFlyout = document.createElement('div')
  actionFlyout.style.cssText = 'margin-top:4px;background:#fff;border:1px solid #e3e5e8;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:8px;max-height:70vh;overflow-y:auto;display:none'
  actionBtn.addEventListener('mouseenter', () => {
    renderActionFlyoutContent(actionFlyout)
    actionFlyout.style.display = 'block'
  })
  actionWrap.addEventListener('mouseleave', (e) => {
    if (!actionFlyout.contains(e.relatedTarget)) actionFlyout.style.display = 'none'
  })
  actionFlyout.addEventListener('mouseleave', (e) => {
    if (!actionWrap.contains(e.relatedTarget)) actionFlyout.style.display = 'none'
  })
  actionWrap.appendChild(actionBtn)
  actionWrap.appendChild(actionFlyout)
  menuEl.appendChild(actionWrap)
  addMenuButton(CONFIG.roastEnabled ? '关闭自动吐槽' : '开启自动吐槽', () => {
    const next = !CONFIG.roastEnabled
    CONFIG.roastEnabled = next
    window.petBridge.saveConfig({ roastEnabled: next })
    menuEl.classList.remove('visible')
    updateClickThrough()
  })
  addMenuButton(CONFIG.walkEnabled ? '关闭行走' : '开启行走', () => {
    const next = !CONFIG.walkEnabled
    CONFIG.walkEnabled = next
    window.petBridge.saveConfig({ walkEnabled: next })
    menuEl.classList.remove('visible')
    updateClickThrough()
  })
  addMenuButton('让大肥鱼吐槽一下', () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    window.petBridge.requestRoast()
  })
  addMenuButton('打开 DSH 桌面版', () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    window.petBridge.openDesktop()
  })
  addMenuButton('本次隐藏', () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    window.petBridge.hide()
  })
  addMenuButton('本次关闭', () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    window.petBridge.close('user')
  })
}

function renderPomodoroSettings() {
  addMenuButton('← 返回主菜单', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
  const workInput = document.createElement('input')
  workInput.type = 'number'
  workInput.min = 1
  workInput.max = 120
  workInput.value = String(CONFIG.workMinutes)
  workInput.style.width = '80px'

  const breakInput = document.createElement('input')
  breakInput.type = 'number'
  breakInput.min = 1
  breakInput.max = 60
  breakInput.value = String(CONFIG.breakMinutes)
  breakInput.style.width = '80px'

  const workRow = document.createElement('div')
  workRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0'
  workRow.append('工作时长(分)', workInput)

  const breakRow = document.createElement('div')
  breakRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0'
  breakRow.append('休息时长(分)', breakInput)

  menuEl.append(workRow, breakRow)

  addMenuButton('保存', () => {
    const work = Math.min(120, Math.max(1, Number(workInput.value) || 25))
    const rest = Math.min(60, Math.max(1, Number(breakInput.value) || 5))
    CONFIG.workMinutes = work
    CONFIG.breakMinutes = rest
    window.petBridge.saveConfig({ workMinutes: work, breakMinutes: rest })
    menuPage = 'main'
    menuEl.classList.remove('visible')
    updateClickThrough()
    updateBubble()
  })
  addMenuButton('返回', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
}

function renderAppearanceSettings() {
  addMenuButton('← 返回主菜单', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })

  const sizeInput = document.createElement('input')
  sizeInput.type = 'number'
  sizeInput.min = 100
  sizeInput.max = 1000
  sizeInput.step = 10
  sizeInput.value = String(CONFIG.petSize)
  sizeInput.style.width = '80px'

  const moveInput = document.createElement('input')
  moveInput.type = 'range'
  moveInput.min = 0
  moveInput.max = 100
  moveInput.step = 1
  moveInput.value = String(CONFIG.moveChance)
  moveInput.style.width = '120px'

  const delayInput = document.createElement('input')
  delayInput.type = 'range'
  delayInput.min = 0
  delayInput.max = 5000
  delayInput.step = 100
  delayInput.value = String(CONFIG.actionDelayMs)
  delayInput.style.width = '120px'

  const row = (label, input, hint) => {
    const div = document.createElement('div')
    div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;font-size:12px'
    const left = document.createElement('span')
    left.textContent = label
    div.append(left, input)
    if (hint) {
      const small = document.createElement('small')
      small.textContent = hint
      small.style.cssText = 'display:block;opacity:.65;font-size:11px'
      div.appendChild(small)
    }
    return div
  }

  menuEl.append(
    row('宠物宽度(px)', sizeInput, '重启后生效'),
    row(`移动频繁度 ${moveInput.value}%`, moveInput),
    row(`动作切换间隔 ${delayInput.value}ms`, delayInput),
  )
  moveInput.addEventListener('input', () => {
    const label = moveInput.parentElement
    label.firstChild.textContent = `移动频繁度 ${moveInput.value}%`
  })
  delayInput.addEventListener('input', () => {
    const label = delayInput.parentElement
    label.firstChild.textContent = `动作切换间隔 ${delayInput.value}ms`
  })

  addMenuButton('保存', () => {
    CONFIG.petSize = Math.min(1000, Math.max(100, Math.round(Number(sizeInput.value) / 10) * 10 || 460))
    CONFIG.moveChance = Math.min(100, Math.max(0, Number(moveInput.value) || 0))
    CONFIG.actionDelayMs = Math.min(5000, Math.max(0, Number(delayInput.value) || 0))
    window.petBridge.saveConfig({
      petSize: CONFIG.petSize,
      moveChance: CONFIG.moveChance,
      actionDelayMs: CONFIG.actionDelayMs,
    })
    menuPage = 'main'
    menuEl.classList.remove('visible')
    updateClickThrough()
  })
  addMenuButton('返回', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
}

function renderActionSettings() {
  // 空数组 = 全部动作，所以 UI 里初始化为全选。
  addMenuButton('← 返回主菜单', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
  const working = CONFIG.enabledActions.length > 0 ? CONFIG.enabledActions.slice() : ACTS.slice()
  const list = document.createElement('div')
  list.style.cssText = 'max-height:70vh;overflow-y:auto;margin:4px 0'

  const addToggle = (name) => {
    const label = document.createElement('label')
    label.style.cssText = 'display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px;cursor:pointer'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = working.includes(name)
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!working.includes(name)) working.push(name)
      } else {
        const index = working.indexOf(name)
        if (index >= 0) working.splice(index, 1)
      }
    })
    label.append(checkbox, name)
    list.appendChild(label)
  }

  ACTS.forEach(addToggle)
  menuEl.append(list)

  addMenuButton('全部动作', () => {
    working.length = 0
    working.push(...ACTS)
    for (const input of list.querySelectorAll('input')) input.checked = true
  })
  addMenuButton('保存', () => {
    // 全选时保存空数组 = 全部动作；否则保存勾选子集。
    const next = working.length === ACTS.length ? [] : working.slice()
    CONFIG.enabledActions = next
    window.petBridge.saveConfig({ enabledActions: next })
    menuPage = 'main'
    menuEl.classList.remove('visible')
    updateClickThrough()
  })
  addMenuButton('返回', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
}

function renderActionFlyoutContent(panel) {
  panel.innerHTML = ''
  const working = CONFIG.enabledActions.length > 0 ? CONFIG.enabledActions.slice() : ACTS.slice()
  const list = document.createElement('div')
  list.style.cssText = 'max-height:60vh;overflow-y:auto;margin:2px 0'
  ACTS.forEach((name) => {
    const label = document.createElement('label')
    label.style.cssText = 'display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px;cursor:pointer'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = working.includes(name)
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!working.includes(name)) working.push(name)
      } else {
        const index = working.indexOf(name)
        if (index >= 0) working.splice(index, 1)
      }
    })
    label.append(checkbox, name)
    list.appendChild(label)
  })
  panel.appendChild(list)

  const row = document.createElement('div')
  row.style.cssText = 'display:flex;gap:6px;margin-top:4px'
  const allBtn = document.createElement('button')
  allBtn.textContent = '全部动作'
  allBtn.addEventListener('click', () => {
    working.length = 0
    working.push(...ACTS)
    for (const input of panel.querySelectorAll('input')) input.checked = true
  })
  const saveBtn = document.createElement('button')
  saveBtn.textContent = '保存'
  saveBtn.addEventListener('click', () => {
    const next = working.length === ACTS.length ? [] : working.slice()
    CONFIG.enabledActions = next
    window.petBridge.saveConfig({ enabledActions: next })
    panel.style.display = 'none'
  })
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '关闭'
  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none'
  })
  row.append(allBtn, saveBtn, closeBtn)
  panel.appendChild(row)
}

document.addEventListener('click', (e) => {
  if (!menuEl.contains(e.target)) {
    menuEl.classList.remove('visible')
    updateClickThrough()
  }
})

// ---------- 状态订阅 ----------
function applyStatus(incoming) {
  if (!incoming || typeof incoming !== 'object') return

  if (incoming.config) {
    CONFIG.bubbleMode = incoming.config.bubbleMode || CONFIG.bubbleMode
    CONFIG.bubbleStates = Array.isArray(incoming.config.bubbleStates) ? incoming.config.bubbleStates : CONFIG.bubbleStates
    CONFIG.reducedMotion = incoming.config.reducedMotion === true
    CONFIG.activityLevel = incoming.config.activityLevel || CONFIG.activityLevel
    CONFIG.bubbleScale = Number(incoming.config.bubbleScale || CONFIG.bubbleScale)
    CONFIG.workMinutes = Number(incoming.config.workMinutes) || CONFIG.workMinutes
    CONFIG.breakMinutes = Number(incoming.config.breakMinutes) || CONFIG.breakMinutes
    CONFIG.roastEnabled = incoming.config.roastEnabled === true
    CONFIG.walkEnabled = incoming.config.walkEnabled !== false
    CONFIG.enabledActions = Array.isArray(incoming.config.enabledActions) ? incoming.config.enabledActions : []
    CONFIG.actionOrder = Array.isArray(incoming.config.actionOrder) ? incoming.config.actionOrder : []
    CONFIG.petSize = Number(incoming.config.petSize) || CONFIG.petSize
    CONFIG.moveChance = Number(incoming.config.moveChance) ?? CONFIG.moveChance
    CONFIG.actionDelayMs = Number(incoming.config.actionDelayMs) ?? CONFIG.actionDelayMs
    CONFIG.scale = Number(incoming.config.scale) || CONFIG.scale
    applySize()
  }

  if (incoming.tokenUsage) {
    tokenUsage = {
      inputTokens: Number(incoming.tokenUsage.inputTokens) || 0,
      outputTokens: Number(incoming.tokenUsage.outputTokens) || 0,
      totalTokens: Number(incoming.tokenUsage.totalTokens) || 0,
    }
  }

  if (incoming.balance) {
    balance = {
      currency: incoming.balance.currency || 'CNY',
      total: incoming.balance.total,
      granted: incoming.balance.granted,
      toppedUp: incoming.balance.toppedUp,
      isAvailable: incoming.balance.isAvailable !== false,
      updatedAt: incoming.balance.updatedAt,
    }
  } else if (incoming.balance === null) {
    balance = null
  }

  if (incoming.roast && incoming.roast !== lastRoast) {
    roast = incoming.roast
    lastRoast = incoming.roast
    showManualBubble(roast, '大肥鱼吐槽time~', 5000)
  }

  if (incoming.pulse) {
    // 同一个脉冲持续轮询时不要反复重播动画。
    const pulseKey = `${incoming.pulse.state}:${incoming.pulse.expiresAt || incoming.pulse.ttlMs || 1800}`
    if (lastPulseKey === pulseKey) {
      if (overlay) {
        overlay.message = incoming.pulse.message || overlay.message
        overlay.detail = incoming.pulse.detail || overlay.detail
      }
      updateBubble()
      return
    }
    applyPulseMessage(incoming.pulse)
    return
  }

  if (incoming.tasks && incoming.tasks.length >= 2) {
    tasks = incoming.tasks
  } else if (incoming.tasks) {
    tasks = incoming.tasks
  }

  const nextState = incoming.state || 'IDLE'
  if (nextState !== currentState) {
    applyStateMessage({
      state: nextState,
      message: incoming.message,
      detail: incoming.detail,
      project: incoming.project,
      task: incoming.task,
      progress: incoming.progress,
    })
  } else {
    // 状态没变：只更新气泡文案/任务信息，不打断当前动画。
    status = {
      ...status,
      state: nextState,
      message: incoming.message ?? status.message,
      detail: incoming.detail ?? status.detail,
      project: incoming.project ?? status.project,
      task: incoming.task ?? status.task,
      progress: incoming.progress ?? status.progress,
    }
    updateBubble()
  }
}

window.petBridge.onStatus((status) => {
  applyStatus(status)
})

// ---------- 启动 ----------
playIdle()
updateBubble()
updateClickThrough()

// 看门狗：万一 video 的 ended 事件或 loop 没有按预期工作，这里兜底，
// 避免宠物停在最后一帧。
setInterval(() => {
  if (pending) return
  const el = currentVideo()
  if (!el || !el.ended) return
  if (animLoop) {
    el.currentTime = 0
    el.play().catch(() => {})
  } else if (!dragging && !dragState.active) {
    handleEnded()
  }
}, 500)
