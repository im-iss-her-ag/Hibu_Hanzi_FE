const { contextBridge, ipcRenderer } = require('electron')

// The bridge DesktopWidget.tsx expects as window.hibuWidget.
contextBridge.exposeInMainWorld('hibuWidget', {
  moveTo: (x, y) => ipcRenderer.send('widget:move', x, y),
  setSize: (w, h) => ipcRenderer.send('widget:size', w, h),
  close: () => ipcRenderer.send('widget:close'),
  minimize: () => ipcRenderer.send('widget:minimize'),
  setPinned: (pinned) => ipcRenderer.send('widget:pin', pinned),
})
