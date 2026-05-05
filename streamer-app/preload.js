const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  serverStart:    () => ipcRenderer.invoke('server:start'),
  serverStop:     () => ipcRenderer.invoke('server:stop'),
  serverStatus:   () => ipcRenderer.invoke('server:status'),
  onServerUpdate: (cb) => ipcRenderer.on('server:update', (_, v) => cb(v)),

  configLoad:  ()     => ipcRenderer.invoke('config:load'),
  configSave:  (data) => ipcRenderer.invoke('config:save', data),

  pickExe:     ()     => ipcRenderer.invoke('dialog:pickExe'),
  getAppIcon:      (p) => ipcRenderer.invoke('app:getIcon', p),
  launchApp:       (p) => ipcRenderer.invoke('app:launch', p),
  createShortcut:  ()  => ipcRenderer.invoke('app:createShortcut'),

  winMinimize: () => ipcRenderer.send('win:minimize'),
  winClose:    () => ipcRenderer.send('win:close'),
});
