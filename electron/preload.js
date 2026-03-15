const { contextBridge, ipcRenderer } = require("electron");

// Expose a safe API on window.screenAssist for the renderer process.
// Each method maps to an ipcMain.handle() registered in main.js.
contextBridge.exposeInMainWorld("screenAssist", {
  listSources: () => ipcRenderer.invoke("list-sources"),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  restoreWindow: () => ipcRenderer.invoke("restore-window"),
  onScreenSelection: (callback) =>
    ipcRenderer.on("screen-selection", (_event, rect) => callback(rect)),
  openOverlay: () => ipcRenderer.send("open-overlay"),
  saveSnapshot: (dataUrl) => ipcRenderer.invoke("save-snapshot", dataUrl),
  readSnapshot: (filePath) => ipcRenderer.invoke("read-snapshot", filePath),
  deleteSnapshot: (filePath) => ipcRenderer.invoke("delete-snapshot", filePath),
});
