/**
 * 渲染进程 - 前端逻辑
 * 处理 UI 交互和数据展示
 */

// 全局状态
let allData = [];
let filteredData = [];
let currentFilters = {
  minPremium: 5,
  minVolume: 2000 * 10000, // 2000万 = 20000000元
  filterSuspended: true
};
let searchKeywords = {
  filtered: '',
  all: ''
};
let refreshConfig = {
  interval: 0, // 刷新间隔（分钟），0表示不自动刷新
  timer: null, // 定时器ID
  countdown: 0, // 倒计时（秒）
  countdownTimer: null // 倒计时定时器ID
};

// DOM 元素（将在 DOM 加载后初始化）
let elements = null;

/**
 * 初始化应用
 */
async function init() {
  console.log('应用初始化...');
  
  // 初始化 DOM 元素引用
  elements = {
    // 标题栏
    minimizeBtn: document.getElementById('minimize-btn'),
    maximizeBtn: document.getElementById('maximize-btn'),
    closeBtn: document.getElementById('close-btn'),
    // 控制
    premiumSlider: document.getElementById('premium-slider'),
    premiumValue: document.getElementById('premium-value'),
    volumeSlider: document.getElementById('volume-slider'),
    volumeValue: document.getElementById('volume-value'),
    opacitySlider: document.getElementById('opacity-slider'),
    opacityValue: document.getElementById('opacity-value'),
    filterSuspendedCheckbox: document.getElementById('filter-suspended'),
    refreshIntervalSlider: document.getElementById('refresh-interval-slider'),
    refreshIntervalValue: document.getElementById('refresh-interval-value'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshBtnText: document.getElementById('refresh-btn-text'),
    forceRefreshBtn: document.getElementById('force-refresh-btn'),
    cacheInfo: document.getElementById('cache-info'),
    loading: document.getElementById('loading'),
    statsTotal: document.getElementById('stat-total'),
    statsFiltered: document.getElementById('stat-filtered'),
    statsMax: document.getElementById('stat-max'),
    filteredCount: document.getElementById('filtered-count'),
    allCount: document.getElementById('all-count'),
    filteredTbody: document.getElementById('filtered-tbody'),
    allTbody: document.getElementById('all-tbody'),
    searchFiltered: document.getElementById('search-filtered'),
    searchAll: document.getElementById('search-all'),
    exportFilteredBtn: document.getElementById('export-filtered-btn'),
    exportAllBtn: document.getElementById('export-all-btn'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    toast: document.getElementById('toast')
  };
  
  // 验证按钮元素
  console.log('窗口控制按钮:', {
    minimize: elements.minimizeBtn,
    maximize: elements.maximizeBtn,
    close: elements.closeBtn
  });
  
  // 绑定事件
  bindEvents();
  
  // 加载缓存信息
  await updateCacheInfo();
  
  // 加载数据（启动时强制从API获取最新数据）
  await loadData(true);
}

/**
 * 绑定事件处理程序
 */
function bindEvents() {
  // 窗口控制按钮
  elements.minimizeBtn.addEventListener('click', () => {
    window.electronAPI.windowMinimize();
  });
  
  elements.maximizeBtn.addEventListener('click', () => {
    window.electronAPI.windowMaximize();
  });
  
  elements.closeBtn.addEventListener('click', () => {
    window.electronAPI.windowClose();
  });
  
  // 滑块事件
  elements.premiumSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    elements.premiumValue.textContent = value.toFixed(2) + '%';
    currentFilters.minPremium = value;
    updateFilteredData();
  });
  
  elements.volumeSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) * 10000; // 转换为元
    elements.volumeValue.textContent = formatAmount(value);
    currentFilters.minVolume = value;
    updateFilteredData();
  });
  
  // 透明度滑块事件
  elements.opacitySlider.addEventListener('input', async (e) => {
    const value = parseFloat(e.target.value);
    elements.opacityValue.textContent = value + '%';
    const opacity = value / 100;
    try {
      await window.electronAPI.setOpacity(opacity);
    } catch (error) {
      console.error('设置透明度失败:', error);
    }
  });
  
  // 过滤暂停申购复选框
  elements.filterSuspendedCheckbox.addEventListener('change', (e) => {
    currentFilters.filterSuspended = e.target.checked;
    updateFilteredData();
  });
  
  // 自动刷新间隔滑块
  elements.refreshIntervalSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    updateRefreshInterval(value);
  });
  
  // 按钮事件
  elements.refreshBtn.addEventListener('click', () => {
    loadData(false);
    // 手动刷新后重置倒计时
    if (refreshConfig.interval > 0) {
      refreshConfig.countdown = refreshConfig.interval * 60;
      updateRefreshButtonText();
    }
  });
  elements.forceRefreshBtn.addEventListener('click', () => {
    loadData(true);
    // 强制刷新后重置倒计时
    if (refreshConfig.interval > 0) {
      refreshConfig.countdown = refreshConfig.interval * 60;
      updateRefreshButtonText();
    }
  });
  elements.exportFilteredBtn.addEventListener('click', () => exportData(filteredData, 'filtered'));
  elements.exportAllBtn.addEventListener('click', () => exportData(allData, 'all'));
  
  // 搜索框事件
  elements.searchFiltered.addEventListener('input', (e) => {
    searchKeywords.filtered = e.target.value.trim().toLowerCase();
    renderFilteredTable();
  });
  
  elements.searchAll.addEventListener('input', (e) => {
    searchKeywords.all = e.target.value.trim().toLowerCase();
    renderAllTable();
  });
  
  // 标签页切换
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // 监听菜单刷新事件
  window.electronAPI.onRefreshData(() => loadData(false));
  window.electronAPI.onForceRefresh(() => loadData(true));
}

