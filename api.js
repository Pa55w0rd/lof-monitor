/**
 * API 调用模块
 * 负责从集思录获取 LOF 数据
 */

const axios = require('axios');

// API 配置
const API_CONFIG = {
  baseURL: 'https://www.jisilu.cn/data/lof/stock_lof_list/',
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'X-Requested-With': 'XMLHttpRequest'
  }
};

// API 端点配置（5个端点）
const API_ENDPOINTS = {
  qdii_c: {
    url: 'https://www.jisilu.cn/data/qdii/qdii_list/C',
    params: { only_lof: 'y' },
    name: 'QDII LOF C'
  },
  qdii_e: {
    url: 'https://www.jisilu.cn/data/qdii/qdii_list/E',
    params: { only_lof: 'y' },
    name: 'QDII LOF E'
  },
  qdii_a: {
    url: 'https://www.jisilu.cn/data/qdii/qdii_list/A',
    params: { only_lof: 'y' },
    name: 'QDII LOF A'
  },
  index_lof: {
    url: 'https://www.jisilu.cn/data/lof/index_lof_list/',
    params: {},
    name: '指数LOF'
  },
  stock_lof: {
    url: 'https://www.jisilu.cn/data/lof/stock_lof_list/',
    params: {},
    name: '股票LOF'
  }
};

/**
 * 获取单个类型的 LOF 数据
 */
async function fetchLOFData(endpoint, signal) {
  try {
    console.log(`正在获取 ${endpoint.name} 数据...`);
    
    const response = await axios.get(endpoint.url, {
      params: endpoint.params,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
      signal: signal
    });
    
    if (response.status === 200 && response.data) {
      const rows = response.data.rows || [];
      console.log(`✓ ${endpoint.name}: 获取 ${rows.length} 条记录`);
      return {
        success: true,
        data: rows,
        count: rows.length,
        category: endpoint.name
      };
    }
    
    return {
      success: false,
      error: `HTTP ${response.status}`,
      category: endpoint.name
    };
    
  } catch (error) {
    console.error(`✗ ${endpoint.name} 获取失败:`, error.message);
    return {
      success: false,
      error: error.message,
      category: endpoint.name
    };
  }
}

/**
 * 并发获取所有 LOF 数据
 */
async function fetchAllLOFData(signal) {
  console.log('开始获取 LOF 数据...');
  const startTime = Date.now();
  
  // 并发请求所有端点
  const promises = Object.values(API_ENDPOINTS).map(endpoint => 
    fetchLOFData(endpoint, signal)
  );
  
  const results = await Promise.all(promises);
  
  // 合并所有成功的数据
  const allData = [];
  const errors = [];
  
  results.forEach(result => {
    if (result.success) {
      allData.push(...result.data);
    } else {
      errors.push(`${result.category}: ${result.error}`);
    }
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`数据获取完成，用时 ${elapsed} 秒，共 ${allData.length} 条记录`);
  
  if (errors.length > 0) {
    console.warn('部分数据获取失败:', errors);
  }
  
  return {
    data: allData,
    count: allData.length,
    errors: errors,
    elapsed: parseFloat(elapsed)
  };
}

/**
 * 测试 API 连接
 */
async function testConnection() {
  try {
    const response = await axios.get(API_ENDPOINTS.qdii.url, {
      params: { ...API_ENDPOINTS.qdii.params, rp: 1 },
      timeout: 5000,
      headers: API_CONFIG.headers
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('API 连接测试失败:', error.message);
    return false;
  }
}

module.exports = {
  fetchAllLOFData,
  testConnection,
  API_ENDPOINTS
};
