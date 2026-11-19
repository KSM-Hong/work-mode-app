const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("grove", { setMini: (m) => ipcRenderer.send("set-mini", m), setOpacity: (o) => ipcRenderer.send("set-opacity", o) });
