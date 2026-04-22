const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  serverStart:    () => ipcRenderer.invoke('server:start'),
  serverStop:     () => ipcRenderer.invoke('server:stop'),
  serverStatus:   () => ipcRenderer.invoke('server:status'),
  onServerUpdate: (cb) => ipcRenderer.on('server:update', (_, v) => cb(v)),
  winMinimize:    () => ipcRenderer.send('win:minimize'),
  winClose:       () => ipcRenderer.send('win:close'),
});
