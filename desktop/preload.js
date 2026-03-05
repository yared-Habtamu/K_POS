const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("posApi", {
  getQueuedSales: () => ipcRenderer.invoke("db:getQueuedSales"),
  saveSale: (sale) => ipcRenderer.invoke("db:saveSale", sale),
  markSynced: (id) => ipcRenderer.invoke("db:markSynced", id),
  getCachedProducts: () => ipcRenderer.invoke("db:getCachedProducts"),
});