/**
 * 加载数据
 */
async function loadData(forceRefresh = false) {
  try {
    showLoading(true);
    
    console.log('加载数据，forceRefresh:', forceRefresh);
    
    // 获取原始数据
    const result = await window.electronAPI.fetchLOFData(forceRefresh);
    
    if (!result.success) {
      showToast('数据加载失败: ' + result.error, 'error');
      return;
    }
    
    console.log('数据获取成功:', result.count, '条');
    
    // 处理数据
    const processResult = await window.electronAPI.processData(result.data);
    
    if (!processResult.success) {
      showToast('数据处理失败: ' + processResult.error, 'error');
      return;
    }
    
    allData = processResult.data;
    
    // 更新显示
    updateFilteredData();
    updateCacheInfo();
    
    const source = result.fromCache ? '缓存' : 'API';
    showToast(`数据加载成功！共 ${allData.length} 条记录（来源：${source}）`, 'success');
    
  } catch (error) {
    console.error('加载数据失败:', error);
    showToast('数据加载失败: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * 更新过滤后的数据
 */
async function updateFilteredData() {
  try {
    const result = await window.electronAPI.filterData(
      allData,
      currentFilters.minPremium,
      currentFilters.minVolume,
      currentFilters.filterSuspended
    );
    
    if (!result.success) {
      console.error('过滤数据失败:', result.error);
      return;
    }
    
    filteredData = result.data;
    
    // 更新统计
    updateStats();
    
    // 更新表格
    updateTable('filtered', filteredData);
    updateTable('all', allData);
    
  } catch (error) {
    console.error('更新过滤数据失败:', error);
  }
}

/**
 * 更新统计卡片
 */
function updateStats() {
  const maxPremium = allData.length > 0 
    ? Math.max(...allData.map(item => item.discountRt)) 
    : 0;
  
  elements.statsTotal.textContent = allData.length;
  elements.statsFiltered.textContent = filteredData.length;
  elements.statsMax.textContent = maxPremium.toFixed(2) + '%';
  
  elements.filteredCount.textContent = filteredData.length;
  elements.allCount.textContent = allData.length;
}

/**
 * 更新表格
 */
function updateTable(tableType, data) {
  const tbody = tableType === 'filtered' ? elements.filteredTbody : elements.allTbody;
  const searchKeyword = tableType === 'filtered' ? searchKeywords.filtered : searchKeywords.all;
  
  // 根据搜索关键词过滤数据
  let displayData = data;
  if (searchKeyword) {
    displayData = data.filter(item => {
      const fundId = item.fundId.toLowerCase();
      const fundName = item.fundName.toLowerCase();
      return fundId.includes(searchKeyword) || fundName.includes(searchKeyword);
    });
  }
  
  if (displayData.length === 0) {
    const message = searchKeyword ? '未找到匹配的基金' : '暂无数据';
    tbody.innerHTML = `<tr><td colspan="10" class="no-data">${message}</td></tr>`;
    return;
  }
  
  const rows = displayData.map(item => {
    const premiumClass = getPremiumClass(item.discountRt);
    const increaseClass = getIncreaseClass(item.increaseRt);
    
    return `
      <tr>
        <td>${item.fundId}</td>
        <td>${item.fundName}</td>
        <td class="${increaseClass}">${formatIncrease(item.increaseRt)}</td>
        <td class="${premiumClass}">${item.discountRt.toFixed(2)}%</td>
        <td>${item.price.toFixed(2)}</td>
        <td>${item.nav.toFixed(4)}</td>
        <td>${item.estimateValue.toFixed(4)}</td>
        <td>${formatAmount(item.volume)}</td>
        <td>${item.applyFee.toFixed(2)}%</td>
        <td>${item.applyStatus || '-'}</td>
      </tr>
    `;
  }).join('');
  
  tbody.innerHTML = rows;
}

/**
 * 单独渲染筛选表格
 */
function renderFilteredTable() {
  updateTable('filtered', filteredData);
}

/**
 * 单独渲染全部数据表格
 */
function renderAllTable() {
  updateTable('all', allData);
}

/**
 * 获取溢价率样式类
 */
function getPremiumClass(premium) {
  if (premium >= 2.0) return 'premium-high';
  if (premium >= 0.5) return 'premium-medium';
  if (premium >= 0) return 'premium-low';
  return 'premium-negative';
}

/**
 * 获取涨跌幅样式类
 */
function getIncreaseClass(increase) {
  if (increase > 0) return 'increase-positive';
  if (increase < 0) return 'increase-negative';
  return '';
}

/**
 * 格式化涨跌幅
 */
function formatIncrease(increase) {
  const sign = increase > 0 ? '+' : '';
  return `${sign}${increase.toFixed(2)}%`;
}

/**
 * 更新刷新间隔
 */
function updateRefreshInterval(minutes) {
  refreshConfig.interval = minutes;
  
  // 更新显示
  if (minutes === 0) {
    elements.refreshIntervalValue.textContent = '不刷新';
  } else {
    elements.refreshIntervalValue.textContent = `${minutes} 分钟`;
  }
  
  // 停止现有定时器
  stopAutoRefresh();
  
  // 启动新的自动刷新
  if (minutes > 0) {
    startAutoRefresh();
  } else {
    // 不自动刷新，恢复按钮文本
    elements.refreshBtnText.textContent = '刷新数据';
  }
}

/**
 * 启动自动刷新
 */
function startAutoRefresh() {
  console.log(`启动自动刷新，间隔: ${refreshConfig.interval} 分钟`);
  
  // 设置倒计时
  refreshConfig.countdown = refreshConfig.interval * 60; // 转换为秒
  
  // 更新按钮显示
  updateRefreshButtonText();
  
  // 启动倒计时定时器（每秒更新一次）
  refreshConfig.countdownTimer = setInterval(() => {
    refreshConfig.countdown--;
    
    if (refreshConfig.countdown <= 0) {
      // 倒计时结束，执行刷新（强制从API获取最新数据）
      loadData(true);
      // 重置倒计时
      refreshConfig.countdown = refreshConfig.interval * 60;
    }
    
    updateRefreshButtonText();
  }, 1000);
}

/**
 * 停止自动刷新
 */
function stopAutoRefresh() {
  if (refreshConfig.countdownTimer) {
    clearInterval(refreshConfig.countdownTimer);
    refreshConfig.countdownTimer = null;
  }
  refreshConfig.countdown = 0;
}

/**
 * 更新刷新按钮文本
 */
function updateRefreshButtonText() {
  if (refreshConfig.countdown > 0) {
    const minutes = Math.floor(refreshConfig.countdown / 60);
    const seconds = refreshConfig.countdown % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    elements.refreshBtnText.textContent = `下次刷新 ${timeStr}`;
  } else {
    elements.refreshBtnText.textContent = '刷新数据';
  }
}

/**
 * 格式化金额
 */
function formatAmount(amount) {
  if (amount >= 100000000) {
    return (amount / 100000000).toFixed(2) + ' 亿';
  } else if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + ' 万';
  }
  return amount.toFixed(2);
}

/**
 * 导出数据
 */
async function exportData(data, type) {
  try {
    if (data.length === 0) {
      showToast('没有数据可导出', 'warning');
      return;
    }
    
    const filename = `lof_data_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    const result = await window.electronAPI.exportCSV(data, filename);
    
    if (result.success) {
      showToast('数据导出成功！', 'success');
    } else if (!result.cancelled) {
      showToast('数据导出失败: ' + result.error, 'error');
    }
    
  } catch (error) {
    console.error('导出失败:', error);
    showToast('数据导出失败: ' + error.message, 'error');
  }
}

/**
 * 切换标签页
 */
function switchTab(tabName) {
  elements.tabBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  elements.tabPanes.forEach(pane => {
    if (pane.id === `tab-${tabName}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

/**
 * 更新缓存信息
 */
async function updateCacheInfo() {
  try {
    const result = await window.electronAPI.getCacheInfo();
    
    if (result.success && result.info.exists) {
      const info = result.info;
      const modifiedDate = new Date(info.modified).toLocaleString('zh-CN');
      const size = (info.size / 1024).toFixed(2);
      
      elements.cacheInfo.innerHTML = `
        <p class="info-text">
          <strong>📦 缓存信息</strong><br>
          记录数: ${info.count}<br>
          大小: ${size} KB<br>
          更新: ${modifiedDate}
        </p>
      `;
    } else {
      elements.cacheInfo.innerHTML = `
        <p class="info-text">
          <strong>📦 缓存信息</strong><br>
          暂无缓存数据
        </p>
      `;
    }
  } catch (error) {
    console.error('获取缓存信息失败:', error);
  }
}

/**
 * 显示/隐藏加载指示器
 */
function showLoading(show) {
  elements.loading.style.display = show ? 'flex' : 'none';
}

/**
 * 显示 Toast 通知
 */
function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

/**
 * 初始化窗口调整大小功能
 */
function initWindowResize() {
  const resizeBorders = document.querySelectorAll('.resize-border, .resize-corner');
  
  let isResizing = false;
  let resizeDirection = null;
  let startMousePos = { x: 0, y: 0 };
  let startBounds = { x: 0, y: 0, width: 0, height: 0 };
  let minSize = { width: 1000, height: 700 };
  
  // 获取最小尺寸
  window.electronAPI.getMinSize().then(size => {
    minSize = size;
  });
  
  resizeBorders.forEach(border => {
    border.addEventListener('mousedown', async (e) => {
      e.preventDefault();
      
      isResizing = true;
      resizeDirection = getResizeDirection(border);
      startMousePos = { x: e.screenX, y: e.screenY };
      startBounds = await window.electronAPI.getWindowBounds();
      
      // 添加全局鼠标移动和释放监听
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // 防止文本选择
      document.body.style.userSelect = 'none';
    });
  });
  
  function handleMouseMove(e) {
    if (!isResizing) return;
    
    const deltaX = e.screenX - startMousePos.x;
    const deltaY = e.screenY - startMousePos.y;
    
    let newBounds = { ...startBounds };
    
    // 根据方向计算新的位置和大小
    switch (resizeDirection) {
      case 'top':
        newBounds.y = startBounds.y + deltaY;
        newBounds.height = startBounds.height - deltaY;
        break;
      case 'right':
        newBounds.width = startBounds.width + deltaX;
        break;
      case 'bottom':
        newBounds.height = startBounds.height + deltaY;
        break;
      case 'left':
        newBounds.x = startBounds.x + deltaX;
        newBounds.width = startBounds.width - deltaX;
        break;
      case 'top-left':
        newBounds.x = startBounds.x + deltaX;
        newBounds.y = startBounds.y + deltaY;
        newBounds.width = startBounds.width - deltaX;
        newBounds.height = startBounds.height - deltaY;
        break;
      case 'top-right':
        newBounds.y = startBounds.y + deltaY;
        newBounds.width = startBounds.width + deltaX;
        newBounds.height = startBounds.height - deltaY;
        break;
      case 'bottom-left':
        newBounds.x = startBounds.x + deltaX;
        newBounds.width = startBounds.width - deltaX;
        newBounds.height = startBounds.height + deltaY;
        break;
      case 'bottom-right':
        newBounds.width = startBounds.width + deltaX;
        newBounds.height = startBounds.height + deltaY;
        break;
    }
    
    // 确保不小于最小尺寸
    if (newBounds.width < minSize.width) {
      if (resizeDirection.includes('left')) {
        newBounds.x = startBounds.x + startBounds.width - minSize.width;
      }
      newBounds.width = minSize.width;
    }
    
    if (newBounds.height < minSize.height) {
      if (resizeDirection.includes('top')) {
        newBounds.y = startBounds.y + startBounds.height - minSize.height;
      }
      newBounds.height = minSize.height;
    }
    
    // 应用新的边界
    window.electronAPI.resizeWindow(newBounds);
  }
  
  function handleMouseUp() {
    isResizing = false;
    resizeDirection = null;
    
    // 移除全局监听
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // 恢复文本选择
    document.body.style.userSelect = '';
  }
}

/**
 * 获取调整大小的方向
 */
function getResizeDirection(element) {
  if (element.classList.contains('resize-top')) return 'top';
  if (element.classList.contains('resize-right')) return 'right';
  if (element.classList.contains('resize-bottom')) return 'bottom';
  if (element.classList.contains('resize-left')) return 'left';
  if (element.classList.contains('resize-top-left')) return 'top-left';
  if (element.classList.contains('resize-top-right')) return 'top-right';
  if (element.classList.contains('resize-bottom-left')) return 'bottom-left';
  if (element.classList.contains('resize-bottom-right')) return 'bottom-right';
  return null;
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 加载完成');
  init();
  initWindowResize();
});

// 清理定时器
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});

console.log('Renderer.js 已加载 - 纯 JavaScript 版本');
