const { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');
require('dotenv').config();

const { askClaude } = require('./providers/claude');
const { askGemini } = require('./providers/gemini');

let overlayWindow = null;
let followInterval = null;
let captureInterval = null;
let latestScreenshot = null;

const BUBBLE_SIZE = { width: 80, height: 80 };
const PANEL_SIZE  = { width: 380, height: 520 };
let expanded = false;

function createOverlay() {
  overlayWindow = new BrowserWindow({
    width: BUBBLE_SIZE.width,
    height: BUBBLE_SIZE.height,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Click-through while collapsed; renderer will toggle this off when expanded
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function startFollowingCursor() {
  if (followInterval) clearInterval(followInterval);
  followInterval = setInterval(() => {
    if (!overlayWindow || expanded) return;
    const pt = screen.getCursorScreenPoint();
    // Offset the bubble slightly down-right of the cursor
    overlayWindow.setBounds({
      x: pt.x + 18,
      y: pt.y + 18,
      width: BUBBLE_SIZE.width,
      height: BUBBLE_SIZE.height,
    });
  }, 30);
}

async function captureLatest() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 800 },
    });
    if (sources.length) latestScreenshot = sources[0].thumbnail.toDataURL();
  } catch {}
}

function startBackgroundCapture() {
  if (captureInterval) clearInterval(captureInterval);
  captureLatest();
  captureInterval = setInterval(captureLatest, 4000);
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('microphone').catch(() => {});
  }

  createOverlay();
  startFollowingCursor();
  startBackgroundCapture();

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (!overlayWindow) return;
    if (overlayWindow.isVisible()) overlayWindow.hide();
    else overlayWindow.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (followInterval) clearInterval(followInterval);
  if (captureInterval) clearInterval(captureInterval);
});

// --- IPC handlers ---

ipcMain.handle('get-latest-screenshot', async () => {
  if (!latestScreenshot) await captureLatest();
  return latestScreenshot;
});

ipcMain.handle('set-expanded', (_evt, shouldExpand) => {
  if (!overlayWindow) return;
  expanded = !!shouldExpand;
  if (expanded) {
    const pt = screen.getCursorScreenPoint();
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    // Place panel near cursor but keep it on-screen
    const x = Math.min(Math.max(pt.x + 18, 0), sw - PANEL_SIZE.width);
    const y = Math.min(Math.max(pt.y + 18, 0), sh - PANEL_SIZE.height);
    overlayWindow.setBounds({ x, y, ...PANEL_SIZE });
    overlayWindow.setIgnoreMouseEvents(false);
    overlayWindow.focus();
  } else {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setBounds({
      x: overlayWindow.getBounds().x,
      y: overlayWindow.getBounds().y,
      ...BUBBLE_SIZE,
    });
  }
});

// Renderer asks main to enable mouse events temporarily (e.g. hover on bubble)
ipcMain.handle('set-mouse-passthrough', (_evt, passthrough) => {
  if (!overlayWindow) return;
  if (passthrough) overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  else overlayWindow.setIgnoreMouseEvents(false);
});

ipcMain.handle('ask-ai', async (_evt, { provider, prompt, history }) => {
  try {
    // Always use the freshest background screenshot
    if (!latestScreenshot) await captureLatest();
    if (provider === 'gemini') {
      return await askGemini({ prompt, screenshotDataUrl: latestScreenshot, history });
    }
    return await askClaude({ prompt, screenshotDataUrl: latestScreenshot, history });
  } catch (err) {
    return { error: err.message || String(err) };
  }
});
