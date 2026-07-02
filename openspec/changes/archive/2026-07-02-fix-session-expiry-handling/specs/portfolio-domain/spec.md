## MODIFIED Requirements

### Requirement: localStorage 持久化键名约定

前端 SHALL 使用以下固定键名持久化用户数据，键名变更视为破坏性变更：

- `stockPortfolioData`：JSON 序列化的 `{ [year]: YearData }`
- `stockPortfolioYears`：JSON 序列化的 `string[]`
- `stockPortfolioSelectedYear`：当前选中年份字符串
- `token`：登录令牌
- `user`：JSON 序列化的 `User`

#### Scenario: 登录令牌过期清理

- **WHEN** 后端返回 401，前端调用 `handleTokenExpired`
- **THEN** localStorage 中的 `token` 与 `user` 被移除，`stockPortfolioData` 不被清除

#### Scenario: 过期后 UI 登录态同步

- **WHEN** `handleTokenExpired` 被调用
- **THEN** React 状态 `isLoggedIn` 设为 `false`，`currentUser` 设为 `null`，顶栏用户入口显示未登录态（「登录」按钮）

#### Scenario: 过期后弹出会话提示

- **WHEN** `handleTokenExpired` 被调用
- **THEN** 弹出 AlertDialog，标题为「会话已过期」，描述为「您的登录已过期，请重新登录。」

## ADDED Requirements

### Requirement: 受保护 API 401 统一处理

所有携带 `Authorization` 头访问 `stock-backend` 的前端 IO 路径（`fetchJsonData`、`refreshPrices`、`saveDataToBackend`、`useCalendarData` 的 fetch 方法、`DailyTrendChart` 的 raw fetch）SHALL 在收到 HTTP 401 时调用 `handleTokenExpired`，MUST NOT 仅显示通用「数据加载失败」或「获取数据失败」错误而保持已登录态。

#### Scenario: 刷新价格时 token 过期

- **WHEN** `refreshPrices` 收到 401 响应
- **THEN** 调用 `handleTokenExpired`，不弹出「自动刷新失败」替代会话过期提示

#### Scenario: 自动保存时 token 过期

- **WHEN** `saveDataToBackend` 收到 401 响应
- **THEN** 调用 `handleTokenExpired`，不弹出「自动保存失败」替代会话过期提示

#### Scenario: 日历数据请求时 token 过期

- **WHEN** `useCalendarData.fetchCalendarData` 收到 401 响应
- **THEN** 调用传入的 `onUnauthorized` 回调（即 `handleTokenExpired`），不设置 `error` 为「获取数据失败」

### Requirement: 初始化流程过期中止

页面首次加载时，若 `fetchJsonData` 因 token 过期触发 `handleTokenExpired` 并清除了 localStorage token，后续初始化步骤（`refreshPrices`）SHALL NOT 继续执行。

#### Scenario: 过期 token 打开页面

- **WHEN** localStorage 存在过期 token，页面加载触发 `useTrackerEffects` 初始化
- **THEN** `fetchJsonData` 触发 `handleTokenExpired` 后，`refreshPrices` 不被调用，UI 显示未登录态

### Requirement: 过期登出不加载旧本地缓存

当 `isLoggedIn` 从 `true` 变为 `false` 且原因是从已登录态被 `handleTokenExpired` 强制登出时，前端 SHALL NOT 从 `stockPortfolioData` 加载旧本地缓存覆盖 `handleTokenExpired` 已重置的 `yearData`。

#### Scenario: 过期登出后不恢复本地缓存

- **WHEN** 用户曾登录，token 过期触发 `handleTokenExpired`（`isLoggedIn` true→false）
- **THEN** `yearData` 保持 `handleTokenExpired` 设置的 `stockInitialData`，不加载 localStorage 中的 `stockPortfolioData`