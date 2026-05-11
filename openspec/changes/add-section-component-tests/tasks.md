## 1. KpiCards 测试

- [x] 1.1 创建 `src/components/sections/__tests__/KpiCards.test.tsx`
- [x] 1.2 测试：5 张卡片标签全部渲染
- [x] 1.3 测试：空数据时不崩溃

## 2. StockHoldingCard 测试

- [x] 2.1 创建 `src/components/sections/__tests__/StockHoldingCard.test.tsx`
- [x] 2.2 测试：shares=0 显示「已清仓」
- [x] 2.3 测试：shares>0 显示市值（不为空）
- [x] 2.4 测试：历史有持仓但最新年为 0 → 渲染（不 return null）

## 3. HoldingsSection 表单流程

- [x] 3.1 创建 `src/components/sections/__tests__/HoldingsSection.test.tsx`
- [x] 3.2 测试：初始不显示表单
- [x] 3.3 测试：点击「添加交易」按钮后表单展开

## 4. 验收

- [x] 4.1 `npm run lint` 0 errors
- [x] 4.2 `npm run test:coverage` 全过 + 至少 +10 用例
- [x] 4.3 `npm run build` 成功
