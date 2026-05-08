## Why

仓库扫描后发现 5 个超 300 行的源文件，其中 3 个组件**完全没有测试**：

| 文件 | 行数 | 测试覆盖 | useState/useEffect 数量 |
|------|------|---------|----------------------|
| `ProfitLossCalendar.tsx` | 872 | ❌ 无 | 9 / 6 |
| `UserProfileManager.tsx` | 649 | ❌ 无 | 14 / 2 |
| `StockPortfolioTracker.tsx` | 553 | ❌ 无 | 16 / 6 |
| `usePortfolioSync.ts` | 374 | ✅ 有 | 4 / 0 |
| `year-data.ts` | 336 | ✅ 100% 覆盖 | 0 / 0 |

3 个零测试的大组件存在严重风险：

- 一旦改坏没人知道，缺乏安全网
- 文件过大难以理解和维护
- `StockPortfolioTracker` 有 16 个 useState，明显存在职责混杂
- `UserProfileManager` 用 forwardRef + useImperativeHandle 暴露弹窗控制，加上 14 个 useState 看起来包含登录 / 注册 / 修改密码 / 修改资料多个独立流程
- `ProfitLossCalendar` 是 872 行的日历视图，混合了"按日"和"年度汇总"两种视图模式

按用户要求**先补测试再重构**：每个组件先写完整集成测试达到 80%+ 覆盖，跑通确认基线，再着手重构。

`usePortfolioSync.ts` 374 行虽然超 300 行但已有测试，本提案不动它。`year-data.ts` 336 行是纯函数已 100% 覆盖，也不动。

## What Changes

按"先测试后重构"原则，分两个 phase 推进 3 个大组件：

### Phase 1：补集成测试（建立安全网）

为 3 个零测试的大组件各写完整集成测试，目标覆盖率 ≥ 80%：

- `src/components/__tests__/ProfitLossCalendar.test.tsx`
  - 按日视图渲染、按年视图切换、月份切换、年份切换、生成快照按钮、API 失败兜底
- `src/components/__tests__/UserProfileManager.test.tsx`
  - 通过 ref 触发登录弹窗、注册弹窗、个人资料弹窗、退出登录、登录成功流程、登录失败兜底
- `src/components/__tests__/StockPortfolioTracker.test.tsx`
  - 初始化 + localStorage 加载 + 切换年份 + 添加现金交易 + 添加股票交易 + 删除股票 + 报表对话框

### Phase 2：拆分重构（有测试网兜底后再动）

- `ProfitLossCalendar.tsx` 拆成：
  - `useCalendarView`：日历视图状态（当前年月/视图模式/可用年份）+ 美东时间初始化
  - `useSnapshotGeneration`：手动生成快照逻辑
  - `MonthlyCalendarView` 子组件：按日视图
  - `YearlySummaryView` 子组件：年度汇总视图
  - 主组件 `ProfitLossCalendar` 变成编排层

- `UserProfileManager.tsx` 拆成：
  - `useAuthDialogs`：登录/注册/资料三个弹窗状态聚合
  - `LoginDialog` / `RegisterDialog` / `ProfileEditDialog` 三个独立子组件
  - `useUserAuthApi` 封装 fetch 调用（与现有 useUserManagement 协同）
  - 主组件保留 forwardRef API（向下兼容）

- `StockPortfolioTracker.tsx` 拆成：
  - `useTrackerState`：聚合所有页面级 useState（hiddenStocks / currency / 报表对话框 等）
  - `PortfolioTrackerHeader` / `PortfolioTrackerBody` 两层
  - 主组件变成 ≤ 200 行的 layout 编排

每个 phase 都跑 lint + test:coverage + build 三件套，并执行 `/tcsc:review-pipeline` 后才能合入。

**明确不在范围**：
- 不动 `usePortfolioSync.ts`（已有测试）
- 不动 `year-data.ts`（100% 覆盖）
- 不修改组件对外的 props/ref API
- 不改业务行为
- 不引入新的状态管理库

## Capabilities

### New Capabilities

- `component-structure`: 定义 React 组件的拆分边界（视图组件 / hook / API 层）和测试覆盖要求

### Modified Capabilities

- `portfolio-codebase-layout`: 增加"组件文件 ≤ 300 行"作为代码结构契约的一部分

## Impact

- 新增：3 个组件的集成测试文件（`__tests__/`）
- 新增：5+ 个新 hook 文件（useCalendarView / useSnapshotGeneration / useAuthDialogs / useUserAuthApi / useTrackerState 等）
- 新增：5+ 个拆出的子组件文件
- 修改：3 个原大组件文件改造为编排层
- 不改：组件对外 API，调用侧（`page.tsx` 等）零改动
- CI：覆盖率阈值在新文件上同样适用，整体 line 覆盖率应有提升
