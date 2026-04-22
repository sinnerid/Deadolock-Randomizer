const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let serverProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 520,
    minWidth: 640,
    minHeight: 420,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f0e1a',
    show: false,
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function startServer() {
  if (serverProcess) return true;
  const serverPath = path.join(__dirname, '..', 'server.js');
  serverProcess = spawn('node', [serverPath], { stdio: 'ignore', detached: false });
  serverProcess.on('exit', () => {
    serverProcess = null;
    mainWindow?.webContents.send('server:update', false);
  });
  serverProcess.on('error', () => {
    serverProcess = null;
    mainWindow?.webContents.send('server:update', false);
  });
  return true;
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

ipcMain.handle('server:start',  () => { startServer(); return { running: !!serverProcess }; });
ipcMain.handle('server:stop',   () => { stopServer();  return { running: false }; });
ipcMain.handle('server:status', () => ({ running: !!serverProcess }));

ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:close', () => { stopServer(); app.quit(); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { stopServer(); app.quit(); });
