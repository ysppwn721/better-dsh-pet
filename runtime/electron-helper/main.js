/**
 * better-dsh-pet desktop helper —— Electron 主进程
 *
 * 不再依赖 stdin 协议（Windows 下 Electron GUI 进程的 stdin 不可靠），
 * 改为轮询 DSH 宿主暴露的 /plugins/better-dsh-pet/status HTTP 端点，
 * 把最新状态转发给透明置顶窗口内的 renderer。
 */
const { app, BrowserWindow, ipcMain, screen, shell, Tray, Menu, nativeImage, session } = require('electron')
const path = require('node:path')
const { spawn, execFile } = require('node:child_process')
const { existsSync, readFileSync } = require('node:fs')

// 允许无用户手势直接播放 MP3 闹钟
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// 透明置顶全屏窗口在某些显卡/驱动下会干扰硬件视频叠加层，
// 导致 B 站等视频在拖拽桌宠或系统音量弹层出现时黑屏。
// 关闭本应用的硬件加速可避免这种合成冲突（桌宠是轻量 2D 动画，影响很小）。
app.disableHardwareAcceleration()

let mainWindow = null
let pollTimer = null
let tray = null
let userHidden = false
let fullscreenHidden = false
let fullscreenCheckTimer = null
let wakeWordProcess = null
let currentWakeWord = process.env.DSH_PET_WAKE_WORD || '大肥鱼'
let forceClickThrough = false
let trayToggleVisible = null

function setClickThrough(ignore) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(ignore === true, { forward: true })
  }
}

function resolveDesktopPath() {
  const candidates = [
    process.env.DSH_PET_DESKTOP_PATH,
    process.env.DSH_DESKTOP_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'DeepSeek Harness', 'DSH Desktop', 'DSH Desktop.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness', 'DSH Desktop', 'DSH Desktop.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'DeepSeek Harness', 'DSH Desktop', 'DSH Desktop.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'DSH Desktop', 'DSH Desktop.exe'),
    'D:\\deepseek harness\\DSH Desktop\\DSH Desktop.exe',
    'D:/deepseek harness/DSH Desktop/DSH Desktop.exe',
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(candidate))
}

function openDesktop() {
  const desktopPath = resolveDesktopPath()
  if (!desktopPath) {
    console.error('[better-dsh-pet-helper] DSH Desktop executable not found')
    return
  }
  try {
    const child = spawn(desktopPath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    })
    child.unref()
  } catch (error) {
    console.error('[better-dsh-pet-helper] failed to launch DSH Desktop:', error)
  }
}

function createTray() {
  if (tray) return
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'tray-icon.png')
  let icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    // 兜底：图标文件缺失时使用内置蓝色小圆点
    icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABKSURBVDhPzY6xDQAwCMN6Wo/tn3RjMLQiEgORPBFHrDUy+5i9YDeEQgYdD4s/6EpyOsJjhb4BHqr0fTBjQB2h62Exg04IBUlWcwH8iaT0f2HaowAAAABJRU5ErkJggg==')
  }
  tray = new Tray(icon)
  tray.setToolTip('Better DSH Pet')
  trayToggleVisible = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
      userHidden = true
    } else {
      mainWindow.show()
      userHidden = false
    }
  }
  updateTrayMenu()
  tray.on('click', trayToggleVisible)
}

function updateTrayMenu() {
  if (!tray) return
  const toggleForceClickThrough = () => {
    forceClickThrough = !forceClickThrough
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pet:force-click-through', forceClickThrough)
      mainWindow.setIgnoreMouseEvents(forceClickThrough, { forward: true })
    }
    updateTrayMenu()
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏桌宠', click: trayToggleVisible },
    { type: 'separator' },
    { label: forceClickThrough ? '关闭鼠标穿透' : '开启鼠标穿透', click: toggleForceClickThrough },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        void notifyHostClosed().finally(() => app.quit())
      },
    },
  ]))
}

// Windows 上资源管理器重启、分辨率/DPI 变化、休眠唤醒等可能让置顶丢失，
// 借鉴 dsh-pet-indesktop 的“置顶看门狗”：定期重新置顶。
function startTopmostWatchdog() {
  const timer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  }, 30000)
  if (timer.unref) timer.unref()
  if (mainWindow) {
    mainWindow.on('show', () => {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    })
  }
}

