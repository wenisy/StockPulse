## 1. 准备

- [x] 1.1 在 feat/refactor-portfolio-tracker 分支工作
- [x] 1.2 新建 `src/components/tracker/hooks/` 目录
- [x] 1.3 跑基线：`npx jest StockPortfolioTracker` 7/7 绿

## 2. useTrackerState

- [x] 2.1 创建 `src/components/tracker/hooks/useTrackerState.ts`
- [x] 2.2 迁移 16 个 useState，按业务域分组导出

## 3. useTrackerCallbacks

- [x] 3.1 创建 `src/components/tracker/hooks/useTrackerCallbacks.ts`
- [x] 3.2 迁移 8 个 handler

## 4. useTrackerEffects

- [x] 4.1 创建 `src/components/tracker/hooks/useTrackerEffects.ts`
- [x] 4.2 迁移 6 个 useEffect

## 5. 改写主组件

- [x] 5.1 `StockPortfolioTracker.tsx` 只保留 layout + 组合 hook
- [x] 5.2 主文件 ≤ 300 行

## 6. 校验

- [x] 6.1 `npx jest StockPortfolioTracker` 7/7 全绿
- [x] 6.2 `npm test` 289+ 全绿
- [x] 6.3 `npm run lint` 0 errors
- [x] 6.4 `npm run build` 通过

## 7. review-pipeline + 归档

- [x] 7.1 commit
- [x] 7.2 review-pipeline 通过
- [x] 7.3 merge + push
- [x] 7.4 openspec archive
