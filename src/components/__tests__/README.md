# StockPortfolioTracker 组件测试

本目录包含针对 `StockPortfolioTracker` 组件的单元测试。这些测试旨在确保组件的核心功能在重构过程中保持不变。

## 测试文件结构

- `StockPortfolioTracker.test.tsx`: 主测试文件，包含组件的基本功能测试
- `StockPortfolioTracker.core.test.tsx`: 核心功能测试，专注于组件的主要功能
- `StockPortfolioTracker.calculations.test.tsx`: 计算功能测试，专注于组件的数据计算逻辑
- `test-helpers.ts`: 测试辅助函数和模拟数据

## 运行测试

可以使用以下命令运行测试：

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- StockPortfolioTracker.core.test.tsx

# 监视模式（在开发过程中持续运行测试）
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 测试覆盖的功能

这些测试覆盖了 `StockPortfolioTracker` 组件的以下核心功能：

1. **数据管理**
   - 初始化和数据加载
   - 年份管理（添加、选择年份）
   - 数据持久化（保存到 localStorage）

2. **交易功能**
   - 添加股票交易
   - 添加现金交易
   - 编辑和删除股票

3. **计算功能**
   - 投资组合总价值计算
   - 投资回报率计算
   - 股票成本价计算
   - 现金余额计算
   - 股票占比计算
   - 汇率转换
   - 年度增长率计算

4. **用户交互**
   - 登录/登出功能
   - 价格刷新功能
   - 报表生成功能
   - 股票可见性切换

## 测试策略

测试采用了以下策略：

1. **组件渲染测试**：确保组件能够正确渲染
2. **用户交互测试**：模拟用户交互，确保功能正常工作
3. **计算逻辑测试**：验证各种计算是否正确
4. **API交互测试**：模拟API调用，确保与后端交互正常

## 模拟对象

测试使用了以下模拟对象：

1. **localStorage**：模拟浏览器的 localStorage API
2. **fetch**：模拟网络请求
3. **uuid**：模拟唯一ID生成

## 注意事项

- 测试中使用了 `@testing-library/react` 和 `@testing-library/user-event` 来模拟用户交互
- 测试覆盖了组件的主要功能，但可能不包括所有边缘情况
- 在重构过程中，应确保所有测试都能通过，以保证功能不受影响
