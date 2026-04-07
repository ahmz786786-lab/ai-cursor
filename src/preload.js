const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aiCursor', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  askAI: (payload) => ipcRenderer.invoke('ask-ai', payload),
});
