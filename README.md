# 股票投资组合追踪工具

这是一个基于React的股票投资组合追踪工具，可以帮助用户跟踪多年的股票投资、现金流和投资回报。

## 在线演示

访问 [https://wenisy.github.io/StockPulse/](https://wenisy.github.io/StockPulse) 查看在线演示。

## 功能特点

- 多年度股票投资追踪
- 股票买入/卖出交易记录
- 现金存取功能
- 投资组合价值可视化（折线图和柱状图）
- 详细的投资报表
- 数据导入/导出功能
- 自动本地保存

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

### 部署到GitHub Pages

```bash
npm run deploy
```

## 自动部署

本项目使用GitHub Actions实现自动构建和部署。每当推送代码到main分支时，GitHub Actions会自动构建项目并部署到GitHub Pages。

## 技术栈

- React
- Recharts (图表库)
- Tailwind CSS
- shadcn/ui 组件
- Local Storage (本地数据存储)
