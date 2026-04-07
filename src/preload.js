const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aiCursor', {
  askAI: (payload) => ipcRenderer.invoke('ask-ai', payload),
  setExpanded: (v) => ipcRenderer.invoke('set-expanded', v),
  setMousePassthrough: (v) => ipcRenderer.invoke('set-mouse-passthrough', v),
});
