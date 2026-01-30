/**
 * Preload Script
 * 安全地暴露 API 到渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取 LOF 数据
  fetchLOFData: (forceRefresh = false) => 
    ipcRenderer.invoke('fetch-lof-data', forceRefresh),
  
  // 处理数据
  processData: (rawData) => 
    ipcRenderer.invoke('process-data', rawData),
  
  // 过滤数据
  filterData: (data, minPremium, minVolume, filterSuspended) => 
    ipcRenderer.invoke('filter-data', data, minPremium, minVolume, filterSuspended),
  
  // 导出 CSV
  exportCSV: (data, filename) => 
    ipcRenderer.invoke('export-csv', data, filename),
  
  // 获取缓存信息
  getCacheInfo: () => 
    ipcRenderer.invoke('get-cache-info'),
  
  // 设置窗口透明度
  setOpacity: (opacity) => 
    ipcRenderer.invoke('set-opacity', opacity),
  
  // 窗口控制
  windowMinimize: () => 
    ipcRenderer.invoke('window-minimize'),
  
  windowMaximize: () => 
    ipcRenderer.invoke('window-maximize'),
  
  windowClose: () => 
    ipcRenderer.invoke('window-close'),
  
  resizeWindow: (bounds) =>
    ipcRenderer.invoke('resize-window', bounds),
  
  getWindowBounds: () =>
    ipcRenderer.invoke('get-window-bounds'),
  
  getMinSize: () =>
    ipcRenderer.invoke('get-min-size'),
  
  // 监听刷新事件
  onRefreshData: (callback) => 
    ipcRenderer.on('refresh-data', callback),
  
  onForceRefresh: (callback) => 
    ipcRenderer.on('force-refresh', callback),
  
  // 平台信息
  platform: process.platform,
  version: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
});

console.log('Preload script loaded - Pure JavaScript version');
