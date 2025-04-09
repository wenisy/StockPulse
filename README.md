# StockPulse - 股票投资组合追踪工具

![StockPulse Logo](https://img.shields.io/badge/StockPulse-股票投资组合追踪-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC)

## 📊 项目简介

StockPulse 是一个功能强大的股票投资组合追踪工具，专为长期投资者设计。它可以帮助用户全面跟踪多年的股票投资、现金流和投资回报，提供直观的数据可视化和详细的投资分析报告。无论您是经验丰富的投资者还是刚刚开始投资之旅，StockPulse 都能满足您的投资追踪需求。

## 🌐 在线演示

访问 [https://wenisy.github.io/StockPulse/](https://wenisy.github.io/StockPulse) 查看在线演示。

## ✨ 核心功能

### 投资组合管理
- **多年度股票投资追踪**：按年份记录和管理您的投资组合
- **股票交易记录**：详细记录买入/卖出交易，包括日期、价格、数量等信息
- **现金流管理**：记录存款和取款，自动计算现金余额
- **股票代码支持**：支持美股、港股等多市场股票代码

### 数据分析与可视化
- **投资组合价值可视化**：通过折线图和柱状图直观展示投资组合价值变化
- **股票占比分析**：展示各股票在投资组合中的占比
- **投资回报计算**：自动计算投资回报率和绝对回报
- **详细的投资报表**：生成年度投资报表，包含详细的投资数据

### 数据管理
- **实时价格更新**：支持手动刷新股票最新价格
- **数据导入/导出**：支持数据的导入和导出，方便备份和迁移
- **自动本地保存**：自动将数据保存到本地，防止数据丢失
- **云端同步**：支持登录后将数据同步到云端（需要后端支持）

### 用户体验
- **响应式设计**：适配各种屏幕尺寸，提供良好的移动端体验
- **直观的用户界面**：简洁明了的界面设计，易于使用
- **多币种支持**：支持USD、HKD、CNY等多种货币

## 🔧️ 技术栈

### 前端框架与库
- **React**：用于构建用户界面的JavaScript库
- **Next.js**：React框架，提供服务端渲染和静态站点生成
- **TypeScript**：添加静态类型检查，提高代码质量
- **Recharts**：基于React的图表库，用于数据可视化
- **Tailwind CSS**：实用优先的CSS框架
- **shadcn/ui**：高质量的UI组件库

### 状态管理与数据存储
- **React Hooks**：用于状态管理和副作用处理
- **Local Storage**：本地数据持久化存储
- **RESTful API**：与后端服务通信

### 工具与部署
- **GitHub Actions**：自动化构建和部署
- **GitHub Pages**：静态网站托管

## 🚀 快速开始

### 前提条件

确保您的系统已安装以下软件：
- Node.js (v16.0.0 或更高版本)
- npm (v7.0.0 或更高版本)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/StockPulse.git
cd StockPulse
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 在浏览器中访问 `http://localhost:3000` 查看应用

### 构建生产版本

```bash
npm run build
```

### 部署到GitHub Pages

```bash
npm run deploy
```

## 🔄 自动部署

本项目使用GitHub Actions实现自动构建和部署。每当推送代码到main分支时，GitHub Actions会自动构建项目并部署到GitHub Pages。

## 📝 使用指南

### 添加新年份
1. 在主界面点击“添加年份”按钮
2. 输入年份（例如：2025）
3. 点击“添加年份”确认

### 添加股票交易
1. 选择交易年份
2. 输入股票名称、交易类型（买入/卖出）、股数和价格
3. 点击“添加交易”确认

### 添加现金交易
1. 选择交易年份
2. 输入金额和交易类型（存入/取出）
3. 点击“添加现金交易”确认

### 查看投资报表
1. 在主界面点击“查看报表”按钮
2. 选择要查看的年份
3. 查看详细的投资数据和分析

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 📧 联系方式

如有任何问题或建议，请通过以下方式联系我们：
- 电子邮件：your.email@example.com
- GitHub Issues：[https://github.com/yourusername/StockPulse/issues](https://github.com/yourusername/StockPulse/issues)

---

**StockPulse** - 让投资追踪变得简单而高效 📈
