# LOF Monitor

> LOF基金套利机会实时监控工具

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Pa55w0rd/lof-monitor)
[![Electron](https://img.shields.io/badge/Electron-32+-green.svg)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

**作者**: [Pa55w0rd](https://github.com/Pa55w0rd)

---

## 简介

LOF Monitor 是一个基于 Electron 开发的桌面应用，用于实时监控 LOF 基金的套利机会。通过集成集思录 API，自动获取并分析基金数据，帮助用户快速发现溢价套利机会。

**核心特性**：
- 实时数据监控（集思录 API）
- 智能筛选（溢价率、成交额）
- 自动刷新（1-30分钟可调）
- 搜索功能（基金代码/名称）
- 数据导出（CSV格式）

---

## 快速开始

### 环境要求

- **Node.js**: v16+
- **npm**: v8+
- **系统**: Windows 10/11, macOS, Linux

### 安装运行

#### 方式1：使用启动脚本（推荐）

```bash
cd electron_pure
双击 → 一键启动.bat   # Windows
```

#### 方式2：命令行

```bash
cd electron_pure
npm install
npm start
```

---

## 功能说明

### 数据筛选

- **溢价率筛选**: -5% ~ 10%，默认大于 5%
- **成交额筛选**: 0 ~ 1亿元，默认大于 2000万
- **状态过滤**: 过滤停牌/暂停申购的基金

### 自动刷新

- **刷新间隔**: 0-30分钟可调
- **倒计时显示**: 实时显示下次刷新时间
- **数据来源**: 自动刷新强制从API获取最新数据

### 搜索功能

- 支持基金代码搜索（如：501018）
- 支持基金名称搜索（如：南方）
- 实时过滤，即时显示结果

### 数据展示

**统计卡片**:
- 总数量：所有LOF基金数量
- 符合条件：满足筛选条件的数量
- 最高溢价率：当前最高溢价率

**数据表格**:
- 套利机会：符合筛选条件的基金
- 全部数据：所有获取到的基金

**字段说明**:
```
基金代码 | 基金名称 | 涨跌幅 | 溢价率 | 现价 | 基金净值 | 实时估值 | 成交额 | 申购费 | 申购状态
```

---

## 套利说明

### 套利原理

可自行百度。

**注意事项**：
- T+2（T+3）确认风险（溢价可能消失）
- 流动性风险（卖出可能无法成交）
- 净值波动风险（基金下跌侵蚀收益）

---

## 使用技巧

### 推荐配置

| 使用场景 | 刷新间隔 | 说明 |
|---------|---------|------|
| 日常监控 | 10-15分钟 | 平衡数据新鲜度和性能 |
| 高频交易 | 1-5分钟 | 数据实时性高 |
| 数据分析 | 不刷新 | 使用缓存避免干扰 |

### 快捷操作

- 搜索框输入基金代码快速定位
- 拖动筛选滑块实时过滤数据
- 点击导出CSV保存当前数据
- 设置自动刷新解放双手

---

## 打包部署

### 打包命令

```bash
cd electron_pure
双击 → 一键打包.bat   # Windows
# 或
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

### 打包输出

```
dist/
├── LOF Monitor Setup.exe  # 安装包
└── win-unpacked/          # 免安装版
    └── LOF Monitor.exe
```

### 注意事项

- 应用未签名，首次运行可能提示"未知发布者"
- 点击"仍要运行"即可正常使用
- 如需商业发布，建议购买代码签名证书

---

## 技术架构

### 技术栈

```
框架: Electron 32+
语言: JavaScript (ES6+)
运行时: Node.js 16+
HTTP客户端: axios
打包工具: electron-builder
```

### 目录结构

```
electron_pure/
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本
├── renderer.js          # 渲染进程
├── index.html           # 应用界面
├── styles.css           # 样式文件
├── api.js               # API 调用
├── data-processor.js    # 数据处理
├── cache-manager.js     # 缓存管理
└── package.json         # 项目配置
```

---


## 许可证

MIT License

---

## 作者

**Pa55w0rd**

- GitHub: https://github.com/Pa55w0rd
- 项目地址: https://github.com/Pa55w0rd/lof-monitor

---

## 致谢

- **Electron**: 跨平台桌面应用框架
- **集思录**: 提供LOF基金数据API

---

## 免责声明

本工具仅供学习和参考使用，不构成任何投资建议。使用本工具进行投资决策，风险自负。

---

**如果觉得有帮助，欢迎 Star ⭐**
