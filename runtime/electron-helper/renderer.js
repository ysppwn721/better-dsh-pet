/**
 * better-dsh-pet desktop helper renderer —— 透明窗口里的宠物本体。
 *
 * 使用纯 DOM + 双 video 缓冲播放 better-dsh-pet 的 WebM 动画；接收主进程转发的
 * Companion 消息，根据 DSH 状态切换动画并显示气泡。
 */

// ---------- 配置 ----------
const params = new URLSearchParams(location.search)
const CONFIG = {
  enabled: params.get('enabled') !== '0',
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
  playbackRate: Number(params.get('playbackRate') || '1'),
  voiceEnabled: params.get('voiceEnabled') !== '0',
  voiceWakeAutoStart: params.get('voiceWakeAutoStart') === '1',
  voiceSilenceMs: Number(params.get('voiceSilenceMs') || '1200'),
  voiceAutoSend: params.get('voiceAutoSend') !== '0',
  voiceAutoRecord: params.get('voiceAutoRecord') !== '0',
  holidayEnabled: params.get('holidayEnabled') === '1',
  wakeWord: params.get('wakeWord') || '大肥鱼',
  taskCwd: params.get('taskCwd') || '',
}

// ---------- 资源根 ----------
const ASSET_BASE = new URL('../../assets/thumb/', location.href).href
const FESTIVAL_GIF_BASE = new URL('../../assets/preview/', location.href).href
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

// 情绪系统：根据状态和互动累积情绪，影响空闲动作和气泡。
const EMOTION_ACTION_POOLS = {
  tired: ['原地小憩沉眠', '打瞌睡被惊醒', '哈欠连天', '超大伸懒腰'],
  happy: ['轻快摇摆舞', '可爱宅舞', '优雅女仆舞', '点击回应-开心跃动'],
  anxious: ['东张西望', '被吓一跳', '原地敲击桌面互动', '深度思考碎碎念'],
  bored: ['原地漂浮踏步', '原地专心玩魔方', '三球抛接', '荡秋千'],
}
const EMOTION_BUBBLES = {
  tired: ['好累啊，让我趴一会儿…', '眼睛快睁不开了…', '今天也是辛苦的一天呢…'],
  happy: ['今天心情超好！', '嘿嘿，开心！', '想转圈圈~'],
  anxious: ['有点小紧张…', '这个任务没问题吧？', '别急别急，我在想…'],
  bored: ['好无聊啊…', '有没有鱼干吃？', '什么时候有新任务呀…'],
}
const EMOTION_BAR_META = [
  { key: 'mood', label: '心情', color: '#ff6b6b', format: (v) => `${v > 0 ? '+' : ''}${Math.round(v)}` },
  { key: 'energy', label: '精力', color: '#4ecdc4', format: (v) => `${Math.round(v)}` },
  { key: 'anxiety', label: '焦虑', color: '#f9ca24', format: (v) => `${Math.round(v)}` },
  { key: 'boredom', label: '无聊', color: '#a29bfe', format: (v) => `${Math.round(v)}` },
]
// 互动/状态对情绪的具体数值（便于后续在 UI 里展示“+12 精力”这类反馈）。
const EMOTION_DELTAS = {
  click: { mood: 6, energy: 3, anxiety: -3, boredom: -4 },
  feed: { mood: 12, energy: 10, anxiety: -5, boredom: -8 },
  pomodoro: { mood: 18, energy: 8, anxiety: -6, boredom: -10 },
  stateIdle: { mood: -1, energy: -1, anxiety: -2, boredom: 3 },
  stateThinking: { mood: 0, energy: -2, anxiety: 2, boredom: -2 },
  stateWorking: { mood: 1, energy: -3, anxiety: 0, boredom: -3 },
  stateWaiting: { mood: -1, energy: -1, anxiety: 3, boredom: 2 },
  stateSuccess: { mood: 12, energy: 5, anxiety: -8, boredom: -10 },
  stateError: { mood: -10, energy: -4, anxiety: 10, boredom: -4 },
}

const LUNAR_DATE_FORMAT = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'numeric', day: 'numeric' })
const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
const FESTIVAL_AUTO_PLAY_KEY = 'better-dsh-pet:festival-auto-play'
const FESTIVAL_DEFS = [
  { id: 'solar-new-year', calendar: 'solar', label: '元旦', greeting: '元旦快乐', detail: '大肥鱼给你送上新年祝福~', month: 1, day: 1, anim: '放烟花' },
  { id: 'lunar-spring-festival', calendar: 'lunar', label: '春节', greeting: '春节快乐', detail: '大肥鱼给你拜年啦~', month: '正月', day: 1, anim: '写福字' },
  { id: 'lunar-lantern', calendar: 'lunar', label: '元宵节', greeting: '元宵节快乐', detail: '记得吃碗热乎乎的汤圆~', month: '正月', day: 15, anim: '吃汤圆' },
  { id: 'solar-labor', calendar: 'solar', label: '劳动节', greeting: '劳动节快乐', detail: '今天也要好好休息一下~', month: 5, day: 1, anim: '轻快记录' },
  { id: 'solar-childrens', calendar: 'solar', label: '儿童节', greeting: '儿童节快乐', detail: '今天可以多一点开心和胡闹~', month: 6, day: 1, anim: '荡秋千' },
  { id: 'lunar-dragon-boat', calendar: 'lunar', label: '端午节', greeting: '端午安康', detail: '记得吃粽子、挂香囊~', month: '五月', day: 5, anim: '吃粽子' },
  { id: 'lunar-qixi', calendar: 'lunar', label: '七夕节', greeting: '七夕快乐', detail: '今天也要甜甜的~', month: '七月', day: 7, anim: '穿针乞巧' },
  { id: 'lunar-mid-autumn', calendar: 'lunar', label: '中秋节', greeting: '中秋快乐', detail: '一起赏月吃月饼吧~', month: '八月', day: 15, anim: '中秋赏月吃月饼', gif: 'zhongqiu-shangyue-chi-yuebing' },
  { id: 'lunar-double-ninth', calendar: 'lunar', label: '重阳节', greeting: '重阳节快乐', detail: '记得登高赏菊~', month: '九月', day: 9, anim: '插茱萸赏菊' },
  { id: 'lunar-laba', calendar: 'lunar', label: '腊八节', greeting: '腊八节快乐', detail: '喝一碗热腊八粥暖暖身~', month: '腊月', day: 8, anim: '吃腊八粥' },
  { id: 'solar-national', calendar: 'solar', label: '国庆节', greeting: '国庆节快乐', detail: '一起热热闹闹庆祝一下~', month: 10, day: 1, anim: '放烟花' },
  { id: 'solar-christmas', calendar: 'solar', label: '圣诞节', greeting: '圣诞快乐', detail: '给你送上节日礼物~', month: 12, day: 25, anim: '装点圣诞树' },
]

function getSolarDateKey(date = new Date()) {
  return `${date.getMonth() + 1}-${date.getDate()}`
}

function getFestivalAutoPlayDateKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function parseLunarNumber(value) {
  const text = String(value || '').replace(/[年月日\s]/g, '').replace(/^初/, '')
  if (!text) return 0
  if (/^\d+$/.test(text)) return Number(text)
  if (text === '正') return 1
  if (text === '冬') return 11
  if (text === '腊') return 12
  const digits = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  if (text.startsWith('廿')) return 20 + (digits[text.slice(1)] || 0)
  if (text.startsWith('卅')) return 30 + (digits[text.slice(1)] || 0)
  const tenIndex = text.indexOf('十')
  if (tenIndex >= 0) {
    const tens = tenIndex === 0 ? 1 : (digits[text.slice(0, tenIndex)] || 0)
    const ones = digits[text.slice(tenIndex + 1)] || 0
    return tens * 10 + ones
  }
  return digits[text] || 0
}

function normalizeLunarMonth(value) {
  const raw = String(value || '').trim()
  const leap = raw.startsWith('闰')
  const text = leap ? raw.slice(1) : raw
  const number = parseLunarNumber(text)
  const name = LUNAR_MONTH_NAMES[number - 1] || text
  return leap ? `闰${name}` : name
}

