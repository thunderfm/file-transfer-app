// main.js - Electron main process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let rsyncProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile('src/index.html');
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

// Handle rsync transfer with improved progress tracking
ipcMain.handle('start-transfer', async (event, { sourcePaths, destination }) => {
  return new Promise((resolve, reject) => {
    if (!destination || !sourcePaths || sourcePaths.length === 0) {
      reject('Invalid source or destination');
      return;
    }

    const sources = sourcePaths.map(p => `"${p}"`).join(' ');
    const dest = `"${destination}"`;
    const command = `rsync -av --progress ${sources} ${dest}/`;

    let filesProcessed = 0;
    let fileCount = 0;

    rsyncProcess = spawn('bash', ['-c', command], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    rsyncProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      
      lines.forEach(line => {
        // Parse rsync progress lines like: "12345 100%   1.23MB/s    0:00:05 (xfr#1, ir-chk=1000/2000)"
        const progressMatch = line.match(/(\d+)\s+(\d+)%\s+([\d.]+[KMG]B\/s)/);
        if (progressMatch) {
          const bytes = parseInt(progressMatch[1]);
          const percent = parseInt(progressMatch[2]);
          const filename = line.split(/\s+/)[0];
          
          // Extract file info
          const fileMatch = line.match(/xfr#(\d+),\s*ir-chk=(\d+)\/(\d+)/);
          if (fileMatch) {
            filesProcessed = parseInt(fileMatch[1]);
            fileCount = parseInt(fileMatch[3]);
          }

          const overallPercent = fileCount > 0 
            ? Math.round((filesProcessed / fileCount) * 100)
            : 0;

          event.sender.send('transfer-progress', {
            fileProgress: percent,
            overallProgress: overallPercent,
            currentFile: filename,
            stats: `File ${filesProcessed}/${fileCount}`
          });
        }
      });
    });

    rsyncProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('rsync:', output);
    });

    rsyncProcess.on('close', (code) => {
      rsyncProcess = null;
      if (code === 0) {
        resolve({ success: true });
      } else if (code === 143 || code === 15) {
        reject('Transfer cancelled');
      } else {
        reject(`Transfer failed with exit code ${code}`);
      }
    });

    rsyncProcess.on('error', (error) => {
      rsyncProcess = null;
      reject(`Transfer failed: ${error.message}`);
    });
  });
});

// Handle cancellation
ipcMain.handle('cancel-transfer', async () => {
  if (rsyncProcess) {
    rsyncProcess.kill('SIGTERM');
    rsyncProcess = null;
  }
  return true;
});

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections'],
  });
  return result.filePaths;
});