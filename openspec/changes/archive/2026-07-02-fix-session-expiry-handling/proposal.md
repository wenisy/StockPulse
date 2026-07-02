## Why

用户长时间未使用应用（如一个月）后再次打开页面，JWT token 已过期但 localStorage 仍保留旧 token。当前前端在收到后端 401 时虽会调用 `handleTokenExpired` 清除存储，却**未同步重置 React 登录态**（`isLoggedIn` / `currentUser`），导致 UI 仍显示已登录、后续请求持续失败并弹出「数据加载失败」「获取数据失败」等错误，用户无法被引导回登录流程。

现有 `openspec/specs/portfolio-domain/spec.md` 已约定 401 时清理 `token` 与 `user`，但缺少「UI 登录态同步」与「全链路 401 统一处理」的要求。本次变更补齐契约并修复实现缺口。

## What Changes

- 增强 `handleTokenExpired`：清除 localStorage 的同时重置 `isLoggedIn=false`、`currentUser=null`，弹出「会话已过期」提示
- 初始化流程（`useTrackerEffects`）：`fetchJsonData` 检测到 token 已被清除后，中止后续 `refreshPrices`，避免连锁错误
- 统一 401 检测：抽取 `src/lib/auth.ts` 工具函数，在 `usePortfolioSync`（fetch / refreshPrices / saveDataToBackend）及 `useCalendarData` 中复用
- 日历相关组件（`ProfitLossCalendar`、`DailyTrendChart`、`ReportDialog`）接入 `onUnauthorized` 回调，触发统一登出
- 修复 `useTrackerEffects` effect #5 竞态：token 过期后不应加载过期的本地 `stockPortfolioData` 覆盖云端重置
- 补全单元测试覆盖上述场景

## Capabilities

### New Capabilities

（无新增 capability——本次为现有域内行为修复）

### Modified Capabilities

- `portfolio-domain`：扩展「登录令牌过期清理」场景，要求同步重置 UI 登录态、统一处理所有受保护 API 的 401、初始化流程中止后续 IO

## Impact

- **修改文件**：`src/hooks/usePortfolioSync.ts`、`src/hooks/usePortfolioData.ts`、`src/components/tracker/hooks/useTrackerEffects.ts`、`src/hooks/useCalendarData.ts`、`src/components/shell/PortfolioContext.tsx`、`src/components/sections/PlannerSection.tsx`、`src/components/sections/overview/OverviewSection.tsx`、`src/components/ProfitLossCalendar.tsx`、`src/components/DailyTrendChart.tsx`、`src/components/ReportDialog.tsx`
- **新增文件**：`src/lib/auth.ts`（401 检测与存储清理工具）
- **测试**：`usePortfolioSync`、`usePortfolioData`、`useCalendarData` 及 `auth` 工具测试
- **不涉及**：后端 `stock-backend`（已正确返回 401）、`useUserManagement.ts`（遗留未引用代码，不在本次范围）