function getLunarDateParts(date = new Date()) {
  const parts = {}
  for (const part of LUNAR_DATE_FORMAT.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return {
    month: normalizeLunarMonth(parts.month || ''),
    day: parseLunarNumber(parts.day || 0),
    dayText: parts.day || '',
  }
}

function isLunarNewYearsEve(date = new Date()) {
  const today = getLunarDateParts(date)
  if (today.month !== '腊月') return false
  const tomorrow = new Date(date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const next = getLunarDateParts(tomorrow)
  return next.month === '正月' && next.day === 1
}

function getFestivalMatches(date = new Date()) {
  const matches = []
  const solarKey = getSolarDateKey(date)
  const lunar = getLunarDateParts(date)
  for (const festival of FESTIVAL_DEFS) {
    if (festival.calendar === 'solar') {
      if (solarKey === `${festival.month}-${festival.day}`) matches.push(festival)
      continue
    }
    if (normalizeLunarMonth(festival.month) === lunar.month && festival.day === lunar.day) matches.push(festival)
  }
  if (isLunarNewYearsEve(date)) {
    matches.unshift({
      id: 'lunar-new-years-eve',
      calendar: 'lunar',
      label: '除夕',
      greeting: '除夕快乐',
      detail: '今晚一起守岁吧~',
      month: '腊月',
      day: 'eve',
      anim: '放烟花',
    })
  }
  return matches
}

function getFestivalById(id) {
  return getFestivalMatches().find((festival) => festival.id === id) || null
}

function getFestivalAssetUrl(name) {
  return new URL(encodeURIComponent(name) + '.gif', FESTIVAL_GIF_BASE).href
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
const settingsPanel = document.getElementById('settings-panel')
const chatPanel = document.getElementById('chat-panel')
const festivalImage = document.createElement('img')
const festivalVideo = document.createElement('video')

for (const el of [festivalImage, festivalVideo]) {
  el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;opacity:0;transition:opacity .18s ease;z-index:2'
  el.setAttribute('aria-hidden', 'true')
  el.draggable = false
}
festivalVideo.muted = true
festivalVideo.playsInline = true
festivalVideo.autoplay = true
festivalVideo.loop = false
festivalVideo.preload = 'auto'
stageEl.append(festivalImage, festivalVideo)

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
// 情绪：mood -100~100（负=低落，正=开心），energy 0~100，anxiety 0~100，boredom 0~100
let emotion = { mood: 0, energy: 100, anxiety: 0, boredom: 0 }
let wakeWordEnabled = false
let festivalPlayToken = 0
let festivalActive = false
let currentFestival = null
let festivalAutoPlayDone = false
let lastFestivalPlayToken = null
let festivalTimer = null
let settingsFestivalTimer = null
const FESTIVAL_GIF_DISPLAY_MS = 7000

// ---------- 工具 ----------
const randomBetween = (min, max) => Math.floor(min + Math.random() * (max - min))
const parseList = (text) => String(text || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean)
const pick = (pool, exclude) => {
  const entries = exclude ? pool.filter((n) => n !== exclude) : pool
  return entries[Math.floor(Math.random() * entries.length)]
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function updateEmotion(delta) {
  emotion.mood = clamp(emotion.mood + (delta.mood ?? 0), -100, 100)
  emotion.energy = clamp(emotion.energy + (delta.energy ?? 0), 0, 100)
  emotion.anxiety = clamp(emotion.anxiety + (delta.anxiety ?? 0), 0, 100)
  emotion.boredom = clamp(emotion.boredom + (delta.boredom ?? 0), 0, 100)
}

function dominantEmotion() {
  if (emotion.energy < 25) return 'tired'
  if (emotion.anxiety >= 60) return 'anxious'
  if (emotion.boredom >= 60) return 'bored'
  if (emotion.mood >= 50) return 'happy'
  return 'calm'
}

function applyStateEmotion(state) {
  const key = `state${state}`
  const delta = EMOTION_DELTAS[key]
  if (delta) updateEmotion(delta)
}

function applyInteractionEmotion(kind) {
  const delta = EMOTION_DELTAS[kind]
  if (delta) updateEmotion(delta)
}

function pickEmotionAction(usableActions, exclude) {
  const dominant = dominantEmotion()
  const pool = EMOTION_ACTION_POOLS[dominant]
  if (dominant !== 'calm' && pool && pool.length && Math.random() < 0.5) {
    const candidate = pick(pool, exclude)
    if (candidate && (usableActions.includes(candidate) || CONFIG.enabledActions.length === 0)) {
      return candidate
    }
  }
  return pick(usableActions, exclude)
}

function emotionBubbleIfAny() {
  const dominant = dominantEmotion()
  if (dominant === 'calm') return null
  const texts = EMOTION_BUBBLES[dominant]
  if (!texts || !texts.length || Math.random() >= 0.35) return null
  return pick(texts)
}

function assetUrl(name) {
  return new URL(encodeURIComponent(name) + '.webm', ASSET_BASE).href
}

function stopFestivalPlayback() {
  festivalPlayToken++
  festivalActive = false
  currentFestival = null
  if (festivalTimer) {
    clearTimeout(festivalTimer)
    festivalTimer = null
  }
  festivalImage.classList.remove('is-front')
  festivalVideo.classList.remove('is-front')
  festivalImage.style.opacity = '0'
  festivalVideo.style.opacity = '0'
  festivalVideo.onended = null
  festivalVideo.pause()
  festivalVideo.removeAttribute('src')
  festivalVideo.load()
  festivalImage.removeAttribute('src')
}

function startFestivalPlayback(festival) {
  if (!festival) return false
  const token = ++festivalPlayToken
  festivalActive = true
  currentFestival = festival
  // 统一使用 WebM 动画播放节日祝福（包内不包含 GIF 资源，避免左上角裂图）
  festivalImage.removeAttribute('src')
  festivalImage.style.opacity = '0'
  festivalVideo.src = assetUrl(festival.anim || IDLE)
  festivalVideo.loop = false
  festivalVideo.playbackRate = CONFIG.playbackRate
  festivalVideo.onended = () => {
    if (festivalPlayToken !== token) return
    festivalVideo.classList.remove('is-front')
    festivalVideo.style.opacity = '0'
    festivalVideo.onended = null
    if (festivalActive && currentFestival?.id === festival.id) {
      festivalActive = false
      currentFestival = null
      if (currentMode === 'idle') playIdle()
      else applyResume()
    }
  }
  festivalVideo.classList.add('is-front')
  festivalVideo.style.opacity = '1'
  festivalVideo.load()
  festivalVideo.play().catch(() => {})
  return true
}

function playFestivalGreeting(festival) {
  if (!festival || !CONFIG.holidayEnabled) return false
  stopFestivalPlayback()
  clearIdleDelay()
  stopMove()
  // 直接复用宠物主视频播放节日动画，替换当前画面，而不是在宠物上方叠加
  currentMode = 'festival'
  anim = festival.anim || IDLE
  animOnce = true
  animLoop = false
  switchTo(anim, { once: true })
  const title = festival.greeting || festival.label || '节日快乐'
  const detail = festival.detail || '大肥鱼给你送上祝福~'
  showManualBubble(title, detail, 5000)
  festivalAutoPlayDone = true
  return true
}

function getTodayFestival(date = new Date()) {
  return getFestivalMatches(date).at(0) || null
}

function getActiveFestival() {
  return CONFIG.holidayEnabled ? getTodayFestival() : null
}

function syncFestivalAutoPlay() {
  const festival = getTodayFestival()
  if (!festival) {
    festivalAutoPlayDone = false
    return null
  }
  // 每次启动只自动播放一次：首次由 maybeAutoPlayFestival 播放并置 true，
  // 之后的状态轮询不会重置该标记，避免动画不断从头重播。
  return festival
}

function maybeAutoPlayFestival() {
  if (!CONFIG.holidayEnabled) return false
  const festival = syncFestivalAutoPlay()
  if (!festival || festivalAutoPlayDone || festivalActive) return false
  return playFestivalGreeting(festival, { auto: true })
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
  el.playbackRate = CONFIG.playbackRate
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
  const canMove = CONFIG.walkEnabled && !CONFIG.reducedMotion
  if (order.length > 0) {
    next = order[actionOrderIndex % order.length]
    actionOrderIndex++
    if (MOVES.includes(next)) {
      if (canMove && tryMove(next)) isMove = true
      else next = IDLE
    }
  } else {
    // 移动频繁度 = 每次待机决策时尝试走动的概率（可关闭）。
    // 活跃程度会缩放这个概率：quiet 更低，lively 更高。
    const activity = CONFIG.activityLevel === 'quiet' ? 0.6 : CONFIG.activityLevel === 'lively' ? 1.4 : 1
    const effectiveMoveChance = Math.min(100, CONFIG.moveChance * activity)
    const moveCandidate = pick(MOVES, anim)
    if (canMove && Math.random() * 100 < effectiveMoveChance && tryMove(moveCandidate)) {
      next = moveCandidate
      isMove = true
    } else {
      const roll = Math.random()
      if (CONFIG.activityLevel === 'quiet') {
        if (roll < 0.5) next = IDLE
        else if (roll < 0.6) next = TURN
        else next = pickEmotionAction(usableActions, anim)
      } else if (CONFIG.activityLevel === 'lively') {
        if (roll < 0.15) next = IDLE
        else if (roll < 0.3) next = TURN
        else next = pickEmotionAction(usableActions, anim)
      } else {
        if (roll < 0.3) next = IDLE
        else if (roll < 0.4) next = TURN
        else next = pickEmotionAction(usableActions, anim)
      }
    }
  }
  anim = next
  animOnce = true
  animLoop = false
  if (isMove) currentMode = 'move'
  switchTo(next, { once: true })
  // 移动驱动在视频加载完成后启动（switchTo onReady 里调用），
  // 这样可以使用视频真实时长，避免动画还没播完就提前停下。
  // 随机动作/走动播放时，给出与动作匹配的可爱气泡描述；情绪强烈时优先说情绪台词。
  if (next !== IDLE) {
    const emotionCopy = emotionBubbleIfAny()
    const copy = emotionCopy || ACTION_COPY[next] || `大肥鱼正在${next}~`
    showManualBubble(copy, emotionCopy ? '大肥鱼的心情~' : '大肥鱼的小剧场~', 4200)
  }
}

function playState(state, { pulse = false } = {}) {
  clearIdleDelay()
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
  clearIdleDelay()
  stopMove()
  currentMode = 'click'
  applyInteractionEmotion('click')
  const next = pick(CLICKS, anim)
  anim = next
  animOnce = true
  animLoop = false
  switchTo(next, { once: true })
  showManualBubble(CLICK_COPY[next] || '大肥鱼被戳了一下~', '大肥鱼的小剧场~', 2500)
}

function playDrag() {
  clearIdleDelay()
  stopMove()
  currentMode = 'drag'
  anim = DRAG
  animOnce = false
  animLoop = true
  // 拖拽可能持续超过单段动画时长，必须循环播放，否则松手前会定格在最后一帧。
  switchTo(DRAG, { loop: true })
}

// ---------- 走动效果 ----------
function tryMove(moveName) {
  if (moveRef !== null || movePlan) return false
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
    // 等待“动作切换间隔”时不要定格在上一动作的最后一帧：
    // 先播放循环待机呼吸，等间隔结束再进入下一个随机/自定义动作。
    currentMode = 'idle'
    anim = IDLE
    animOnce = false
    animLoop = true
    switchTo(IDLE, { loop: true })
    // 让“动作间隔”肉眼可见：等待期间显示一个小气泡。
    showManualBubble('休息一下~', `间隔 ${CONFIG.actionDelayMs}ms`, Math.min(CONFIG.actionDelayMs, 3000))
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
  if (currentMode === 'festival') {
    festivalActive = false
    currentFestival = null
    scheduleNextIdle()
    updateBubble()
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
  applyStateEmotion(state)
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
  applyStateEmotion(state)
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
  clearIdleDelay()
  applyInteractionEmotion('feed')
  const next = pick(EAT_ANIMS, anim)
  anim = next
  animOnce = true
  animLoop = false
  currentMode = 'click' // 复用“一次性动画播完回当前状态”的路径
  switchTo(next, { once: true })
  showManualBubble('谢谢投喂大肥鱼~', '吃饱了更有力气干活！', 2200)
}

function shakePet() {
  if (CONFIG.reducedMotion) return
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
  clearIdleDelay()
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
  applyInteractionEmotion('pomodoro')
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
    bubbleEl.style.pointerEvents = 'none'
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
  bubbleEl.style.pointerEvents = 'auto'
  bubbleEl.classList.add('visible')
}

// ---------- 交互 ----------
const DRAG_THRESHOLD = 5

// 让透明窗口只在宠物/菜单区域接收鼠标，其余区域点击穿透到下层应用。
function updateClickThrough() {
  const rect = hitEl.getBoundingClientRect()
  let inside = lastMouse.x >= rect.left && lastMouse.x <= rect.right
    && lastMouse.y >= rect.top && lastMouse.y <= rect.bottom
  // 气泡可见时也允许点击（用于点击刷新余额）。
  if (bubbleEl.classList.contains('visible')) {
    const b = bubbleEl.getBoundingClientRect()
    inside = inside || (lastMouse.x >= b.left && lastMouse.x <= b.right
      && lastMouse.y >= b.top && lastMouse.y <= b.bottom)
  }
  const overlayVisible = menuEl.classList.contains('visible')
    || settingsPanel.classList.contains('visible')
    || chatPanel.classList.contains('visible')
  const ignore = !inside && !dragging && !dragState.active && !overlayVisible
  window.petBridge.setIgnoreMouse(ignore)
}

document.addEventListener('mousemove', (e) => {
  lastMouse = { x: e.clientX, y: e.clientY }
  updateClickThrough()
})

function startDrag(e) {
  clearIdleDelay()
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

// 点击余额气泡可手动刷新余额。
bubbleEl.addEventListener('click', (e) => {
  e.stopPropagation()
  window.petBridge.refreshBalance()
  showManualBubble('余额刷新中~', '', 1500)
})

function addMenuButton(label, onClick) {
  const button = document.createElement('button')
  button.textContent = label
  button.addEventListener('click', onClick)
  menuEl.appendChild(button)
  return button
}

function showMenu(x, y) {
  clearIdleDelay()
  lastMenuPos = { x, y }
  menuEl.innerHTML = ''
  if (menuPage === 'pomodoro') {
    renderPomodoroSettings()
  } else if (menuPage === 'actions') {
    renderActionSettings()
  } else if (menuPage === 'appearance') {
    renderAppearanceSettings()
  } else if (menuPage === 'settings') {
    renderSettingsPage()
  } else if (menuPage === 'features') {
    renderFeatureSettings()
  } else {
    renderMainMenu()
  }
  // 设置页内容多，允许菜单内滚动；主菜单保持不滚动。
  if (menuPage === 'settings') {
    menuEl.style.maxHeight = '80vh'
    menuEl.style.overflowY = 'auto'
  } else {
    menuEl.style.maxHeight = 'none'
    menuEl.style.overflowY = 'visible'
  }
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

function renderEmotionBars(container) {
  const panel = document.createElement('div')
  panel.style.cssText = 'padding:8px 10px;background:#f7f8fa;border-radius:10px;margin-bottom:6px;display:grid;gap:4px'
  for (const meta of EMOTION_BAR_META) {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px'
    const label = document.createElement('span')
    label.textContent = meta.label
    label.style.cssText = 'width:28px;color:#555'
    const barWrap = document.createElement('div')
    barWrap.style.cssText = 'flex:1;height:8px;background:#e8e8e8;border-radius:4px;overflow:hidden'
    const bar = document.createElement('div')
    const raw = emotion[meta.key]
    const percent = meta.key === 'mood' ? (raw + 100) / 2 : raw
    bar.style.cssText = `width:${Math.max(0, Math.min(100, percent))}%;height:100%;background:${meta.color};transition:width .3s`
    barWrap.appendChild(bar)
    const value = document.createElement('span')
    value.textContent = meta.format(raw)
    value.style.cssText = 'width:34px;text-align:right;color:#333'
    row.append(label, barWrap, value)
    panel.appendChild(row)
  }
  container.appendChild(panel)
}

function renderSettingsPanelContent() {
  const bubbleStatesText = Array.isArray(CONFIG.bubbleStates) ? CONFIG.bubbleStates.join(', ') : ''
  const todayFestival = getTodayFestival()
  const festivalButtonLabel = todayFestival ? `播放${todayFestival.label}` : '今日无节日'
  const festivalButtonDisabled = !todayFestival || !CONFIG.holidayEnabled
  settingsPanel.innerHTML = `
    <h2>🐳 Better DSH Pet 设置</h2>
    <div class="settings-section">
      <h3>情绪状态</h3>
      <div id="settings-emotion-bars"></div>
    </div>
    <div class="settings-section">
      <h3>外观与行为</h3>
      <div class="field"><label>宠物宽度</label><input type="number" id="set-petSize" min="100" max="1000" step="10" value="${CONFIG.petSize}"></div>
      <div class="field"><label>移动频繁度</label><input type="range" id="set-moveChance" min="0" max="100" step="1" value="${CONFIG.moveChance}"><span id="set-moveChance-val">${CONFIG.moveChance}%</span></div>
      <div class="field"><label>动作间隔</label><input type="range" id="set-actionDelayMs" min="0" max="5000" step="100" value="${CONFIG.actionDelayMs}"><span id="set-actionDelayMs-val">${CONFIG.actionDelayMs}ms</span></div>
      <div class="field"><label>播放速度</label><input type="range" id="set-playbackRate" min="1" max="2" step="0.1" value="${CONFIG.playbackRate}"><span id="set-playbackRate-val">${CONFIG.playbackRate}x</span></div>
      <div class="field"><label>活跃程度</label><select id="set-activityLevel">
        <option value="quiet" ${CONFIG.activityLevel === 'quiet' ? 'selected' : ''}>安静</option>
        <option value="normal" ${CONFIG.activityLevel === 'normal' ? 'selected' : ''}>标准</option>
        <option value="lively" ${CONFIG.activityLevel === 'lively' ? 'selected' : ''}>活泼</option>
      </select></div>
      <div class="field"><label>减少动态</label><span class="checkbox-field"><input type="checkbox" id="set-reducedMotion" ${CONFIG.reducedMotion ? 'checked' : ''}> 开启</span></div>
      <div class="field"><label>允许行走</label><span class="checkbox-field"><input type="checkbox" id="set-walkEnabled" ${CONFIG.walkEnabled ? 'checked' : ''}> 开启</span></div>
    </div>
    <div class="settings-section">
      <h3>番茄钟</h3>
      <div class="field"><label>工作时长</label><input type="number" id="set-workMinutes" min="1" max="120" step="1" value="${CONFIG.workMinutes}"></div>
      <div class="field"><label>休息时长</label><input type="number" id="set-breakMinutes" min="1" max="60" step="1" value="${CONFIG.breakMinutes}"></div>
    </div>
    <div class="settings-section">
      <h3>动作</h3>
      <div class="field"><label>待机动作</label><textarea id="set-enabledActions" placeholder="留空=全部动作，逗号分隔">${Array.isArray(CONFIG.enabledActions) ? CONFIG.enabledActions.join(', ') : ''}</textarea></div>
      <div class="field"><label>播放顺序</label><textarea id="set-actionOrder" placeholder="留空=随机，逗号分隔">${Array.isArray(CONFIG.actionOrder) ? CONFIG.actionOrder.join(', ') : ''}</textarea></div>
    </div>
    <div class="settings-section">
      <h3>功能</h3>
      <div class="field"><label>自动吐槽</label><span class="checkbox-field"><input type="checkbox" id="set-roastEnabled" ${CONFIG.roastEnabled ? 'checked' : ''}> 开启</span></div>
      <div class="field"><label>节日祝福</label><span class="checkbox-field"><input type="checkbox" id="set-holidayEnabled" ${CONFIG.holidayEnabled ? 'checked' : ''}> 开启</span></div>
      <div class="field"><label>气泡模式</label><select id="set-bubbleMode">
        <option value="always" ${CONFIG.bubbleMode === 'always' ? 'selected' : ''}>常驻显示</option>
        <option value="hidden" ${CONFIG.bubbleMode === 'hidden' ? 'selected' : ''}>完全隐藏</option>
        <option value="custom" ${CONFIG.bubbleMode === 'custom' ? 'selected' : ''}>自定义</option>
      </select></div>
      <div class="field"><label>自定义气泡状态</label><textarea id="set-bubbleStates" placeholder="如 SUCCESS,ERROR,WAITING">${bubbleStatesText}</textarea></div>
    </div>
    <div class="settings-section" id="settings-festival-section">
      <h3>今日节日</h3>
      <div class="field"><label>节日名称</label><span id="set-festival-label">${todayFestival ? todayFestival.label : '今日无节日'}</span></div>
      <div class="field"><label>节日祝福</label><button id="set-festival-play" type="button" ${festivalButtonDisabled ? 'disabled' : ''} style="padding:6px 10px;border:1px solid #d8d8d8;border-radius:6px;background:${festivalButtonDisabled ? '#f0f1f4' : '#f5f6f8'};cursor:${festivalButtonDisabled ? 'not-allowed' : 'pointer'}">${festivalButtonLabel}</button></div>
    </div>
    <div class="actions">
      <button id="settings-save">保存</button>
      <button id="settings-close" class="secondary">关闭</button>
    </div>
  `
  renderEmotionBars(settingsPanel.querySelector('#settings-emotion-bars'))

  const bindRange = (id, valId, suffix) => {
    const input = settingsPanel.querySelector(id)
    const output = settingsPanel.querySelector(valId)
    input.addEventListener('input', () => { output.textContent = `${input.value}${suffix}` })
  }
  bindRange('#set-moveChance', '#set-moveChance-val', '%')
  bindRange('#set-actionDelayMs', '#set-actionDelayMs-val', 'ms')
  bindRange('#set-playbackRate', '#set-playbackRate-val', 'x')

  settingsPanel.querySelector('#settings-close').addEventListener('click', closeSettings)
  settingsPanel.querySelector('#settings-save').addEventListener('click', saveSettingsPanel)
  settingsPanel.querySelector('#set-festival-play').addEventListener('click', () => {
    const festival = getTodayFestival()
    if (festival) playFestivalGreeting(festival)
  })
}

function updateSettingsFestivalSection() {
  if (!settingsPanel.classList.contains('visible')) return
  const todayFestival = getTodayFestival()
  const labelEl = settingsPanel.querySelector('#set-festival-label')
  const buttonEl = settingsPanel.querySelector('#set-festival-play')
  if (labelEl) labelEl.textContent = todayFestival ? todayFestival.label : '今日无节日'
  if (!buttonEl) return
  const disabled = !todayFestival || !CONFIG.holidayEnabled
  buttonEl.textContent = todayFestival ? `播放${todayFestival.label}` : '今日无节日'
  buttonEl.disabled = disabled
  buttonEl.style.background = disabled ? '#f0f1f4' : '#f5f6f8'
  buttonEl.style.cursor = disabled ? 'not-allowed' : 'pointer'
}

function saveSettingsPanel() {
  const val = (id) => settingsPanel.querySelector(id)
  const number = (id, fallback, min, max) => {
    const raw = Number(val(id).value)
    return Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : fallback))
  }
  const petSize = Math.round(number('#set-petSize', CONFIG.petSize, 100, 1000) / 10) * 10
  const moveChance = number('#set-moveChance', CONFIG.moveChance, 0, 100)
  const actionDelayMs = number('#set-actionDelayMs', CONFIG.actionDelayMs, 0, 5000)
  const playbackRate = number('#set-playbackRate', CONFIG.playbackRate, 1, 2)
  const activityLevel = val('#set-activityLevel').value
  const reducedMotion = val('#set-reducedMotion').checked
  const walkEnabled = val('#set-walkEnabled').checked
  const workMinutes = number('#set-workMinutes', CONFIG.workMinutes, 1, 120)
  const breakMinutes = number('#set-breakMinutes', CONFIG.breakMinutes, 1, 60)
  const roastEnabled = val('#set-roastEnabled').checked
  const holidayEnabled = val('#set-holidayEnabled').checked
  const bubbleMode = val('#set-bubbleMode').value
  const bubbleStates = parseList(val('#set-bubbleStates').value)
  const enabledActions = parseList(val('#set-enabledActions').value)
  const actionOrder = parseList(val('#set-actionOrder').value)

  Object.assign(CONFIG, {
    petSize, moveChance, actionDelayMs, playbackRate, activityLevel,
    reducedMotion, walkEnabled, workMinutes, breakMinutes, roastEnabled,
    holidayEnabled,
    bubbleMode, bubbleStates, enabledActions, actionOrder,
  })
  for (const video of [videoA, videoB]) {
    if (video) video.playbackRate = playbackRate
  }
  applySize()
  window.petBridge.saveConfig({
    petSize, moveChance, actionDelayMs, playbackRate, activityLevel,
    reducedMotion, walkEnabled, workMinutes, breakMinutes, roastEnabled,
    holidayEnabled,
    bubbleMode, bubbleStates, enabledActions, actionOrder,
  })
  if (holidayEnabled) maybeAutoPlayFestival()
  closeSettings()
}

function openSettings() {
  renderSettingsPanelContent()
  settingsPanel.classList.add('visible')
  updateSettingsFestivalSection()
  if (!settingsFestivalTimer) {
    settingsFestivalTimer = setInterval(updateSettingsFestivalSection, 60 * 1000)
    settingsFestivalTimer.unref?.()
  }
  window.petBridge.setIgnoreMouse(false)
}

function closeSettings() {
  settingsPanel.classList.remove('visible')
  if (settingsFestivalTimer) {
    clearInterval(settingsFestivalTimer)
    settingsFestivalTimer = null
  }
  updateClickThrough()
}

let chatMessages = []
let chatAppendMsg = null
let chatDictationPending = false
function renderChatPanel() {
  chatPanel.innerHTML = `
    <div class="chat-header"><span>🐳 和大肥鱼闲聊</span><span class="chat-close">✕</span></div>
    <div class="chat-messages"></div>
    <div class="chat-input-row"><span id="chat-mic">🎤</span><input placeholder="说点什么…"><span>发送</span></div>
  `
  const close = chatPanel.querySelector('.chat-close')
  close.onmousedown = (e) => { e.preventDefault(); closeChat() }
  const header = chatPanel.querySelector('.chat-header')
  let chatDrag = null
  header.onmousedown = (e) => {
    if (e.target.classList.contains('chat-close')) return
    e.preventDefault()
    chatDrag = {
      startX: e.clientX,
      startY: e.clientY,
      left: chatPanel.offsetLeft,
      top: chatPanel.offsetTop,
    }
    const onMove = (ev) => {
      if (!chatDrag) return
      const dx = ev.clientX - chatDrag.startX
      const dy = ev.clientY - chatDrag.startY
      chatPanel.style.left = Math.max(0, Math.min(window.innerWidth - 100, chatDrag.left + dx)) + 'px'
      chatPanel.style.top = Math.max(0, Math.min(window.innerHeight - 60, chatDrag.top + dy)) + 'px'
    }
    const onUp = () => {
      chatDrag = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const messagesEl = chatPanel.querySelector('.chat-messages')
  const input = chatPanel.querySelector('input')
  const send = chatPanel.querySelector('.chat-input-row span:last-child')
  const mic = chatPanel.querySelector('#chat-mic')
  if (CONFIG.voiceEnabled === false) mic.style.display = 'none'
  const appendMsg = (role, text) => {
    const div = document.createElement('div')
    div.className = `chat-msg ${role}`
    div.textContent = text
    messagesEl.appendChild(div)
    messagesEl.scrollTop = messagesEl.scrollHeight
  }
  chatAppendMsg = appendMsg
  for (const msg of chatMessages) appendMsg(msg.role, msg.content)
  const doSend = async (text) => {
    const content = String(text || input.value || '').trim()
    if (!content) return
    input.value = ''
    appendMsg('user', content)
    chatMessages.push({ role: 'user', content })
    appendMsg('pet', '正在想…')
    const result = await window.petBridge.sendChat(content)
    const reply = result?.reply || '大肥鱼走神了，再说一遍吧~'
    const last = messagesEl.querySelector('.chat-msg.pet:last-child')
    if (last) last.textContent = reply
    chatMessages.push({ role: 'assistant', content: reply })
    messagesEl.scrollTop = messagesEl.scrollHeight

  }
  mic.onmousedown = async (e) => {
    e.preventDefault()
    if (senseRecording) {
      appendMsg('pet', '正在停止录音…')
      await stopSenseRecording()
      return
    }
    if (chatDictationPending) return
    chatDictationPending = true
    appendMsg('pet', '我在听，请说话…')
    try {
      await startSenseRecording()
    } catch {
      // 本地录音不可用时，回退到 SAPI 命令/听写
      chatDictationPending = false
      appendMsg('pet', '本地录音不可用，切换系统识别…')
      window.petBridge.startDictation()
    }
  }
  send.onmousedown = (e) => { e.preventDefault(); void doSend() }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void doSend() })
}
function openChat() {
  renderChatPanel()
  chatPanel.style.left = Math.max(0, Math.round((window.innerWidth - 420) / 2)) + 'px'
  chatPanel.style.top = Math.max(0, Math.round((window.innerHeight - 520) / 2)) + 'px'
  chatPanel.style.transform = 'none'
  chatPanel.classList.add('visible')
  window.petBridge.setIgnoreMouse(false)
}
function closeChat() {
  chatPanel.classList.remove('visible')
  updateClickThrough()
}

async function sendChatText(content) {
  const text = String(content || '').trim()
  if (!text) return
  if (chatAppendMsg) chatAppendMsg('user', text)
  chatMessages.push({ role: 'user', content: text })
  if (chatAppendMsg) chatAppendMsg('pet', '正在想…')
  const result = await window.petBridge.sendChat(text)
  const reply = result?.reply || '大肥鱼走神了，再说一遍吧~'
  if (chatPanel && chatPanel.classList.contains('visible')) {
    const messagesEl = chatPanel.querySelector('.chat-messages')
    const last = messagesEl?.querySelector('.chat-msg.pet:last-child')
    if (last) last.textContent = reply
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight
  }
  chatMessages.push({ role: 'assistant', content: reply })
  // 连续对话：回复播完后自动开始听下一句
  if (CONFIG.voiceAutoRecord !== false && CONFIG.voiceEnabled !== false && chatPanel.classList.contains('visible') && !senseRecording) {
    setTimeout(async () => {
      try {
        await startSenseRecording()
        if (chatAppendMsg) chatAppendMsg('pet', '我在，请说~')
      } catch {
        // 自动续听失败时静默，用户可手动点 🎤
      }
    }, 800)
  }
}

function matchRuleCommand(text) {
  const t = String(text || '')
  if (t.includes('停止番茄钟')) return { action: 'pomodoro_stop' }
  if (t.includes('开始番茄钟') || t.includes('番茄钟')) return { action: 'pomodoro_start' }
  if (t.includes('喂食') || t.includes('吃饭')) return { action: 'feed' }
  if (t.includes('隐藏')) return { action: 'hide' }
  if (t.includes('关闭') || t.includes('退出')) return { action: 'close' }
  if (t.includes('余额')) return { action: 'balance' }
  if (t.includes('吐槽')) return { action: 'roast' }
  if (t.includes('设置')) return { action: 'settings' }
  if (t.includes('打开') && (t.includes('网页') || t.includes('浏览器') || t.includes('网站'))) return { action: 'open_web' }
  if (t.includes('提醒')) return { action: 'remind' }
  if (t.includes('左边') || t.includes('左侧') || t.includes('左面')) return { action: 'move_pet', args: { position: 'left' } }
  if (t.includes('右边') || t.includes('右侧') || t.includes('右面')) return { action: 'move_pet', args: { position: 'right' } }
  if (t.includes('中间') || t.includes('居中')) return { action: 'move_pet', args: { position: 'center' } }
  if (t.includes('上面') || t.includes('顶部') || t.includes('上方')) return { action: 'move_pet', args: { position: 'top' } }
  if (t.includes('下面') || t.includes('底部') || t.includes('下方')) return { action: 'move_pet', args: { position: 'bottom' } }
  return null
}

function executeAction(action, args = {}) {
  switch (action) {
    case 'pomodoro_start':
      startPomodoro('work', CONFIG.workMinutes)
      showManualBubble('收到，开始番茄钟~', `${CONFIG.workMinutes} 分钟`, 3000)
      return true
    case 'pomodoro_stop':
      stopPomodoro()
      showManualBubble('番茄钟已停止~', '', 2500)
      return true
    case 'feed':
      feedPet()
      return true
    case 'hide':
      window.petBridge.hide()
      return true
    case 'close':
      window.petBridge.close('user')
      return true
    case 'balance':
      window.petBridge.refreshBalance()
      showManualBubble('正在刷新余额~', '', 2000)
      return true
    case 'roast':
      window.petBridge.requestRoast()
      return true
    case 'settings':
      menuPage = 'settings'
      showMenu(lastMenuPos.x, lastMenuPos.y)
      return true
    case 'open_web':
      window.petBridge.openWebUi(args.url || CONFIG.webuiUrl)
      showManualBubble('正在打开…', args.url || CONFIG.webuiUrl || '', 2000)
      return true
    case 'move_pet': {
      const position = args.position || 'left'
      const minX = -(HIT_BOX.x0 / 640 * size)
      const maxX = window.innerWidth - (HIT_BOX.x1 / 640 * size)
      const maxY = window.innerHeight - size * 9 / 16
      if (position === 'left') petPos.x = minX
      else if (position === 'right') petPos.x = maxX
      else if (position === 'center') petPos.x = Math.max(minX, Math.min(maxX, (window.innerWidth - size) / 2))
      else if (position === 'top') petPos.y = 0
      else if (position === 'bottom') petPos.y = maxY
      applyPetPosition()
      showManualBubble('好的，我挪过去~', position, 2000)
      return true
    }
    case 'remind': {
      const minutes = Number(args.minutes) || 10
      const text = args.text || '该做事啦'
      showManualBubble(`好的，${minutes}分钟后提醒你`, text, 3000)
      return true
    }
    default:
      return false
  }
}

async function handleUserSpeech(text) {
  const content = String(text || '').trim()
  if (!content) return
  // 先走本地规则命令，零 Token、零上下文污染
  const rule = matchRuleCommand(content)
  if (rule && executeAction(rule.action, rule.args)) return
  // 再走独立 LLM 意图分类（不带闲聊历史）
  const result = await window.petBridge.classifyIntent(content)
  if (result?.type === 'command' && result.action && executeAction(result.action, result.args)) return
  // 复杂任务：交给独立任务执行（方案三，当前为隔离 LLM 执行）
  if (result?.type === 'task' || (result?.type === 'command' && result.action)) {
    const taskText = result.task || content
    if (chatAppendMsg) chatAppendMsg('pet', '好的，我来处理这个任务…')
    const taskResult = await window.petBridge.executeTask(taskText)
    const reply = taskResult?.result || '任务执行完成'
    if (chatAppendMsg) chatAppendMsg('pet', reply)
    return
  }
  // 都不是任务 → 进入闲聊（独立上下文）
  await sendChatText(content)
}


let senseRecording = null
let senseChunks = []

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Uint8Array(buffer)
}

function resampleLinear(input, fromRate, toRate) {
  if (input.length === 0) return new Float32Array(0)
  const ratio = fromRate / toRate
  const outputLength = Math.max(1, Math.round(input.length / ratio))
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio
    const index = Math.floor(pos)
    const frac = pos - index
    const a = input[Math.min(index, input.length - 1)]
    const b = input[Math.min(index + 1, input.length - 1)]
    output[i] = a + (b - a) * frac
  }
  return output
}

async function startSenseRecording() {
  if (senseRecording) return
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const audioContext = new AudioContext({ sampleRate: 16000 })
  const source = audioContext.createMediaStreamSource(stream)
  const scriptNode = audioContext.createScriptProcessor(4096, 1, 1)
  senseChunks = []
  let hasVoice = false
  let lastVoice = 0
  const startTime = Date.now()
  let autoStopped = false
  scriptNode.onaudioprocess = (event) => {
    const data = event.inputBuffer.getChannelData(0)
    senseChunks.push(new Float32Array(data))
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
    const rms = Math.sqrt(sum / data.length)
    if (rms > 0.012) {
      hasVoice = true
      lastVoice = Date.now()
    }
    // 自动断句：检测到人声后，静音超过设定时长自动停止并转写
    const silenceMs = CONFIG.voiceSilenceMs || 1200
    if (hasVoice && !autoStopped && Date.now() - lastVoice > silenceMs && Date.now() - startTime > 800) {
      autoStopped = true
      scriptNode.onaudioprocess = null
      setTimeout(() => {
        if (senseRecording) void stopSenseRecording(CONFIG.voiceAutoSend !== false)
      }, 0)
    }
  }
  source.connect(scriptNode)
  scriptNode.connect(audioContext.destination)
  senseRecording = { stream, audioContext, source, scriptNode }
}

async function stopSenseRecording(autoSend = false) {
  if (!senseRecording) return
  const { stream, audioContext, source, scriptNode } = senseRecording
  senseRecording = null
  try {
    scriptNode.disconnect()
    source.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    await audioContext.close()
  } catch {
    // 忽略清理异常
  }
  const sampleRate = audioContext.sampleRate || 16000
  let samples = new Float32Array(senseChunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let offset = 0
  for (const chunk of senseChunks) {
    samples.set(chunk, offset)
    offset += chunk.length
  }
  senseChunks = []
  if (sampleRate !== 16000) samples = resampleLinear(samples, sampleRate, 16000)
  const wav = encodeWav(samples, 16000)
  chatDictationPending = false
  if (chatAppendMsg) chatAppendMsg('pet', '识别中…')
  const result = await window.petBridge.transcribe(wav.buffer)
  const text = result?.text || ''
  if (!text) {
    const error = result?.error || ''
    if (chatAppendMsg) chatAppendMsg('pet', error ? `识别失败：${error}` : '没听清，再说一次吧~')
    return
  }
  if (autoSend) {
    await handleUserSpeech(text)
    return
  }
  if (chatPanel && chatPanel.classList.contains('visible')) {
    const input = chatPanel.querySelector('input')
    if (input) {
      input.value = text
      input.focus()
      if (chatAppendMsg) chatAppendMsg('pet', `识别到：${text}\n可修改后按回车发送`)
      return
    }
  }
  await handleDictationResult(text)
}

async function handleDictationResult(text) {
  chatDictationPending = false
  const content = String(text || '').trim()
  if (!content) {
    if (chatAppendMsg) chatAppendMsg('pet', '没听清，再说一次吧~')
    return
  }
  // 识别结果先放进输入框，让用户确认/修改后再发送，避免错字直接发给大肥鱼。
  if (chatPanel && chatPanel.classList.contains('visible')) {
    const input = chatPanel.querySelector('input')
    if (input) {
      input.value = content
      input.focus()
      if (chatAppendMsg) chatAppendMsg('pet', `识别到：${content}\n可修改后按回车发送`)
      return
    }
  }
  // 极端情况：聊天窗已关闭时，直接作为消息发送。
  if (chatAppendMsg) chatAppendMsg('user', content)
  chatMessages.push({ role: 'user', content })
  if (chatAppendMsg) chatAppendMsg('pet', '正在想…')
  const result = await window.petBridge.sendChat(content)
  const reply = result?.reply || '大肥鱼走神了，再说一遍吧~'
  if (chatPanel && chatPanel.classList.contains('visible')) {
    const messagesEl = chatPanel.querySelector('.chat-messages')
    const last = messagesEl?.querySelector('.chat-msg.pet:last-child')
    if (last) last.textContent = reply
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight
  }
  chatMessages.push({ role: 'assistant', content: reply })
}

function renderSettingsPage() {
  addMenuButton('← 返回主菜单', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
  const bubbleStatesText = Array.isArray(CONFIG.bubbleStates) ? CONFIG.bubbleStates.join(', ') : ''
  const todayFestival = getTodayFestival()
  const todayLunar = getLunarDateParts()
  const festivalButtonLabel = todayFestival ? `播放${todayFestival.label}` : '今日无节日'
  const festivalButtonDisabled = !todayFestival || !CONFIG.holidayEnabled
  let activityLevel = CONFIG.activityLevel
  let bubbleMode = CONFIG.bubbleMode
  let enabledActions = CONFIG.enabledActions.length ? CONFIG.enabledActions.slice() : ACTS.slice()
  let actionOrder = CONFIG.actionOrder.filter((name) => ACTS.includes(name))

  const form = document.createElement('div')
  form.style.cssText = 'min-width:320px;padding:2px 2px 6px;pointer-events:auto'
  form.innerHTML = `
    <div style="font-size:13px;font-weight:600;margin:4px 0 6px;color:#333">外观与行为</div>
    <div class="ms-field"><span>宠物宽度</span><input type="number" id="ms-petSize" min="100" max="1000" step="10" value="${CONFIG.petSize}"></div>
    <div class="ms-field"><span>移动频繁度</span><input type="range" id="ms-moveChance" min="0" max="100" step="1" value="${CONFIG.moveChance}"><em id="ms-moveChance-val">${CONFIG.moveChance}%</em></div>
    <div class="ms-field"><span>空闲动作间隔</span><input type="range" id="ms-actionDelayMs" min="0" max="5000" step="100" value="${CONFIG.actionDelayMs}"><em id="ms-actionDelayMs-val">${CONFIG.actionDelayMs}ms</em></div>
    <div class="ms-field"><span>播放速度</span><input type="range" id="ms-playbackRate" min="1" max="2" step="0.1" value="${CONFIG.playbackRate}"><em id="ms-playbackRate-val">${CONFIG.playbackRate}x</em></div>
    <div class="ms-field"><span>活跃程度</span><span id="ms-activityLevel" class="ms-seg"></span></div>
    <label class="ms-check"><input type="checkbox" id="ms-reducedMotion" ${CONFIG.reducedMotion ? 'checked' : ''}> 减少动态</label>
    <label class="ms-check"><input type="checkbox" id="ms-walkEnabled" ${CONFIG.walkEnabled ? 'checked' : ''}> 允许行走</label>
    <div style="font-size:13px;font-weight:600;margin:8px 0 6px;color:#333">番茄钟</div>
    <div class="ms-field"><span>工作时长</span><input type="number" id="ms-workMinutes" min="1" max="120" step="1" value="${CONFIG.workMinutes}"></div>
    <div class="ms-field"><span>休息时长</span><input type="number" id="ms-breakMinutes" min="1" max="60" step="1" value="${CONFIG.breakMinutes}"></div>
    <div style="font-size:13px;font-weight:600;margin:8px 0 6px;color:#333">动作</div>
    <div class="ms-field" style="align-items:flex-start"><span>待机动作</span><span id="ms-enabledActionsList" class="ms-list"></span></div>
    <div style="font-size:12px;color:#888;margin:2px 0 4px">播放顺序：按勾选顺序排列，可用 ↑↓ 调整</div>
    <div id="ms-orderPreview" class="ms-order-preview"></div>
    <div class="ms-field" style="align-items:flex-start"><span>可选动作</span><span id="ms-actionOrderList" class="ms-list"></span></div>
    <div style="font-size:13px;font-weight:600;margin:8px 0 6px;color:#333">功能</div>
    <label class="ms-check"><input type="checkbox" id="ms-roastEnabled" ${CONFIG.roastEnabled ? 'checked' : ''}> 自动吐槽</label>
    <label class="ms-check"><input type="checkbox" id="ms-holidayEnabled" ${CONFIG.holidayEnabled ? 'checked' : ''}> 节日祝福</label>
    <label class="ms-check"><input type="checkbox" id="ms-voiceEnabled" ${CONFIG.voiceEnabled !== false ? 'checked' : ''}> 启用语音功能（麦克风）</label>
    <label class="ms-check"><input type="checkbox" id="ms-voiceWakeNow" ${wakeWordEnabled ? 'checked' : ''}> 开启语音唤醒（麦克风，立即生效）</label>
    <label class="ms-check"><input type="checkbox" id="ms-voiceWakeAutoStart" ${CONFIG.voiceWakeAutoStart ? 'checked' : ''}> 启动时自动开启语音唤醒</label>
    <div class="ms-field"><span>断句静音</span><input type="range" id="ms-voiceSilenceMs" min="300" max="5000" step="100" value="${CONFIG.voiceSilenceMs}"><em id="ms-voiceSilenceMs-val">${CONFIG.voiceSilenceMs}ms</em></div>
    <label class="ms-check"><input type="checkbox" id="ms-voiceAutoSend" ${CONFIG.voiceAutoSend !== false ? 'checked' : ''}> 语音识别后自动发送</label>
    <label class="ms-check"><input type="checkbox" id="ms-voiceAutoRecord" ${CONFIG.voiceAutoRecord !== false ? 'checked' : ''}> 闲聊时说“大肥鱼”自动录音</label>
    <div class="ms-field"><span>唤醒词</span><input type="text" id="ms-wakeWord" value="${CONFIG.wakeWord}" placeholder="例如：大肥鱼"></div>
    <div class="ms-field"><span>任务目录</span><input type="text" id="ms-taskCwd" value="${CONFIG.taskCwd || ''}" placeholder="留空=用户主目录"></div>
    <div class="ms-field"><span>气泡模式</span><span id="ms-bubbleMode" class="ms-seg"></span></div>
    <div class="ms-field"><span>气泡状态</span><textarea id="ms-bubbleStates" placeholder="SUCCESS,ERROR,WAITING">${bubbleStatesText}</textarea></div>
    <div id="ms-festival-area" style="margin-top:8px;padding-top:8px;border-top:1px solid #eee">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:#333">今日节日</div>
      <div class="ms-field"><span>节日名称</span><strong id="ms-festival-label">${todayFestival ? todayFestival.label : '今日无节日'}</strong></div>
      <div class="ms-field"><span>今日农历</span><strong>${todayLunar.month}${todayLunar.dayText || ''}</strong></div>
      <div class="ms-field"><span>节日祝福</span><button id="ms-festival-play" type="button" ${festivalButtonDisabled ? 'disabled' : ''} style="padding:4px 8px;border:1px solid #d8d8d8;border-radius:6px;background:${festivalButtonDisabled ? '#f0f1f4' : '#f5f6f8'};cursor:${festivalButtonDisabled ? 'not-allowed' : 'pointer'}">${festivalButtonLabel}</button></div>
    </div>
  `
  menuEl.appendChild(form)

  const bindRange = (id, valId, suffix) => {
    const input = form.querySelector(id)
    const output = form.querySelector(valId)
    input.addEventListener('input', () => { output.textContent = `${input.value}${suffix}` })
  }
  bindRange('#ms-moveChance', '#ms-moveChance-val', '%')
  bindRange('#ms-actionDelayMs', '#ms-actionDelayMs-val', 'ms')
  bindRange('#ms-playbackRate', '#ms-playbackRate-val', 'x')
  bindRange('#ms-voiceSilenceMs', '#ms-voiceSilenceMs-val', 'ms')

  const renderSeg = (container, name, options, current, onChange) => {
    container.innerHTML = ''
    for (const option of options) {
      const label = document.createElement('label')
      label.style.cssText = `display:inline-block;padding:4px 8px;border:1px solid #d8d8d8;border-radius:6px;font-size:12px;cursor:pointer;pointer-events:auto;background:${option.value === current ? '#4a7cff' : '#fff'};color:${option.value === current ? '#fff' : '#333'}`
      const radio = document.createElement('input')
      radio.type = 'radio'
      radio.name = name
      radio.value = option.value
      radio.checked = option.value === current
      radio.style.display = 'none'
      radio.addEventListener('change', () => {
        if (radio.checked) {
          onChange(option.value)
          renderSeg(container, name, options, option.value, onChange)
        }
      })
      label.append(radio, option.label)
      container.appendChild(label)
    }
  }
  renderSeg(form.querySelector('#ms-activityLevel'), 'ms-activity', [
    { value: 'quiet', label: '安静' },
    { value: 'normal', label: '标准' },
    { value: 'lively', label: '活泼' },
  ], activityLevel, (value) => { activityLevel = value })

  const enabledListEl = form.querySelector('#ms-enabledActionsList')
  const renderEnabledList = () => {
    enabledListEl.innerHTML = ''
    for (const name of ACTS) {
      const label = document.createElement('label')
      label.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;padding:2px 0;cursor:pointer'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = enabledActions.includes(name)
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!enabledActions.includes(name)) enabledActions.push(name)
        } else {
          enabledActions = enabledActions.filter((n) => n !== name)
        }
      })
      label.append(checkbox, name)
      enabledListEl.appendChild(label)
    }
  }
  renderEnabledList()

  const orderPreviewEl = form.querySelector('#ms-orderPreview')
  const orderListEl = form.querySelector('#ms-actionOrderList')
  const renderOrder = () => {
    orderPreviewEl.innerHTML = ''
    if (actionOrder.length === 0) {
      orderPreviewEl.textContent = '未设置顺序，将随机播放'
      orderPreviewEl.style.color = '#999'
      orderPreviewEl.style.fontSize = '12px'
    } else {
      orderPreviewEl.style.color = '#333'
      actionOrder.forEach((name, index) => {
        const chip = document.createElement('span')
        chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin:2px;padding:3px 6px;background:#eef2ff;border-radius:6px;font-size:12px'
        const label = document.createElement('span')
        label.textContent = `${index + 1}. ${name}`
        const makeAction = (text, color, action) => {
          const span = document.createElement('span')
          span.textContent = text
          span.setAttribute('role', 'button')
          span.style.cssText = `cursor:pointer;font-size:12px;padding:0 4px;pointer-events:auto;user-select:none;display:inline-block;${color ? `color:${color};` : ''}`
          span.onmousedown = (event) => {
            event.preventDefault()
            event.stopPropagation()
            action()
          }
          return span
        }
        const up = makeAction('↑', '', () => {
          if (index > 0) {
            const prev = actionOrder[index - 1]
            actionOrder[index - 1] = name
            actionOrder[index] = prev
            renderOrder()
          }
        })
        const down = makeAction('↓', '', () => {
          if (index < actionOrder.length - 1) {
            const next = actionOrder[index + 1]
            actionOrder[index + 1] = name
            actionOrder[index] = next
            renderOrder()
          }
        })
        const remove = makeAction('×', '#e55', () => {
          actionOrder = actionOrder.filter((n) => n !== name)
          renderOrder()
          renderOrderList()
        })
        chip.append(label, up, down, remove)
        orderPreviewEl.appendChild(chip)
      })
    }
    renderOrderList()
  }
  const renderOrderList = () => {
    orderListEl.innerHTML = ''
    for (const name of ACTS) {
      const label = document.createElement('label')
      label.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;padding:2px 0;cursor:pointer'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = actionOrder.includes(name)
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!actionOrder.includes(name)) actionOrder.push(name)
        } else {
          actionOrder = actionOrder.filter((n) => n !== name)
        }
        renderOrder()
      })
      label.append(checkbox, name)
      orderListEl.appendChild(label)
    }
  }
  renderOrder()

  renderSeg(form.querySelector('#ms-bubbleMode'), 'ms-bubble', [
    { value: 'always', label: '常驻' },
    { value: 'hidden', label: '隐藏' },
    { value: 'custom', label: '自定义' },
  ], bubbleMode, (value) => { bubbleMode = value })

  const voiceWakeNow = form.querySelector('#ms-voiceWakeNow')
  voiceWakeNow.addEventListener('change', () => {
    window.petBridge.toggleWakeWord()
    wakeWordEnabled = voiceWakeNow.checked
    showManualBubble(voiceWakeNow.checked ? '语音唤醒已开启' : '语音唤醒已关闭', voiceWakeNow.checked ? '说“大肥鱼+指令”' : '', 2500)
  })
  const festivalPlayButton = form.querySelector('#ms-festival-play')
  if (todayFestival && festivalPlayButton && !festivalButtonDisabled) {
    festivalPlayButton.addEventListener('click', () => {
      menuEl.classList.remove('visible')
      updateClickThrough()
      playFestivalGreeting(todayFestival)
    })
  }

  addMenuButton('保存', () => {
    const val = (id) => form.querySelector(id)
    const number = (id, fallback, min, max) => {
      const raw = Number(val(id).value)
      return Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : fallback))
    }
    const petSize = Math.round(number('#ms-petSize', CONFIG.petSize, 100, 1000) / 10) * 10
    const moveChance = number('#ms-moveChance', CONFIG.moveChance, 0, 100)
    const actionDelayMs = number('#ms-actionDelayMs', CONFIG.actionDelayMs, 0, 5000)
    const playbackRate = number('#ms-playbackRate', CONFIG.playbackRate, 1, 2)
    const reducedMotion = val('#ms-reducedMotion').checked
    const walkEnabled = val('#ms-walkEnabled').checked
    const workMinutes = number('#ms-workMinutes', CONFIG.workMinutes, 1, 120)
    const breakMinutes = number('#ms-breakMinutes', CONFIG.breakMinutes, 1, 60)
    const roastEnabled = val('#ms-roastEnabled').checked
    const holidayEnabled = val('#ms-holidayEnabled').checked
    const wakeWord = val('#ms-wakeWord').value.trim() || '大肥鱼'
    const taskCwd = val('#ms-taskCwd').value.trim()
    const voiceEnabled = val('#ms-voiceEnabled').checked
    const voiceWakeAutoStart = val('#ms-voiceWakeAutoStart').checked
    const voiceSilenceMs = number('#ms-voiceSilenceMs', CONFIG.voiceSilenceMs, 300, 5000)
    const voiceAutoSend = val('#ms-voiceAutoSend').checked
    const voiceAutoRecord = val('#ms-voiceAutoRecord').checked
    const bubbleStates = parseList(val('#ms-bubbleStates').value)
    const finalEnabledActions = enabledActions.length === ACTS.length ? [] : enabledActions.slice()
    const finalActionOrder = actionOrder.slice()
    Object.assign(CONFIG, {
      petSize, moveChance, actionDelayMs, playbackRate, activityLevel,
      reducedMotion, walkEnabled, workMinutes, breakMinutes, roastEnabled,
      holidayEnabled,
      wakeWord,
      taskCwd,
      voiceEnabled,
      voiceWakeAutoStart,
      voiceSilenceMs,
      voiceAutoSend,
      voiceAutoRecord,
      bubbleMode, bubbleStates, enabledActions: finalEnabledActions, actionOrder: finalActionOrder,
    })
    if (!voiceEnabled && wakeWordEnabled) {
      window.petBridge.toggleWakeWord()
      wakeWordEnabled = false
    }
    for (const video of [videoA, videoB]) {
      if (video) video.playbackRate = playbackRate
    }
    applySize()
    window.petBridge.saveConfig({
      petSize, moveChance, actionDelayMs, playbackRate, activityLevel,
      reducedMotion, walkEnabled, workMinutes, breakMinutes, roastEnabled,
      holidayEnabled,
      wakeWord,
      taskCwd,
      voiceEnabled,
      voiceWakeAutoStart,
      voiceSilenceMs,
      voiceAutoSend,
      voiceAutoRecord,
      bubbleMode, bubbleStates, enabledActions: finalEnabledActions, actionOrder: finalActionOrder,
    })
    window.petBridge.setWakeWord(wakeWord)
    if (holidayEnabled) maybeAutoPlayFestival()
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
  addMenuButton('返回', () => {
    menuPage = 'main'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
}

function renderFeatureSettings() {
  addMenuButton('← 返回设置', () => {
    menuPage = 'settings'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
  const toggleButton = (label, current, onToggle) => {
    addMenuButton(`${label}：${current ? '开' : '关'}`, () => {
      onToggle(!current)
      menuPage = 'features'
      showMenu(lastMenuPos.x, lastMenuPos.y)
    })
  }
  toggleButton('自动吐槽', CONFIG.roastEnabled === true, (next) => {
    CONFIG.roastEnabled = next
    window.petBridge.saveConfig({ roastEnabled: next })
  })
  toggleButton('节日祝福', CONFIG.holidayEnabled === true, (next) => {
    CONFIG.holidayEnabled = next
    window.petBridge.saveConfig({ holidayEnabled: next })
    if (next) maybeAutoPlayFestival()
  })
  toggleButton('允许行走', CONFIG.walkEnabled !== false, (next) => {
    CONFIG.walkEnabled = next
    window.petBridge.saveConfig({ walkEnabled: next })
  })
  toggleButton('减少动态效果', CONFIG.reducedMotion === true, (next) => {
    CONFIG.reducedMotion = next
    window.petBridge.saveConfig({ reducedMotion: next })
  })
  addMenuButton('返回', () => {
    menuPage = 'settings'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
}

function renderMainMenu() {
  renderEmotionBars(menuEl)
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
  addMenuButton('让大肥鱼吐槽一下', () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    window.petBridge.requestRoast()
  })
  if (CONFIG.voiceEnabled !== false) {
    addMenuButton('语音控制', () => {
      menuEl.classList.remove('visible')
      updateClickThrough()
      showManualBubble('我在听…请说指令', '例如：开始番茄钟 / 喂食 / 余额', 4000)
      window.petBridge.startVoice()
    })
    addMenuButton(wakeWordEnabled ? '关闭语音唤醒' : '开启语音唤醒', () => {
      menuEl.classList.remove('visible')
      updateClickThrough()
      window.petBridge.toggleWakeWord()
      showManualBubble(
        wakeWordEnabled ? '语音唤醒已关闭' : '语音唤醒已开启',
        wakeWordEnabled ? '' : '说“大肥鱼+指令”，例如：大肥鱼开始番茄钟',
        3000,
      )
    })
  }
  addMenuButton('闲聊', (event) => {
    event.stopPropagation()
    menuEl.classList.remove('visible')
    updateClickThrough()
    openChat()
  })
  addMenuButton('检查更新', () => {
    menuEl.classList.remove('visible')
    updateClickThrough()
    showManualBubble('正在检查更新…', '', 2000)
    window.petBridge.checkUpdate()
  })
  addMenuButton('设置…', () => {
    menuPage = 'settings'
    showMenu(lastMenuPos.x, lastMenuPos.y)
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
  addMenuButton('← 返回设置', () => {
    menuPage = 'settings'
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
    menuPage = 'settings'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
}

function renderAppearanceSettings() {
  addMenuButton('← 返回设置', () => {
    menuPage = 'settings'
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

  const speedInput = document.createElement('input')
  speedInput.type = 'range'
  speedInput.min = 1
  speedInput.max = 2
  speedInput.step = 0.1
  speedInput.value = String(CONFIG.playbackRate)
  speedInput.style.width = '120px'

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
    row(`播放速度 ${speedInput.value}x`, speedInput),
  )
  moveInput.addEventListener('input', () => {
    const label = moveInput.parentElement
    label.firstChild.textContent = `移动频繁度 ${moveInput.value}%`
  })
  delayInput.addEventListener('input', () => {
    const label = delayInput.parentElement
    label.firstChild.textContent = `动作切换间隔 ${delayInput.value}ms`
  })
  speedInput.addEventListener('input', () => {
    const label = speedInput.parentElement
    label.firstChild.textContent = `播放速度 ${speedInput.value}x`
  })

  addMenuButton('保存', () => {
    CONFIG.petSize = Math.min(1000, Math.max(100, Math.round(Number(sizeInput.value) / 10) * 10 || 460))
    CONFIG.moveChance = Math.min(100, Math.max(0, Number(moveInput.value) || 0))
    CONFIG.actionDelayMs = Math.min(5000, Math.max(0, Number(delayInput.value) || 0))
    CONFIG.playbackRate = Math.min(2, Math.max(1, Number(speedInput.value) || 1))
    for (const video of [videoA, videoB]) {
      if (video) video.playbackRate = CONFIG.playbackRate
    }
    window.petBridge.saveConfig({
      petSize: CONFIG.petSize,
      moveChance: CONFIG.moveChance,
      actionDelayMs: CONFIG.actionDelayMs,
      playbackRate: CONFIG.playbackRate,
    })
    menuPage = 'main'
    menuEl.classList.remove('visible')
    updateClickThrough()
  })
  addMenuButton('返回', () => {
    menuPage = 'settings'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  })
}

function renderActionSettings() {
  // 空数组 = 全部动作，所以 UI 里初始化为全选。
  addMenuButton('← 返回设置', () => {
    menuPage = 'settings'
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
    menuPage = 'settings'
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
  if (settingsPanel.classList.contains('visible')) {
    if (!settingsPanel.contains(e.target)) closeSettings()
    return
  }
  if (chatPanel.classList.contains('visible')) {
    if (!chatPanel.contains(e.target)) closeChat()
    return
  }
  if (!menuEl.contains(e.target)) {
    menuEl.classList.remove('visible')
    updateClickThrough()
  }
})

// ---------- 状态订阅 ----------
function applyStatus(incoming) {
  if (!incoming || typeof incoming !== 'object') return

  if (incoming.config) {
    CONFIG.enabled = incoming.config.enabled !== false
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
    CONFIG.playbackRate = Number(incoming.config.playbackRate) || CONFIG.playbackRate
    CONFIG.voiceEnabled = incoming.config.voiceEnabled !== false
    CONFIG.voiceWakeAutoStart = incoming.config.voiceWakeAutoStart === true
    CONFIG.voiceSilenceMs = Number(incoming.config.voiceSilenceMs) ?? CONFIG.voiceSilenceMs
    CONFIG.voiceAutoSend = incoming.config.voiceAutoSend !== false
    CONFIG.voiceAutoRecord = incoming.config.voiceAutoRecord !== false
    CONFIG.holidayEnabled = incoming.config.holidayEnabled === true
    CONFIG.wakeWord = incoming.config.wakeWord || CONFIG.wakeWord
    CONFIG.taskCwd = incoming.config.taskCwd || CONFIG.taskCwd
    CONFIG.scale = Number(incoming.config.scale) || CONFIG.scale
    if (!CONFIG.holidayEnabled) stopFestivalPlayback()
    // 播放速度变化立即作用到当前/备用视频。
    for (const video of [videoA, videoB]) {
      if (video && !video.paused) video.playbackRate = CONFIG.playbackRate
    }
    applySize()
    if (!incoming.festivalPlay) maybeAutoPlayFestival()
  }

  if (incoming.festivalPlay) {
    const playRequestToken = incoming.festivalPlay.token
      || `${incoming.festivalPlay.festivalId || ''}:${incoming.festivalPlay.requestedAt || ''}`
    if (playRequestToken && playRequestToken !== lastFestivalPlayToken) {
      const festival = incoming.festivalPlay.festivalId
        ? getFestivalById(incoming.festivalPlay.festivalId)
        : getTodayFestival()
      if (festival && playFestivalGreeting(festival)) {
        lastFestivalPlayToken = playRequestToken
      }
    }
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

async function handleVoiceCommand(text) {
  const command = String(text || '').trim()
  if (!command) {
    showManualBubble('没听清，再说一次吧~', '', 2500)
    return
  }
  // 闲聊框打开时，只说“大肥鱼”就自动开始录音（可关闭）
  const wake = CONFIG.wakeWord || '大肥鱼'
  if (CONFIG.voiceAutoRecord !== false && (command === wake || command === `嗨${wake}`) && chatPanel.classList.contains('visible')) {
    if (!senseRecording) {
      showManualBubble('我在，请说~', '', 1500)
      try {
        await startSenseRecording()
      } catch {
        if (chatAppendMsg) chatAppendMsg('pet', '录音不可用，请点击 🎤 重试~')
      }
    }
    return
  }
  if (command.includes('在吗') || command.includes('在不在') || command.includes('出来')) {
    showManualBubble('我在呀~', '', 1500)
    openChat()
    if (CONFIG.voiceAutoRecord !== false && CONFIG.voiceEnabled !== false && !senseRecording) {
      setTimeout(async () => {
        try {
          await startSenseRecording()
          if (chatAppendMsg) chatAppendMsg('pet', '我在，请说~')
        } catch {
          if (chatAppendMsg) chatAppendMsg('pet', '录音不可用，请点击 🎤 重试~')
        }
      }, 600)
    }
    return
  }
  if (command.includes('开始') && command.includes('番茄钟')) {
    startPomodoro('work', CONFIG.workMinutes)
    showManualBubble('收到，开始番茄钟~', `${CONFIG.workMinutes} 分钟`, 3000)
  } else if (command.includes('休息')) {
    startPomodoro('break', CONFIG.breakMinutes)
    showManualBubble('收到，开始休息~', `${CONFIG.breakMinutes} 分钟`, 3000)
  } else if (command.includes('停止') && command.includes('番茄钟')) {
    stopPomodoro()
    showManualBubble('番茄钟已停止~', '', 2500)
  } else if (command.includes('喂食')) {
    feedPet()
  } else if (command.includes('隐藏')) {
    window.petBridge.hide()
  } else if (command.includes('关闭')) {
    window.petBridge.close('user')
  } else if (command.includes('余额')) {
    window.petBridge.refreshBalance()
    showManualBubble('正在刷新余额~', '', 2000)
  } else if (command.includes('吐槽')) {
    window.petBridge.requestRoast()
  } else if (command.includes('设置')) {
    menuPage = 'settings'
    showMenu(lastMenuPos.x, lastMenuPos.y)
  } else {
    showManualBubble(`你说的是“${command}”？我还没学会~`, '', 3000)
  }
}

function handleUpdateResult(result) {
  if (!result) return
  if (result.error) {
    showManualBubble('检查更新失败', result.error, 3000)
    return
  }
  if (result.hasUpdate) {
    showManualBubble(`发现新版本 ${result.latest}`, `当前 ${result.current}，为你打开更新页`, 5000)
    window.petBridge.openWebUi('https://github.com/ysppwn721/better-dsh-pet/releases')
  } else {
    showManualBubble('已是最新版本', `当前 ${result.current}`, 3000)
  }
}

window.petBridge.onStatus((status) => {
  applyStatus(status)
})

window.petBridge.onVoiceResult(handleVoiceCommand)
window.petBridge.onDictationResult(handleDictationResult)
window.petBridge.onUpdateResult(handleUpdateResult)
window.petBridge.onWakeState((enabled) => {
  wakeWordEnabled = enabled
})

// ---------- 启动 ----------
if (CONFIG.voiceEnabled !== false && CONFIG.voiceWakeAutoStart && !wakeWordEnabled) {
  window.petBridge.toggleWakeWord()
  wakeWordEnabled = true
}
playIdle()
updateBubble()
updateClickThrough()
maybeAutoPlayFestival()

// 情绪缓慢变化：空闲会越来越无聊/疲惫，工作会消耗精力。
setInterval(() => {
  if (currentState === 'IDLE') {
    updateEmotion({ mood: -1, energy: -1, anxiety: -1, boredom: 2 })
  } else if (currentState === 'WORKING' || currentState === 'THINKING') {
    updateEmotion({ energy: -1, boredom: -1 })
  } else if (currentState === 'WAITING') {
    updateEmotion({ anxiety: 1, boredom: 1 })
  }
}, 10000)

setInterval(() => {
  if (CONFIG.holidayEnabled) maybeAutoPlayFestival()
}, 60 * 1000)

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
