/**
 * 缓存管理模块
 * 负责数据的本地缓存和读取
 */

const fs = require('fs');
const path = require('path');

// 缓存目录
const CACHE_DIR = path.join(__dirname, 'lof_cache');

/**
 * 确保缓存目录存在
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('创建缓存目录:', CACHE_DIR);
  }
}

/**
 * 获取今天的缓存文件名
 */
function getTodayCacheFile() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  return path.join(CACHE_DIR, `nav_cache_${dateStr}.json`);
}

/**
 * 检查缓存是否存在
 */
function cacheExists() {
  const cacheFile = getTodayCacheFile();
  return fs.existsSync(cacheFile);
}

/**
 * 加载缓存数据
 */
function loadCache() {
  try {
    const cacheFile = getTodayCacheFile();
    
    if (!fs.existsSync(cacheFile)) {
      console.log('缓存文件不存在');
      return null;
    }
    
    const content = fs.readFileSync(cacheFile, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`从缓存加载数据: ${data.count} 条记录`);
    
    return data;
    
  } catch (error) {
    console.error('加载缓存失败:', error.message);
    return null;
  }
}

/**
 * 保存数据到缓存
 */
function saveCache(data) {
  try {
    ensureCacheDir();
    
    const cacheFile = getTodayCacheFile();
    const cacheData = {
      date: new Date().toISOString(),
      count: data.length,
      data: data
    };
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
    
    console.log(`数据已缓存: ${cacheFile}`);
    
    return true;
    
  } catch (error) {
    console.error('保存缓存失败:', error.message);
    return false;
  }
}

/**
 * 清理旧缓存（保留最近 N 天）
 */
function cleanOldCache(keepDays = 7) {
  try {
    ensureCacheDir();
    
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    const keepMillis = keepDays * 24 * 60 * 60 * 1000;
    
    let cleanedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();
      
      if (age > keepMillis) {
        fs.unlinkSync(filePath);
        cleanedCount++;
        console.log(`删除旧缓存: ${file}`);
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`清理完成，删除 ${cleanedCount} 个旧缓存文件`);
    }
    
    return cleanedCount;
    
  } catch (error) {
    console.error('清理缓存失败:', error.message);
    return 0;
  }
}

/**
 * 获取缓存信息
 */
function getCacheInfo() {
  try {
    const cacheFile = getTodayCacheFile();
    
    if (!fs.existsSync(cacheFile)) {
      return {
        exists: false,
        file: cacheFile
      };
    }
    
    const stats = fs.statSync(cacheFile);
    const content = fs.readFileSync(cacheFile, 'utf8');
    const data = JSON.parse(content);
    
    return {
      exists: true,
      file: cacheFile,
      size: stats.size,
      modified: stats.mtime,
      count: data.count,
      date: data.date
    };
    
  } catch (error) {
    console.error('获取缓存信息失败:', error.message);
    return {
      exists: false,
      error: error.message
    };
  }
}

module.exports = {
  cacheExists,
  loadCache,
  saveCache,
  cleanOldCache,
  getCacheInfo,
  getTodayCacheFile
};
