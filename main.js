// main.js - Electron main process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.webContents.openDevTools();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle rsync transfer
ipcMain.handle('start-transfer', async (event, { sourcePaths, destination }) => {
  return new Promise((resolve, reject) => {
    if (!destination || !sourcePaths || sourcePaths.length === 0) {
      reject('Invalid source or destination');
      return;
    }

    // Escape paths for shell
    const sources = sourcePaths.map(p => `"${p}"`).join(' ');
    const dest = `"${destination}"`;
    const command = `rsync -av --progress ${sources} ${dest}/`;

    let output = '';
    let totalLines = 0;

    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Transfer failed: ${error.message}`);
        return;
      }
      resolve({ success: true, output: stdout });
    });

    child.stdout.on('data', (data) => {
      output += data.toString();
      const lines = data.toString().split('\n');
      totalLines += lines.filter(l => l.includes('%')).length;
      
      lines.forEach(line => {
        // Parse rsync progress lines
        if (line.includes('%')) {
          try {
            const match = line.match(/(\d+)%/);
            if (match) {
              const progress = parseInt(match[1]);
              event.sender.send('transfer-progress', { 
                progress, 
                currentFile: line.split(' ').slice(0, 3).join(' ')
              });
            }
          } catch (e) {
            // Parsing error, skip
          }
        }
      });
    });

    child.stderr.on('data', (data) => {
      event.sender.send('transfer-progress', { 
        status: 'info', 
        message: data.toString() 
      });
    });
  });
});

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections'],
  });
  return result.filePaths;
});