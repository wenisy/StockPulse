## 1. Phase 1 准备

- [x] 1.1 在特性分支启动该变更
- [x] 1.2 跑一次 `npm test` + `npm run test:coverage` 记录基线（264 用例 / 三组件未覆盖）

## 2. ProfitLossCalendar 集成测试

- [x] 2.1 创建 `src/components/__tests__/ProfitLossCalendar.test.tsx`
- [x] 2.2 mock `useCalendarData` / `getUSEasternDate` 等 hook
- [x] 2.3 测试初始渲染（按日视图默认）
- [x] 2.4 测试切换到年度视图
- [x] 2.5 测试切换月份（向前/向后）
- [x] 2.6 测试切换年份
- [x] 2.7 测试生成快照按钮（成功 + 失败兜底）
- [x] 2.8 测试日历单元格渲染（盈/亏/持平/无数据）
- [x] 2.9 跑 `npx jest ProfitLossCalendar` 全绿
- [x] 2.10 验证 line 覆盖 ≥ 80%

## 3. UserProfileManager 集成测试

- [x] 3.1 创建 `src/components/__tests__/UserProfileManager.test.tsx`
- [x] 3.2 mock fetch（登录/注册 API）
- [x] 3.3 测试 ref.openLoginDialog() 弹出登录对话框
- [x] 3.4 测试 ref.openRegisterDialog() 弹出注册对话框
- [x] 3.5 测试 ref.openProfileDialog() 弹出资料对话框
- [x] 3.6 测试 ref.logout() 清除 localStorage 并重置
- [x] 3.7 测试登录成功流程（输入用户名密码 + 提交 + token 写入 localStorage）
- [x] 3.8 测试登录失败提示
- [x] 3.9 测试注册成功流程
- [x] 3.10 跑 `npx jest UserProfileManager` 全绿
- [x] 3.11 验证 line 覆盖 ≥ 80%

## 4. StockPortfolioTracker 集成测试

- [x] 4.1 创建 `src/components/__tests__/StockPortfolioTracker.test.tsx`
- [x] 4.2 mock 全部业务 hook（usePortfolioData / useStockOperations / useUserManagement / useUserSettings / useChartData / useTableData）返回 fixture
- [x] 4.3 测试初始渲染（默认年份 + 默认数据）
- [x] 4.4 测试切换选中年份
- [x] 4.5 测试切换币种
- [x] 4.6 测试隐藏/显示股票
- [x] 4.7 测试添加现金交易（输入金额 + 提交）
- [x] 4.8 测试添加股票交易触发 confirmAddNewStock
- [x] 4.9 测试打开/关闭报表对话框
- [x] 4.10 测试视图切换（图表 / 表格）
- [x] 4.11 跑 `npx jest StockPortfolioTracker` 全绿
- [x] 4.12 验证 line 覆盖 ≥ 80%

## 5. Phase 1 收尾

- [x] 5.1 跑 `npm test`：所有用例（含原 264 + 新增）全部通过
- [x] 5.2 跑 `npm run test:coverage` 三组件 line ≥ 80%
- [x] 5.3 跑 `npm run lint` + `npm run build` 通过
- [x] 5.4 commit Phase 1：`test(components): 给 3 个大组件补集成测试`
- [x] 5.5 push 让 CI 跑通，确认 GitHub Actions 绿色
- [x] 5.6 执行 `/tcsc:review-pipeline refactor-large-components`，verifier + reviewer 通过

## 6. Phase 2 重构 ProfitLossCalendar

- [x] 6.1 新建 `src/components/calendar/` 目录
- [x] 6.2 抽出 `useCalendarView`（视图状态 + 美东时间）
- [x] 6.3 抽出 `useSnapshotGeneration`（快照生成逻辑）
- [x] 6.4 拆出 `MonthlyCalendarView` 子组件
- [x] 6.5 拆出 `YearlySummaryView` 子组件
- [x] 6.6 改写 `ProfitLossCalendar.tsx` 为编排层（≤ 200 行）
- [x] 6.7 更新调用方 import 路径（如有）
- [x] 6.8 跑 `npx jest ProfitLossCalendar` 测试不变全绿
- [x] 6.9 确认所有新文件 ≤ 各自上限

## 7. Phase 2 重构 UserProfileManager（推迟到后续提案）

> **本次提案不实施**：用户选择仅拆分最大的 ProfitLossCalendar 来验证整套流程。
> 测试网（§3）已就位，未来单独提案启动时可直接进入重构阶段。

- [ ] 7.1 [推迟] 新建 `src/components/user/` 目录
- [ ] 7.2 [推迟] 抽出 `useAuthDialogs`（弹窗状态聚合）
- [ ] 7.3 [推迟] 抽出 `useUserAuthApi`（fetch 登录/注册）
- [ ] 7.4 [推迟] 拆出 `LoginDialog` 子组件
- [ ] 7.5 [推迟] 拆出 `RegisterDialog` 子组件
- [ ] 7.6 [推迟] 拆出 `ProfileEditDialog` 子组件
- [ ] 7.7 [推迟] 改写 `UserProfileManager.tsx` 保留 forwardRef API（≤ 200 行）
- [ ] 7.8 [推迟] 跑 `npx jest UserProfileManager` 测试不变全绿
- [ ] 7.9 [推迟] 确认所有新文件 ≤ 各自上限

## 8. Phase 2 重构 StockPortfolioTracker（推迟到后续提案）

> **本次提案不实施**：作为应用根入口风险最大，留给单独提案处理。
> 测试网（§4）已就位。

- [ ] 8.1 [推迟] 抽出 `useTrackerState`
- [ ] 8.2 [推迟] 拆出 `PortfolioTrackerHeader` 子组件
- [ ] 8.3 [推迟] 改写 `StockPortfolioTracker.tsx` 为 layout 编排层
- [ ] 8.4 [推迟] 跑 `npx jest StockPortfolioTracker` 测试不变全绿
- [ ] 8.5 [推迟] 确认所有新文件 ≤ 各自上限

## 9. Phase 2 收尾

- [x] 9.1 跑 `npm test`：所有用例全绿
- [x] 9.2 跑 `npm run test:coverage` lib 100% / hooks 阈值通过 / 三组件 ≥ 80%
- [x] 9.3 跑 `npm run lint` + `npm run build` 通过
- [x] 9.4 检查所有 `*.tsx` 源文件 ≤ 300 行：`find src -name '*.tsx' ! -path '*/__tests__/*' -exec wc -l {} \; | awk '$1 > 300'` 应为空
- [x] 9.5 commit Phase 2：`refactor(components): 拆分 3 个大组件按职责分层`

## 10. 校验与归档

- [x] 10.1 执行 `/tcsc:review-pipeline refactor-large-components`
- [x] 10.2 修复任何 CRITICAL 后再次跑 review-pipeline 直到通过
- [x] 10.3 push + merge main
- [x] 10.4 `/opsx:archive refactor-large-components`
