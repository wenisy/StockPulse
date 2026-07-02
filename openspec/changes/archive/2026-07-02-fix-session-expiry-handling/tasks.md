## 1. 基础设施

- [x] 1.1 创建 `src/lib/auth.ts`：`isUnauthorizedResponse` + `clearAuthStorage`
- [x] 1.2 新增 `src/lib/__tests__/auth.test.ts` 覆盖 401 判断与存储清理

## 2. 核心登出逻辑

- [x] 2.1 `usePortfolioSync` 新增 `setIsLoggedIn` / `setCurrentUser` props
- [x] 2.2 `handleTokenExpired` 调用 setter 重置登录态，使用 `clearAuthStorage`
- [x] 2.3 `handleTokenExpired` 添加幂等守卫（token 已清除时 no-op，避免重复弹窗）
- [x] 2.4 `usePortfolioData` + `PortfolioContext` 透传 setter
- [x] 2.5 `refreshPrices` / `saveDataToBackend` / `loadRemainingYears` 补充 401 → `handleTokenExpired`
- [x] 2.6 更新 `usePortfolioSync.test.ts` / `usePortfolioData.test.ts`

## 3. 初始化与 effect 竞态

- [x] 3.1 `useTrackerEffects`：`fetchJsonData` 后检查 token 是否存在，不存在则中止 `refreshPrices`
- [x] 3.2 `useTrackerEffects` effect #5：区分「初始未登录」与「从已登录被强制登出」，后者不加载 `stockPortfolioData`

## 4. 日历与其他 IO 路径

- [x] 4.1 `useCalendarData` 接受 `onUnauthorized` 可选参数，401 时调用
- [x] 4.2 `ProfitLossCalendar` / `DailyTrendChart` / `ReportDialog` 新增 `onUnauthorized` prop 并透传
- [x] 4.3 `PlannerSection` / `OverviewSection` 传入 `handleTokenExpired`
- [x] 4.4 `DailyTrendChart.fetchThreeMonths` raw fetch 补充 401 处理
- [x] 4.5 更新 `useCalendarData.test.ts`（401 触发 onUnauthorized）

## 5. 验证

- [x] 5.1 `npm test` 全量通过
- [ ] 5.2 手工验证：localStorage 放入过期 token → 刷新页面 → 顶栏变「登录」+ 弹「会话已过期」