const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('petBridge', {
  onStatus(callback) {
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('pet:status', listener)
    return () => ipcRenderer.removeListener('pet:status', listener)
  },
  close(reason) {
    ipcRenderer.send('pet:closed', reason || 'user')
  },
  hide() {
    ipcRenderer.send('pet:hide')
  },
  openWebUi(url) {
    ipcRenderer.send('pet:open-webui', url)
  },
  openDesktop() {
    ipcRenderer.send('pet:open-desktop')
  },
  moveBy(dx, dy) {
    ipcRenderer.send('pet:move-by', { dx, dy })
  },
  endDrag() {
    ipcRenderer.send('pet:drag-end')
  },
  setIgnoreMouse(ignore) {
    ipcRenderer.send('pet:set-ignore-mouse', { ignore })
  },
  beep() {
    ipcRenderer.send('pet:beep')
  },
  saveConfig(patch) {
    ipcRenderer.send('pet:save-config', patch)
  },
  requestRoast() {
    ipcRenderer.send('pet:request-roast')
  },
  refreshBalance() {
    ipcRenderer.send('pet:refresh-balance')
  },
  startVoice() {
    ipcRenderer.send('pet:voice-start')
  },
  toggleWakeWord() {
    ipcRenderer.send('pet:wake-word-toggle')
  },
  onVoiceResult(callback) {
    const listener = (_event, result) => callback(result)
    ipcRenderer.on('pet:voice-result', listener)
    return () => ipcRenderer.removeListener('pet:voice-result', listener)
  },
  onWakeState(callback) {
    const listener = (_event, enabled) => callback(enabled)
    ipcRenderer.on('pet:wake-state', listener)
    return () => ipcRenderer.removeListener('pet:wake-state', listener)
  },
})
