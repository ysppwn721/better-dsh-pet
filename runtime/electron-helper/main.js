/**
 * better-dsh-pet desktop helper —— Electron 主进程
 *
 * 不再依赖 stdin 协议（Windows 下 Electron GUI 进程的 stdin 不可靠），
 * 改为轮询 DSH 宿主暴露的 /plugins/better-dsh-pet/status HTTP 端点，
 * 把最新状态转发给透明置顶窗口内的 renderer。
 */
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { existsSync } = require('node:fs')

// 允许无用户手势直接播放 MP3 闹钟
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let mainWindow = null
let pollTimer = null

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
  createWindow()
  ipcMain.on('pet:closed', (_event, reason) => {
    void notifyHostClosed().finally(() => app.quit())
  })
  ipcMain.on('pet:hide', () => {
    if (mainWindow) mainWindow.hide()
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
  ipcMain.on('pet:beep', () => {
    try { shell.beep() } catch { /* 系统不支持时忽略 */ }
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

app.on('window-all-closed', () => {
  app.quit()
})
