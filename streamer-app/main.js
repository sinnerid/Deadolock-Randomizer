const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { generateICO } = require('./icon');

let mainWindow = null;
let serverProcess = null;

const CONFIG_PATH  = path.join(__dirname, 'config.json');
const ICON_PATH    = path.join(__dirname, 'icon.ico');

function ensureIcon() {
  if (!fs.existsSync(ICON_PATH)) fs.writeFileSync(ICON_PATH, generateICO());
  return ICON_PATH;
}

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...loadConfig(), ...data }, null, 2));
}

function createWindow() {
  const icon = ensureIcon();
  mainWindow = new BrowserWindow({
    width: 760,
    height: 520,
    minWidth: 640,
    minHeight: 420,
    frame: false,
    icon,
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
  serverProcess.on('exit',  () => { serverProcess = null; mainWindow?.webContents.send('server:update', false); });
  serverProcess.on('error', () => { serverProcess = null; mainWindow?.webContents.send('server:update', false); });
  return true;
}

function stopServer() {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
}

// Server
ipcMain.handle('server:start',  () => { startServer(); return { running: !!serverProcess }; });
ipcMain.handle('server:stop',   () => { stopServer();  return { running: false }; });
ipcMain.handle('server:status', () => ({ running: !!serverProcess }));

// Config
ipcMain.handle('config:load', () => loadConfig());
ipcMain.handle('config:save', (_, data) => { saveConfig(data); return true; });

// File picker
ipcMain.handle('dialog:pickExe', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Executable', extensions: ['exe'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// Get exe icon
ipcMain.handle('app:getIcon', async (_, exePath) => {
  try {
    const icon = await app.getFileIcon(exePath, { size: 'large' });
    return icon.toDataURL();
  } catch { return null; }
});

// Launch app
ipcMain.handle('app:launch', (_, exePath) => {
  if (!exePath) return { ok: false, error: 'Путь не указан' };
  try {
    spawn(exePath, [], { detached: true, stdio: 'ignore', cwd: path.dirname(exePath) }).unref();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Create desktop shortcut
ipcMain.handle('app:createShortcut', () => {
  try {
    const desktop = app.getPath('desktop');
    const shortcut = path.join(desktop, 'Streamer Tools.lnk');
    const ok = shell.writeShortcutLink(shortcut, 'create', {
      target: path.join(__dirname, 'start.bat'),
      icon: ICON_PATH,
      iconIndex: 0,
      description: 'Streamer Tools',
    });
    return { ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Window
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:close', () => { stopServer(); app.quit(); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { stopServer(); app.quit(); });
