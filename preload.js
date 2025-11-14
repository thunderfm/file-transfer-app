const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startTransfer: (sourcePaths, destination) =>
    ipcRenderer.invoke('start-transfer', { sourcePaths, destination }),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  onTransferProgress: (callback) =>
    ipcRenderer.on('transfer-progress', (event, data) => callback(data)),
});