// 全屏自动隐身：检测前台窗口是否铺满某块屏幕。
// 用 PowerShell 调 user32 拿前台窗口矩形，避免引入额外原生依赖。
function getForegroundWindowRect(callback) {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Foreground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
$h = [Win32Foreground]::GetForegroundWindow()
if ($h -eq [IntPtr]::Zero) { 'none'; exit }
if (-not [Win32Foreground]::IsWindowVisible($h)) { 'none'; exit }
$r = New-Object Win32Foreground+RECT
[Win32Foreground]::GetWindowRect($h, [ref]$r) | Out-Null
$procId = 0
[Win32Foreground]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
$proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
$procName = if ($proc) { $proc.ProcessName } else { '' }
"$($r.Left),$($r.Top),$($r.Right),$($r.Bottom)|$procName"
`
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    timeout: 3000,
    windowsHide: true,
  }, (error, stdout) => {
    if (error) {
      callback(null)
      return
    }
    const text = String(stdout || '').trim()
    if (!text || text === 'none') {
      callback(null)
      return
    }
    const [rectPart, processName = ''] = text.split('|')
    const parts = rectPart.split(',').map((n) => Number(n.trim()))
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      callback(null)
      return
    }
    callback({
      x: parts[0],
      y: parts[1],
      width: parts[2] - parts[0],
      height: parts[3] - parts[1],
      processName: String(processName || '').trim().toLowerCase(),
    })
  })
}

function isFullscreenRect(rect) {
  if (!rect) return false
  const displays = screen.getAllDisplays()
  return displays.some((display) => {
    // 用 bounds（整个屏幕含任务栏区域）判断“真全屏”；
    // 最大化窗口只覆盖 workArea，不应算全屏，避免 B 站 App 一打开就误藏桌宠。
    const bounds = display.bounds
    const tolerance = 2
    return rect.x <= bounds.x + tolerance
      && rect.y <= bounds.y + tolerance
      && rect.x + rect.width >= bounds.x + bounds.width - tolerance
      && rect.y + rect.height >= bounds.y + bounds.height - tolerance
  })
}

// 只对“游戏全屏 / 视频全屏”自动隐藏，避免普通办公软件全屏也把桌宠藏起来。
const KEEP_VISIBLE_FULLSCREEN_PROCESSES = new Set([
  'explorer', 'code', 'devenv', 'winword', 'excel', 'powerpnt', 'onenote', 'outlook',
  'acrobat', 'acrord32', 'notepad', 'notepad++', 'windowsTerminal', 'mintty', 'obsidian',
  'typora', 'wechat', 'qq', 'dingtalk', 'feishu', 'slack', 'teams', 'zoom', 'wps', 'et', 'wpp',
  'dsh desktop', 'dsh',
])
const BROWSER_PROCESSES = new Set([
  'chrome', 'msedge', 'firefox', 'opera', 'brave', 'vivaldi', 'chromium',
  '360chrome', 'qqbrowser', 'sogouexplorer', 'ucbrowser', 'centbrowser', 'liebao',
])
const MEDIA_PLAYER_PROCESSES = new Set([
  'potplayer', 'vlc', 'mpv', 'wmplayer', 'qqplayer', 'baofengplayer', 'kmplayer',
  'gplayer', 'dplayer', 'iina', 'mxplayer', 'loveplayer', 'stormplayer', 'foxplayer',
])

function shouldAutoHideForProcess(processName) {
  if (!processName) return true // 拿不到进程名时按“可能游戏/视频”处理
  if (KEEP_VISIBLE_FULLSCREEN_PROCESSES.has(processName)) return false
  if (BROWSER_PROCESSES.has(processName)) return true
  if (MEDIA_PLAYER_PROCESSES.has(processName)) return true
  // 其余未知全屏进程按游戏全屏处理（游戏进程名无法穷举）
  return true
}

function checkFullscreenAndHide() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  getForegroundWindowRect((rect) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const fullscreen = isFullscreenRect(rect)
    const shouldHide = fullscreen && shouldAutoHideForProcess(rect?.processName)
    // 桌宠自己的窗口也是全屏透明画布，用户正在拖/点时不能把自己当成“全屏应用”藏起来。
    const selfForeground = mainWindow.isFocused()
    if (shouldHide && !fullscreenHidden && !selfForeground) {
      fullscreenHidden = true
      mainWindow.hide()
    } else if (!fullscreen && fullscreenHidden && !userHidden) {
      fullscreenHidden = false
      mainWindow.show()
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    }
  })
}

function startFullscreenWatchdog() {
  checkFullscreenAndHide()
  fullscreenCheckTimer = setInterval(checkFullscreenAndHide, 2000)
  if (fullscreenCheckTimer.unref) fullscreenCheckTimer.unref()
}

function startVoiceRecognition(callback) {
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
try {
  $culture = [System.Globalization.CultureInfo]::GetCultureInfo('zh-CN')
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
  $recognizer.SetInputToDefaultAudioDevice()
  $choices = New-Object System.Speech.Recognition.Choices
  $choices.Add('开始番茄钟')
  $choices.Add('开始休息')
  $choices.Add('停止番茄钟')
  $choices.Add('喂食')
  $choices.Add('隐藏')
  $choices.Add('关闭')
  $choices.Add('余额')
  $choices.Add('吐槽')
  $choices.Add('设置')
  $grammar = New-Object System.Speech.Recognition.Grammar($choices)
  $recognizer.LoadGrammar($grammar)
  $result = $recognizer.Recognize()
  if ($result -ne $null) { $result.Text } else { '' }
} catch {
  'ERROR: ' + $_.Exception.Message
}
`
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    timeout: 15000,
    windowsHide: true,
    encoding: 'utf8',
  }, (error, stdout) => {
    if (error) {
      callback('')
      return
    }
    const text = String(stdout || '').trim()
    if (text.startsWith('ERROR:')) {
      callback('')
      return
    }
    callback(text)
  })
}

