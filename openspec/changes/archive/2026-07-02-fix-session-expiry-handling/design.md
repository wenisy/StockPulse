## Context

### 当前认证数据流

```
页面加载
  │
  ▼
useTrackerEffects (effect #1, 只跑一次)
  │  localStorage.token 存在？
  ├─ 是 → setIsLoggedIn(true)          ← 仅凭 token 存在判断
  │        fetchJsonData(token)
  │        refreshPrices()
  └─ 否 → 加载本地 prices.json

fetchJsonData / refreshPrices / saveDataToBackend / useCalendarData
  │
  ▼
stock-backend (JWT verify)
  ├─ 有效 → 200
  └─ 过期 → 401 { message: '无效或过期的令牌' | '未授权' }
```

### 问题根因

`handleTokenExpired`（`usePortfolioSync.ts`）当前只做：

1. `localStorage.removeItem('token'/'user')`
2. 重置 `yearData` 为 `stockInitialData`
3. 弹窗「会话已过期」

**缺失**：未调用 `setIsLoggedIn(false)` / `setCurrentUser(null)`，导致 `UserPanelSlot` 仍渲染已登录 UI。

### 后端行为（已验证，无需改动）

`stock-backend/lib/middleware/auth.js` 的 `verifyToken` 在 JWT 过期时返回 `false`，各 API 统一响应 401：

| API | 401 消息 |
|-----|---------|
| `/api/data` | 无效或过期的令牌 |
| `/api/calendarData` | 无效或过期的令牌 |
| `/api/updatePrices` | 未授权 |
| `/api/updateNotion` | 未授权 |

## Goals / Non-Goals

**Goals:**

- token 过期后 UI 立即回到未登录态（顶栏显示「登录」按钮）
- 所有受保护 API 的 401 均触发同一 `handleTokenExpired` 路径
- 初始化时检测到过期后中止后续 IO，避免「数据加载失败」等误导性错误
- 修复 effect #5 竞态：过期登出后不误加载旧 `stockPortfolioData`
- 补全测试，覆盖 401 → 登出 → UI 状态重置

**Non-Goals:**

- 不修改后端 JWT 有效期或 refresh token 机制
- 不实现 silent token refresh
- 不清理遗留的 `useUserManagement.ts`（未被引用）
- 不统一 Authorization header 格式（后端已兼容 Bearer 和 raw token）
- 不在本次自动弹出登录对话框（可作为后续增强）

## Decisions

### 决策 1：通过 props 注入登录态 setter（而非全局 event）

`usePortfolioSync` 新增 `setIsLoggedIn` / `setCurrentUser` props，由 `PortfolioContext` 从 `trackerState` 传入。

**理由**：与现有 hook 组合模式一致，类型安全，易测试。
**备选**：`window.dispatchEvent('token-expired')` — 隐式耦合，难追踪。

### 决策 2：抽取 `src/lib/auth.ts` 统一 401 判断

```ts
isUnauthorizedResponse(status, message?)  // status===401 或 message 含「无效或过期的令牌」
clearAuthStorage()                          // remove token + user
```

**理由**：后端 401 消息有两种文案（「无效或过期的令牌」「未授权」），以 status 为主、message 为辅。
**备选**：各 hook 各自判断 — 易遗漏、不一致。

### 决策 3：`useCalendarData` 接受可选 `onUnauthorized` 回调

hook 签名：`useCalendarData({ onUnauthorized?: () => void })`

组件层（`PlannerSection`、`OverviewSection`）传入 `portfolioData.handleTokenExpired`。

**理由**：`useCalendarData` 不直接依赖 `trackerState`，保持 IO hook 纯净。
**备选**：在 hook 内直接读 Context — 引入循环依赖风险。

### 决策 4：初始化流程用 token 存在性作为中止信号

`fetchJsonData` 完成后检查 `localStorage.getItem('token')`，若已被 `handleTokenExpired` 清除则 `return`，跳过 `refreshPrices`。

**理由**：最小改动，不引入额外 flag。
**备选**：`fetchJsonData` 返回 `{ expired: boolean }` — 更明确但需改接口。

### 决策 5：effect #5 增加「会话过期」守卫

在 effect #5（`isLoggedIn` 变 false 时加载本地数据）中，若本次登出由 token 过期触发（可用 ref 标记或检查 alert 状态），跳过加载 `stockPortfolioData`。

**更简方案**：effect #5 仅在「从未登录过」（初始 mount 且无 token）时加载本地数据；若从 `isLoggedIn=true` 变为 `false`（含过期登出），不加载本地缓存。

**理由**：过期登出应展示 `stockInitialData`（由 `handleTokenExpired` 设置），而非数年前的本地缓存。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 多处调用 `handleTokenExpired` 导致重复弹窗 | `handleTokenExpired` 内检查 token 是否已清除，已清除则 no-op |
| effect #5 守卫误伤正常登出 | 正常登出（`handleLogout`）同样不应加载旧本地数据，行为一致 |
| `loadRemainingYears` 静默忽略 401 | 本次在 `loadRemainingYears` 中补充 401 检测并调用 `handleTokenExpired` |
| `useCalendarView.fetchAvailableYears` 未处理 401 | 本次 scope 外（静默降级影响小）；可在 tasks 中列为 follow-up |

## Migration Plan

纯前端修复，无数据迁移。部署后用户刷新页面即可生效。无需清理 localStorage。

## Open Questions

- 是否在「会话已过期」弹窗确认后自动打开登录对话框？（建议 follow-up，本次不实现）