## 1. 确认新 UI 完整性

- [ ] 1.1 遍历每个原 legacy 功能点，对照新 section 确认已覆盖

## 2. 删除 legacy 代码

- [ ] 2.1 删除 StockPortfolioTracker.tsx + tracker/
- [ ] 2.2 删除不再被引用的老展示组件
- [ ] 2.3 删除 LegacyTrackerEntry.tsx
- [ ] 2.4 清理 page.tsx 的 legacy 分支

## 3. 清理测试

- [ ] 3.1 删除/改写 tracker 相关测试
- [ ] 3.2 覆盖率再跑一遍，维持阈值

## 4. 验收

- [ ] 4.1 lint + build + test 全过