function compareVersions(a, b) {
  const pa = String(a || '').split('.').map((n) => Number(n) || 0)
  const pb = String(b || '').split('.').map((n) => Number(n) || 0)
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

function checkForUpdate(callback) {
  let current = '0.0.0'
  try {
    const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'))
    current = pkg.version || current
  } catch {
    // 读取失败时用 0.0.0
  }
  const registries = [
    'https://registry.npmjs.org/better-dsh-pet/latest',
    'https://registry.npmmirror.com/better-dsh-pet/latest',
  ]
  const tryFetch = async (index) => {
    if (index >= registries.length) {
      callback({ current, latest: current, hasUpdate: false, error: '无法连接更新服务器' })
      return
    }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const response = await fetch(registries[index], { signal: controller.signal })
      clearTimeout(timer)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const latest = data?.version || current
      callback({ current, latest, hasUpdate: compareVersions(latest, current) > 0, error: '' })
    } catch {
      await tryFetch(index + 1)
    }
  }
  void tryFetch(0)
}

function sendVoiceResult(text) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pet:voice-result', text || '')
  }
}

function startVoiceDictation(callback) {
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
try {
  $culture = [System.Globalization.CultureInfo]::GetCultureInfo('zh-CN')
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
  $recognizer.SetInputToDefaultAudioDevice()
  $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
  $result = $recognizer.Recognize()
  if ($result -ne $null) { $result.Text } else { '' }
} catch {
  'ERROR: ' + $_.Exception.Message
}
`
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    timeout: 15000,
    windowsHide: true,
    encoding: 'utf8',
  }, (error, stdout) => {
    if (error) {
      callback('')
      return
    }
    const text = String(stdout || '').trim()
    if (text.startsWith('ERROR:')) {
      callback('')
      return
    }
    callback(text)
  })
}

function weatherCodeText(code) {
  const map = {
    0: '晴朗', 1: '大致晴朗', 2: '多云', 3: '阴天',
    45: '雾', 48: '雾凇',
    51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨',
    56: '冻毛毛雨', 57: '强冻毛毛雨',
    61: '小雨', 63: '中雨', 65: '大雨',
    66: '冻雨', 67: '强冻雨',
    71: '小雪', 73: '中雪', 75: '大雪',
    77: '雪粒',
    80: '小阵雨', 81: '中阵雨', 82: '强阵雨',
    85: '小阵雪', 86: '大阵雪',
    95: '雷雨', 96: '雷雨伴冰雹', 99: '强雷雨伴冰雹',
  }
  return map[Number(code)] || '未知天气'
}

function translateWeatherDesc(desc) {
  const text = String(desc || '').toLowerCase()
  const map = {
    'clear': '晴朗', 'sunny': '晴朗', 'partly cloudy': '多云', 'cloudy': '阴天', 'overcast': '阴天',
    'mist': '薄雾', 'fog': '雾', 'freezing fog': '冻雾',
    'light rain': '小雨', 'moderate rain': '中雨', 'heavy rain': '大雨', 'rain': '雨',
    'light snow': '小雪', 'moderate snow': '中雪', 'heavy snow': '大雪', 'snow': '雪',
    'thundery outbreaks possible': '雷阵雨', 'thunderstorm': '雷雨', 'patchy rain possible': '局部小雨',
    'patchy snow possible': '局部小雪', 'smoky haze': '烟霾', 'haze': '霾',
    'light drizzle': '小毛毛雨', 'drizzle': '毛毛雨', 'freezing drizzle': '冻毛毛雨',
  }
  for (const [key, zh] of Object.entries(map)) {
    if (text.includes(key)) return zh
  }
  return desc || '未知天气'
}

async function fetchWeather(city) {
  const rawName = String(city || '').trim()
  const useLocal = !rawName || rawName === '本地' || rawName === 'default' || rawName === '当前位置'
  let name = rawName
  if (useLocal) {
    try {
      const ipRes = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(8000) })
      if (ipRes.ok) {
        const ip = await ipRes.json()
        name = ip.city || '北京'
        const lat = ip.latitude
        const lon = ip.longitude
        if (lat && lon) {
          const wRes = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, { signal: AbortSignal.timeout(8000) })
          if (wRes.ok) {
            const data = await wRes.json()
            const cur = data?.current_condition?.[0]
            if (cur) {
              const temp = Math.round(Number(cur.temp_C) || 0)
              const desc = translateWeatherDesc(cur.lang_zh?.[0]?.value || cur.weatherDesc?.[0]?.value || '')
              const hum = cur.humidity
              return { ok: true, text: `${name} 当前 ${temp}°C，${desc}，湿度 ${hum}%` }
            }
          }
        }
      } else {
        name = '北京'
      }
    } catch {
      name = '北京'
    }
  }
  if (!name) name = '北京'
  // 1. Nominatim 中文地理编码 + wttr.in 坐标查询（国内可用性较好）
  try {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'better-dsh-pet' },
      signal: AbortSignal.timeout(8000),
    })
    if (geoRes.ok) {
      const geo = await geoRes.json()
      const loc = geo?.[0]
      if (loc) {
        const lat = loc.lat
        const lon = loc.lon
        const place = String(loc.display_name || name).split(',')[0] || name
        const wRes = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, { signal: AbortSignal.timeout(8000) })
        if (wRes.ok) {
          const data = await wRes.json()
          const cur = data?.current_condition?.[0]
          if (cur) {
            const temp = Math.round(Number(cur.temp_C) || 0)
            const desc = translateWeatherDesc(cur.lang_zh?.[0]?.value || cur.weatherDesc?.[0]?.value || '')
            const hum = cur.humidity
            return { ok: true, text: `${place} 当前 ${temp}°C，${desc}，湿度 ${hum}%` }
          }
        }
      }
    }
  } catch {
    // 继续 fallback
  }
  // 2. Open-Meteo 地理编码 + 预报
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`, { signal: AbortSignal.timeout(8000) })
    if (geoRes.ok) {
      const geo = await geoRes.json()
      const loc = geo?.results?.[0]
      if (loc) {
        const lat = loc.latitude
        const lon = loc.longitude
        const place = loc.name || name
        const region = [loc.admin1, loc.country].filter(Boolean).join(' ')
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`, { signal: AbortSignal.timeout(8000) })
        if (wxRes.ok) {
          const wx = await wxRes.json()
          const cur = wx?.current_weather
          if (cur) {
            const temp = Math.round(cur.temperature)
            const desc = weatherCodeText(cur.weathercode)
            const wind = Math.round(cur.windspeed)
            return { ok: true, text: `${place}${region ? ' ' + region : ''} 当前 ${temp}°C，${desc}，风速 ${wind}km/h` }
          }
        }
      }
    }
  } catch {
    // 继续 fallback
  }
  // 3. wttr.in 按城市名兜底
  try {
    const wRes = await fetch(`https://wttr.in/${encodeURIComponent(name)}?format=j1`, { signal: AbortSignal.timeout(8000) })
    if (wRes.ok) {
      const data = await wRes.json()
      const cur = data?.current_condition?.[0]
      if (cur) {
        const temp = Math.round(Number(cur.temp_C) || 0)
        const desc = translateWeatherDesc(cur.lang_zh?.[0]?.value || cur.weatherDesc?.[0]?.value || '')
        const hum = cur.humidity
        return { ok: true, text: `${name} 当前 ${temp}°C，${desc}，湿度 ${hum}%` }
      }
    }
  } catch {
    // ignore
  }
  return { ok: false, error: '天气查询失败，请稍后再试~' }
}

