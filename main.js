/**
 * Electron 主进程
 * 纯 JavaScript 版本 - 无需 Python/Streamlit
 */

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 设置控制台编码为 UTF-8（修复 Windows 中文乱码）
if (process.platform === 'win32') {
  if (process.stdout.setDefaultEncoding) {
    process.stdout.setDefaultEncoding('utf8');
  }
  if (process.stderr.setDefaultEncoding) {
    process.stderr.setDefaultEncoding('utf8');
  }
}

// 导入业务模块
const api = require('./api');
const dataProcessor = require('./data-processor');
const cacheManager = require('./cache-manager');

let mainWindow;

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false, // 无边框窗口
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    backgroundColor: '#f0f2f6',
    transparent: false,
    opacity: 1.0
  });
  
  // 加载应用界面
  mainWindow.loadFile('index.html');
  
  // 窗口就绪后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('应用窗口已显示');
  });
  
  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // 开发模式打开开发者工具（可用F12手动打开）
  // if (!app.isPackaged || process.argv.includes('--dev')) {
  //   mainWindow.webContents.openDevTools();
  // }
  
  // 无边框窗口，不创建菜单
  // createMenu();
}

/**
 * 创建应用菜单
 */
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '刷新数据',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('refresh-data');
            }
          }
        },
        {
          label: '强制刷新（忽略缓存）',
          accelerator: 'Ctrl+F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('force-refresh');
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '查看',
      submenu: [
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        { type: 'separator' },
        { role: 'reload', label: '重新加载页面' },
        { role: 'forceReload', label: '强制重新加载' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: 'LOF 基金套利监控系统',
              detail: '版本: 2.0.0 (纯 JavaScript 版)\n基于 Electron 构建\n启动速度: < 1 秒'
            });
          }
        },
        {
          label: '清理旧缓存',
          click: async () => {
            const count = cacheManager.cleanOldCache(7);
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '缓存清理',
              message: `已清理 ${count} 个旧缓存文件`
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * IPC 处理程序：获取 LOF 数据
 */
ipcMain.handle('fetch-lof-data', async (event, forceRefresh = false) => {
  try {
    console.log('收到数据请求, forceRefresh:', forceRefresh);
    
    // 如果不强制刷新，先尝试加载缓存
    if (!forceRefresh) {
      const cached = cacheManager.loadCache();
      if (cached) {
        console.log('使用缓存数据');
        return {
          success: true,
          data: cached.data,
          count: cached.count,
          fromCache: true,
          date: cached.date
        };
      }
    }
    
    // 创建 AbortController 用于取消请求
    const controller = new AbortController();
    
    // 从 API 获取数据
    const result = await api.fetchAllLOFData(controller.signal);
    
    if (result.data.length > 0) {
      // 保存到缓存
      cacheManager.saveCache(result.data);
      
      return {
        success: true,
        data: result.data,
        count: result.count,
        fromCache: false,
        errors: result.errors,
        elapsed: result.elapsed
      };
    } else {
      return {
        success: false,
        error: '未获取到数据',
        errors: result.errors
      };
    }
    
  } catch (error) {
    console.error('获取数据失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * IPC 处理程序：处理数据
 */
ipcMain.handle('process-data', async (event, rawData) => {
  try {
    const processed = dataProcessor.processLOFData(rawData);
    return {
      success: true,
      data: processed
    };
  } catch (error) {
    console.error('处理数据失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * IPC 处理程序：过滤数据
 */
ipcMain.handle('filter-data', async (event, data, minPremium, minVolume, filterSuspended) => {
  try {
    const filtered = dataProcessor.filterData(data, minPremium, minVolume, filterSuspended);
    return {
      success: true,
      data: filtered
    };
  } catch (error) {
    console.error('过滤数据失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * IPC 处理程序：导出 CSV
 */
ipcMain.handle('export-csv', async (event, data, filename) => {
  try {
    const csv = dataProcessor.exportToCSV(data);
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出 CSV',
      defaultPath: filename || 'lof_data.csv',
      filters: [
        { name: 'CSV 文件', extensions: ['csv'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (filePath) {
      fs.writeFileSync(filePath, csv, 'utf8');
      return {
        success: true,
        path: filePath
      };
    }
    
    return {
      success: false,
      cancelled: true
    };
    
  } catch (error) {
    console.error('导出 CSV 失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * IPC 处理程序：获取缓存信息
 */
ipcMain.handle('get-cache-info', async () => {
  try {
    const info = cacheManager.getCacheInfo();
    return {
      success: true,
      info: info
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * IPC 处理程序：设置窗口透明度
 */
ipcMain.handle('set-opacity', async (event, opacity) => {
  try {
    if (mainWindow) {
      // 透明度范围 0.3 - 1.0
      const validOpacity = Math.max(0.3, Math.min(1.0, opacity));
      mainWindow.setOpacity(validOpacity);
      console.log(`窗口透明度设置为: ${validOpacity}`);
      return {
        success: true,
        opacity: validOpacity
      };
    }
    return {
      success: false,
      error: '窗口未初始化'
    };
  } catch (error) {
    console.error('设置透明度失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * IPC 处理程序：窗口控制
 */
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

/**
 * IPC 处理程序：调整窗口大小
 */
ipcMain.handle('resize-window', (event, bounds) => {
  if (mainWindow) {
    try {
      mainWindow.setBounds(bounds);
      return { success: true };
    } catch (error) {
      console.error('调整窗口大小失败:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: '窗口未初始化' };
});

/**
 * IPC 处理程序：获取窗口边界
 */
ipcMain.handle('get-window-bounds', () => {
  if (mainWindow) {
    return mainWindow.getBounds();
  }
  return null;
});

/**
 * IPC 处理程序：获取最小窗口大小
 */
ipcMain.handle('get-min-size', () => {
  if (mainWindow) {
    const minSize = mainWindow.getMinimumSize();
    return { width: minSize[0], height: minSize[1] };
  }
  return { width: 1000, height: 700 };
});

/**
 * 应用启动
 */
app.whenReady().then(() => {
  console.log('Electron 应用启动 (纯 JavaScript 版)');
  
  // 清理旧缓存
  cacheManager.cleanOldCache(7);
  
  createWindow();
  
  // macOS 上重新激活
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 所有窗口关闭时
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 应用退出前清理
 */
app.on('before-quit', () => {
  console.log('应用退出');
});
