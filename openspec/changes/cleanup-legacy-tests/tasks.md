## 1. 前置验证

- [ ] 1.1 确认提案 1 `extract-portfolio-pure-logic` 已归档
- [ ] 1.2 确认提案 2 `test-portfolio-pure-logic` 已归档
- [ ] 1.3 确认提案 3 `refactor-hooks-to-use-pure-logic` 已归档
- [ ] 1.4 确认提案 4 `test-hooks` 已归档
- [ ] 1.5 跑 `npm run test:coverage`，确认 lib 100% + hooks ≥ 80%
- [ ] 1.6 人工 E2E 回归 6 个核心流程（添加现金 / 买入 / 卖出 / 新建年份 / 行编辑 / 删除股票）通过

## 2. 逐文件 review 再删除

- [ ] 2.1 阅读 `StockPortfolioTracker.test.tsx`（522 行），确认无遗漏规则，删除
- [ ] 2.2 阅读 `StockPortfolioTracker.basic.test.tsx`（137 行），删除
- [ ] 2.3 阅读 `StockPortfolioTracker.core.test.tsx`（281 行），删除
- [ ] 2.4 阅读 `StockPortfolioTracker.calculations.test.tsx`（373 行），删除（此文件的断言已在提案 0 落到 spec）
- [ ] 2.5 阅读 `StockPortfolioTracker.async.test.tsx`（166 行），删除
- [ ] 2.6 阅读 `test-helpers.ts`（206 行），确认无被保留的测试引用，删除
- [ ] 2.7 删除根目录 `test-cash-transaction-duplicate.js`
- [ ] 2.8 删除根目录 `test-holdings-calculation.js`

> 如果步骤 2.1–2.6 中发现任何**未在 spec 中的业务规则**，MUST 暂停，先补 spec + 补 lib 测试，然后再回来执行删除。

## 3. 验证清理结果

- [ ] 3.1 `npm test` 全部通过（且时间明显缩短）
- [ ] 3.2 `npm run test:coverage` 覆盖率不因为删除而异常
- [ ] 3.3 `ls src/components/__tests__/` 仅剩 `Combobox.test.tsx`
- [ ] 3.4 `ls /*test-*.js` 应为空（根目录）

## 4. 归档

- [ ] 4.1 推送 + MR + review（PR 描述列出"删除的每个文件 + 去向"）
- [ ] 4.2 执行 `/opsx:archive cleanup-legacy-tests`