function speakText(text) {
  const safeText = String(text || '').slice(0, 200)
  if (!safeText) return
  const script = `
Add-Type -AssemblyName System.Speech
try {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.Speak($env:DICT_TEXT)
} catch { }
`
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    timeout: 15000,
    windowsHide: true,
    env: { ...process.env, DICT_TEXT: safeText },
  }, () => {})
}

function sendVoiceResult(text) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pet:voice-result', text || '')
  }
}

function startWakeWordListener() {
  if (wakeWordProcess) return
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
try {
  $culture = [System.Globalization.CultureInfo]::GetCultureInfo('zh-CN')
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
  $recognizer.SetInputToDefaultAudioDevice()
  $wake = $env:DSH_PET_WAKE_WORD
  if (-not $wake) { $wake = '大肥鱼' }
  $choices = New-Object System.Speech.Recognition.Choices
  $choices.Add("\${wake}开始番茄钟")
  $choices.Add("嗨\${wake}开始番茄钟")
  $choices.Add("\${wake}开始休息")
  $choices.Add("嗨\${wake}开始休息")
  $choices.Add("\${wake}停止番茄钟")
  $choices.Add("\${wake}喂食")
  $choices.Add("\${wake}隐藏")
  $choices.Add("\${wake}关闭")
  $choices.Add("\${wake}余额")
  $choices.Add("\${wake}吐槽")
  $choices.Add("\${wake}设置")
  $choices.Add("\${wake}你在吗")
  $choices.Add("\${wake}在吗")
  $choices.Add("嗨\${wake}你在吗")
  $choices.Add("\${wake}出来")
  $choices.Add("\${wake}")
  $choices.Add("嗨\${wake}")
  $grammar = New-Object System.Speech.Recognition.Grammar($choices)
  $recognizer.LoadGrammar($grammar)
  while ($true) {
    $result = $recognizer.Recognize()
    if ($result -ne $null) {
      'CMD:' + $result.Text
    }
  }
} catch {
  'ERROR: ' + $_.Exception.Message
}
`
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true,
    env: { ...process.env, DSH_PET_WAKE_WORD: currentWakeWord },
  })
  let buffer = ''
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8')
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) {
      const text = line.trim()
      if (text.startsWith('CMD:')) {
        sendVoiceResult(text.slice(4))
      } else if (text.startsWith('ERROR:')) {
        stopWakeWordListener()
        sendVoiceResult('')
      }
    }
  })
  child.on('exit', () => {
    if (wakeWordProcess === child) wakeWordProcess = null
  })
  wakeWordProcess = child
}

function stopWakeWordListener() {
  if (wakeWordProcess) {
    wakeWordProcess.kill()
    wakeWordProcess = null
  }
}

function createWindow() {
  const scale = Number(process.env.DSH_PET_SCALE || '1')
  const bubbleScale = Number(process.env.DSH_PET_BUBBLE_SCALE || '1')
  // 使用主屏工作区作为透明画布，宠物在画布内自由移动，不移动窗口本身。
  const display = screen.getPrimaryDisplay()
  const area = display.workArea
  const width = area.width
  const height = area.height

  mainWindow = new BrowserWindow({
    width,
    height,
    x: area.x,
    y: area.y,
    show: false,
    useContentSize: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      paintWhenInitiallyHidden: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  setClickThrough(true)

  mainWindow.loadFile('index.html', {
    query: {
      scale: String(scale),
      bubbleScale: String(bubbleScale),
      activityLevel: process.env.DSH_PET_ACTIVITY_LEVEL || 'normal',
      reducedMotion: process.env.DSH_PET_REDUCED_MOTION === '1' ? '1' : '0',
      bubbleMode: process.env.DSH_PET_BUBBLE_MODE || 'always',
      bubbleStates: process.env.DSH_PET_BUBBLE_STATES || 'SUCCESS,ERROR,WAITING',
      webuiUrl: process.env.DSH_PET_WEBUI_URL || 'http://127.0.0.1:3080/',
      playbackRate: process.env.DSH_PET_PLAYBACK_RATE || '1',
      voiceEnabled: process.env.DSH_PET_VOICE_ENABLED === '0' ? '0' : '1',
      voiceWakeAutoStart: process.env.DSH_PET_VOICE_WAKE_AUTO_START === '1' ? '1' : '0',
      voiceSilenceMs: process.env.DSH_PET_VOICE_SILENCE_MS || '1200',
      voiceAutoSend: process.env.DSH_PET_VOICE_AUTO_SEND === '0' ? '0' : '1',
      voiceAutoRecord: process.env.DSH_PET_VOICE_AUTO_RECORD === '0' ? '0' : '1',
      holidayEnabled: process.env.DSH_PET_HOLIDAY_ENABLED === '1' ? '1' : '0',
      wakeWord: process.env.DSH_PET_WAKE_WORD || '大肥鱼',
      taskCwd: process.env.DSH_PET_TASK_CWD || '',
    },
  }).then(() => {
    startPolling()
  }).catch((error) => {
    console.error('[better-dsh-pet-helper] page load failed:', error)
    app.quit()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  })
}

async function notifyHostClosed() {
  const statusUrl = process.env.DSH_PET_STATUS_URL
  if (!statusUrl) return
  try {
    const closeUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/close')
    await fetch(closeUrl, { method: 'POST', cache: 'no-store' })
  } catch {
    // 宿主不可达时无法通知，仍继续退出；宿主侧可能按崩溃重启处理。
  }
}

function startPolling() {
  const statusUrl = process.env.DSH_PET_STATUS_URL
  if (!statusUrl) {
    console.error('[better-dsh-pet-helper] DSH_PET_STATUS_URL is not set')
    return
  }
  const poll = async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    try {
      const response = await fetch(statusUrl, { cache: 'no-store' })
      if (!response.ok) return
      const status = await response.json()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pet:status', status)
      }
    } catch (error) {
      // DSH 尚未就绪或临时不可达时静默跳过，下个周期再试。
    }
  }
  poll()
  pollTimer = setInterval(poll, 1000)
  if (pollTimer.unref) pollTimer.unref()
}

app.whenReady().then(() => {
  // 允许渲染进程使用麦克风（语音闲聊/唤醒需要）
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })
  session.defaultSession.setPermissionCheckHandler(() => true)
  createWindow()
  createTray()
  startTopmostWatchdog()
  startFullscreenWatchdog()
  ipcMain.on('pet:closed', (_event, reason) => {
    void notifyHostClosed().finally(() => app.quit())
  })
  ipcMain.on('pet:hide', () => {
    if (mainWindow) mainWindow.hide()
    userHidden = true
  })
  ipcMain.on('pet:open-webui', (_event, url) => {
    if (url) shell.openExternal(String(url)).catch(() => {})
  })
  ipcMain.on('pet:open-desktop', () => {
    openDesktop()
  })
  ipcMain.on('pet:set-ignore-mouse', (_event, { ignore }) => {
    setClickThrough(ignore === true)
  })
  ipcMain.on('pet:set-force-click-through', (_event, enabled) => {
    forceClickThrough = !!enabled
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pet:force-click-through', forceClickThrough)
      mainWindow.setIgnoreMouseEvents(forceClickThrough, { forward: true })
    }
    updateTrayMenu()
  })
  ipcMain.on('pet:beep', () => {
    try { shell.beep() } catch { /* 系统不支持时忽略 */ }
  })
  ipcMain.on('pet:voice-start', (event) => {
    startVoiceRecognition((text) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('pet:voice-result', text || '')
      }
    })
  })
  ipcMain.on('pet:dictation-start', (event) => {
    startVoiceDictation((text) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('pet:dictation-result', text || '')
      }
    })
  })
  ipcMain.on('pet:speak', (_event, text) => {
    speakText(text)
  })
  ipcMain.on('pet:check-update', (event) => {
    checkForUpdate((result) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('pet:update-result', result)
      }
    })
  })
  ipcMain.on('pet:wake-word-toggle', (event) => {
    if (wakeWordProcess) {
      stopWakeWordListener()
      event.sender.send('pet:wake-state', false)
    } else {
      startWakeWordListener()
      event.sender.send('pet:wake-state', true)
    }
  })
  ipcMain.on('pet:set-wake-word', (event, word) => {
    currentWakeWord = String(word || '大肥鱼').trim() || '大肥鱼'
    if (wakeWordProcess) {
      stopWakeWordListener()
      startWakeWordListener()
    }
    event.sender.send('pet:wake-state', Boolean(wakeWordProcess))
  })
  ipcMain.handle('pet:chat', async (_event, message) => {
    const statusUrl = process.env.DSH_PET_STATUS_URL
    if (!statusUrl || !message) return { ok: false, reply: '消息不能为空~' }
    try {
      const chatUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/chat')
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await response.json()
      return data
    } catch {
      return { ok: false, reply: '网络开小差了，等会儿再聊吧~' }
    }
  })
  ipcMain.handle('pet:intent', async (_event, text) => {
    const statusUrl = process.env.DSH_PET_STATUS_URL
    if (!statusUrl || !text) return { ok: false, type: 'chat' }
    try {
      const intentUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/intent')
      const response = await fetch(intentUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      return data
    } catch {
      return { ok: false, type: 'chat' }
    }
  })
  ipcMain.handle('pet:task', async (_event, task) => {
    const statusUrl = process.env.DSH_PET_STATUS_URL
    if (!statusUrl || !task) return { ok: false, result: '任务内容为空~' }
    try {
      const taskUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/task')
      const response = await fetch(taskUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task }),
      })
      const data = await response.json()
      return data
    } catch {
      return { ok: false, result: '任务执行时网络开小差了~' }
    }
  })
  ipcMain.handle('pet:weather', async (_event, city) => fetchWeather(city))
  ipcMain.handle('pet:transcribe', async (_event, wavBuffer) => {
    const statusUrl = process.env.DSH_PET_STATUS_URL
    if (!statusUrl || !wavBuffer) return { ok: false, text: '' }
    try {
      const transcribeUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/transcribe')
      const response = await fetch(transcribeUrl, {
        method: 'POST',
        headers: { 'content-type': 'audio/wav' },
        body: Buffer.from(wavBuffer),
      })
      const data = await response.json()
      return data
    } catch {
      return { ok: false, text: '' }
    }
  })
  ipcMain.on('pet:save-config', async (_event, patch) => {
    const statusUrl = process.env.DSH_PET_STATUS_URL
    if (!statusUrl || !patch || typeof patch !== 'object') return
    try {
      const configUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/config')
      const response = await fetch(configUrl, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        console.error('[better-dsh-pet-helper] save config failed:', response.status)
      }
    } catch (error) {
      console.error('[better-dsh-pet-helper] save config error:', error)
    }
  })
  ipcMain.on('pet:request-roast', async () => {
    const statusUrl = process.env.DSH_PET_STATUS_URL
    if (!statusUrl) return
    try {
      const roastUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/roast')
      await fetch(roastUrl, { method: 'POST', cache: 'no-store' })
    } catch (error) {
      console.error('[better-dsh-pet-helper] request roast error:', error)
    }
  })
  ipcMain.on('pet:refresh-balance', async () => {
    const statusUrl = process.env.DSH_PET_STATUS_URL
    if (!statusUrl) return
    try {
      const refreshUrl = statusUrl.replace(/\/plugins\/better-dsh-pet\/status$/, '/plugins/better-dsh-pet/refresh-balance')
      await fetch(refreshUrl, { method: 'POST', cache: 'no-store' })
    } catch (error) {
      console.error('[better-dsh-pet-helper] refresh balance error:', error)
    }
  })
  ipcMain.on('pet:move-by', () => {
    // 已改为全屏画布内移动宠物 DOM，不再移动窗口。
  })
  ipcMain.on('pet:drag-end', () => {
    // 保留此通道，后续可用来做拖拽结束后的持久化。
  })
})

app.on('before-quit', () => {
  stopWakeWordListener()
})

app.on('window-all-closed', () => {
  app.quit()
})
