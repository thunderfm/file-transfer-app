const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startTransfer: (sourcePaths, destination) =>
    ipcRenderer.invoke('start-transfer', { sourcePaths, destination }),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  cancelTransfer: () => ipcRenderer.invoke('cancel-transfer'),
  onTransferProgress: (callback) =>
    ipcRenderer.on('transfer-progress', (event, data) => callback(data)),
});