// Electron shell for the frameless, always-on-top widget page (../widget.html).
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

// On Linux the app must start with --ozone-platform=x11 (Wayland ignores always-on-top and app-driven
// window moves) and --no-sandbox (recent Ubuntu blocks Chromium's sandbox). The flags have to be on the
// command line: the npm scripts pass them, and packaged builds start through the wrapper from after-pack.cjs.

// The widget is a tiny static card; the GPU process crashes under XWayland on some drivers and it isn't needed.
app.disableHardwareAcceleration()

const statePath = path.join(app.getPath('userData'), 'window.json')

function loadPosition() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'))
  } catch {
    const { workArea } = screen.getPrimaryDisplay()
    return { x: workArea.x + workArea.width - 300, y: workArea.y + 40 }
  }
}

function createWindow() {
  const { x, y } = loadPosition()
  const win = new BrowserWindow({
    x,
    y,
    width: 260,
    height: 320,
    frame: false,
    backgroundColor: '#f7f5f0',
    resizable: false,
    alwaysOnTop: true,
    // Stays in the taskbar so a minimized (hidden) widget can be brought back.
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  })
  // 'screen-saver' keeps it above fullscreen and other always-on-top windows.
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Dev loads the Vite server; packaged builds load the copy built into ./renderer.
  if (process.env.HIBU_WIDGET_URL) win.loadURL(process.env.HIBU_WIDGET_URL)
  else win.loadFile(path.join(__dirname, 'renderer', 'widget.html'))

  win.on('moved', () => {
    const [px, py] = win.getPosition()
    fs.writeFileSync(statePath, JSON.stringify({ x: px, y: py }))
  })
  return win
}

app.whenReady().then(() => {
  const win = createWindow()
  ipcMain.on('widget:move', (_e, x, y) => win.setPosition(Math.round(x), Math.round(y)))
  ipcMain.on('widget:size', (_e, w, h) => win.setSize(Math.round(w), Math.round(h)))
  ipcMain.on('widget:close', () => app.quit())
  ipcMain.on('widget:minimize', () => win.minimize())
  ipcMain.on('widget:pin', (_e, pinned) => win.setAlwaysOnTop(Boolean(pinned), 'screen-saver'))
})

app.on('window-all-closed', () => app.quit())
