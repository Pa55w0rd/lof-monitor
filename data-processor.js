/**
 * 数据处理模块
 * 负责解析、转换、过滤和格式化 LOF 数据
 */

/**
 * 安全转换为浮点数
 */
function toFloat(val, defaultValue = 0.0) {
  try {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      val = val.replace('%', '').replace(',', '').trim();
    }
    const num = parseFloat(val);
    return isNaN(num) ? defaultValue : num;
  } catch {
    return defaultValue;
  }
}

/**
 * 处理原始 LOF 数据
 */
function processLOFData(rawData) {
  const processedData = [];
  
  rawData.forEach(item => {
    try {
      const cell = item.cell || {};
      
      const fundId = cell.fund_id || '';
      const fundName = cell.fund_nm || '';
      
      if (!fundId || !fundName) return;
      
      // 提取字段（根据实际 API 返回的字段名）
      const increaseRt = cell.increase_rt || '';
      const price = cell.price || '';
      const nav = cell.fund_nav || cell.nav || '';
      const estimateValue = cell.estimate_value || '';
      
      const volume = cell.volume || ''; // 单位：万元
      const amount = cell.amount || ''; // 单位：万份
      const amountIncrease = cell.amount_incr || cell.amount_increase || '';
      const discountRt = cell.discount_rt || ''; // 包含 %
      const applyFee = cell.apply_fee || cell.buy_fee || ''; // 包含 %
      
      const applyStatus = cell.apply_status || '';
      
      // 转换为数值（单位转换）
      const volumeYuan = toFloat(volume) * 10000; // 万元 -> 元
      const amountFen = toFloat(amount) * 10000;  // 万份 -> 份
      
      // 成交额为0时，判断为停牌
      let finalApplyStatus = applyStatus;
      if (volumeYuan === 0 || volume === '0' || volume === '') {
        finalApplyStatus = '停牌';
      }
      
      processedData.push({
        fundId: fundId,
        fundName: fundName,
        increaseRt: toFloat(increaseRt),
        price: toFloat(price),
        nav: toFloat(nav),
        estimateValue: toFloat(estimateValue),
        volume: volumeYuan,
        amount: amountFen,
        amountIncrease: toFloat(amountIncrease),
        discountRt: toFloat(discountRt),
        applyFee: toFloat(applyFee),
        applyStatus: finalApplyStatus
      });
      
    } catch (error) {
      console.error('处理数据项失败:', error, item);
    }
  });
  
  // 按溢价率降序排序
  processedData.sort((a, b) => b.discountRt - a.discountRt);
  
  console.log(`数据处理完成，共 ${processedData.length} 条有效记录`);
  
  return processedData;
}

/**
 * 过滤数据
 */
function filterData(data, minPremium, minVolume, filterSuspended = true) {
  return data.filter(item => {
    const meetsPremium = item.discountRt >= minPremium;
    const meetsVolume = item.volume >= minVolume;
    
    // 如果启用了过滤暂停申购，则检查申购状态和停牌状态
    let canApply = true;
    if (filterSuspended) {
      canApply = item.applyStatus !== '停止申购' && 
                 item.applyStatus !== '暂停申购' &&
                 item.applyStatus !== '停牌';
    }
    
    return meetsPremium && meetsVolume && canApply;
  });
}

/**
 * 计算统计数据
 */
function calculateStats(data, filteredData) {
  const stats = {
    total: data.length,
    filtered: filteredData.length,
    highPremium: filteredData.filter(item => item.discountRt >= 2.0).length,
    maxPremium: data.length > 0 ? Math.max(...data.map(item => item.discountRt)) : 0
  };
  
  return stats;
}

/**
 * 格式化数值为显示用字符串
 */
function formatNumber(num, decimals = 2) {
  if (typeof num !== 'number' || isNaN(num)) return '0.00';
  return num.toFixed(decimals);
}

/**
 * 格式化金额（显示为万元或亿元）
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
 * 为表格显示格式化数据
 */
function formatForDisplay(data) {
  return data.map(item => ({
    ...item,
    increaseRtStr: formatNumber(item.increaseRt) + '%',
    priceStr: formatNumber(item.price),
    navStr: formatNumber(item.nav),
    estimateValueStr: formatNumber(item.estimateValue),
    volumeStr: formatAmount(item.volume),
    amountStr: formatAmount(item.amount),
    amountIncreaseStr: formatNumber(item.amountIncrease),
    discountRtStr: formatNumber(item.discountRt) + '%',
    applyFeeStr: formatNumber(item.applyFee) + '%'
  }));
}

/**
 * 导出为 CSV
 */
function exportToCSV(data) {
  const headers = [
    '基金代码', '基金名称', '涨跌幅(%)', '现价', '基金净值', 
    '实时估值', '场内成交额', '场内份额', '场内新增', 
    '溢价率(%)', '申购费(%)', '申购状态'
  ];
  
  const rows = data.map(item => [
    item.fundId,
    item.fundName,
    formatNumber(item.increaseRt),
    formatNumber(item.price),
    formatNumber(item.nav),
    formatNumber(item.estimateValue),
    formatAmount(item.volume),
    formatAmount(item.amount),
    formatNumber(item.amountIncrease),
    formatNumber(item.discountRt),
    formatNumber(item.applyFee),
    item.applyStatus
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return '\ufeff' + csvContent; // 添加 BOM 以支持 Excel 的 UTF-8
}

module.exports = {
  processLOFData,
  filterData,
  calculateStats,
  formatForDisplay,
  exportToCSV,
  formatNumber,
  formatAmount
};
