const { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');
require('dotenv').config();

const { askClaude } = require('./providers/claude');
const { askGemini } = require('./providers/gemini');

let overlayWindow = null;

function createOverlay() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  overlayWindow = new BrowserWindow({
    width: 380,
    height: 520,
    x: width - 400,
    y: 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    // Request mic + screen recording permissions up front
    systemPreferences.askForMediaAccess('microphone').catch(() => {});
  }

  createOverlay();

  // Toggle overlay with Cmd+Shift+Space
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
});

// --- IPC handlers ---

ipcMain.handle('capture-screen', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1280, height: 800 },
  });
  if (!sources.length) return null;
  // Return PNG data URL of primary screen
  return sources[0].thumbnail.toDataURL();
});

ipcMain.handle('ask-ai', async (_evt, { provider, prompt, screenshotDataUrl, history }) => {
  try {
    if (provider === 'gemini') {
      return await askGemini({ prompt, screenshotDataUrl, history });
    }
    return await askClaude({ prompt, screenshotDataUrl, history });
  } catch (err) {
    return { error: err.message || String(err) };
  }
});
