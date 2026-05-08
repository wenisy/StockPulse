## Context

`UserProfileManager` 作为应用级用户管理入口，由 `StockPortfolioTracker` 通过 `ref` 控制。它有 14 个 useState，分属 4 类：

- 对话框开关（3 个）
- 表单字段（7 个：username/password/nickname/email/oldPassword/newPassword/confirmPassword）
- 错误消息（3 个）
- 登录聚焦 ref（辅助）

4 个 async handler 各自独立触发 fetch + localStorage + 状态更新。

测试安全网已就位：`src/components/__tests__/UserProfileManager.test.tsx` 9 个集成测试覆盖 ref API、登录流程、异常容错。

## Goals / Non-Goals

**Goals:**
- 拆出 3 个对话框组件 + 2 个 hook
- 主组件 ≤ 250 行，只保留 forwardRef 编排
- 现有 9 个测试零修改继续通过
- 组件 props / ref API 完全不变

**Non-Goals:**
- 不修改业务行为
- 不重构 RetirementCalculator（它是 ProfileEditDialog 的子组件）
- 不引入全局状态库

## Decisions

### 决策 1：useAuthDialogs —— 弹窗 + 表单状态聚合

将 14 个 useState 拆到一个 hook，按语义分组：

```ts
{
  login: { isOpen, setIsOpen, username, setUsername, password, setPassword, error, setError },
  register: { isOpen, setIsOpen, username, setUsername, password, setPassword, nickname, setNickname, email, setEmail, error, setError },
  profile: { isOpen, setIsOpen, nickname, setNickname, email, setEmail, oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, error, setError },
  openLoginDialog(), openRegisterDialog(), openProfileDialog(),
  resetLogin(), resetRegister(), resetProfile(),
}
```

每个对话框组件通过 props 接收自己那一段 state，不关心其他对话框。

### 决策 2：useUserAuthApi —— 3 个 fetch

封装 `login` / `register` / `updateProfile` 三个 POST 请求。返回 `{ success: boolean; data?; message?; }` 结构，由调用方决定 UI 反馈。

**不封装 logout**：logout 不需要 fetch，只是 localStorage 清理 + 弹确认框，留在主组件里更直观。

### 决策 3：forwardRef API 转发

主组件内：

```ts
const dialogs = useAuthDialogs();
const handleLogout = /* inline，含弹框 */;

useImperativeHandle(ref, () => ({
  openLoginDialog: dialogs.openLoginDialog,
  openRegisterDialog: dialogs.openRegisterDialog,
  openProfileDialog: () => openProfileDialogWithUserData(),
  logout: handleLogout,
}));
```

保证 ref API 签名完全兼容。

### 决策 4：对话框组件的 props 形态

每个 Dialog 接收：

- `isOpen` / `onOpenChange`
- 状态字段 + setter（来自 useAuthDialogs 的对应段）
- `onSubmit: () => Promise<void>`（来自主组件，调 useUserAuthApi）
- `error: string`

这样对话框完全 presentational，方便将来换 UI 库。

## Risks / Trade-offs

- **风险：useImperativeHandle 依赖链复杂**——hook 里的 methods 是否稳定引用？→ 用 `useCallback` 包装 open/close 方法。
- **风险：拆分后对话框触发 setAlertInfo 的回调链可能丢失**——`logout` 的 confirm 回调 + `login` 成功后的 alert——→ 保留这些副作用在主组件/hook 层，不下沉到 Dialog。
- **权衡：7 个表单字段分 3 组 useState，有字段重复（username 在 login 和 register 中各自独立）**——接受，保持现有行为，避免跨弹窗共享字段产生意外数据泄漏。

## Migration Plan

1. 建 `src/components/user/` 目录
2. 写 `useUserAuthApi`（最独立）
3. 写 `useAuthDialogs`
4. 写 3 个 Dialog 子组件
5. 改写 `UserProfileManager.tsx`
6. 跑测试确认 9/9 全绿
7. review-pipeline
8. merge + archive

## Open Questions

无。现有测试网已经覆盖 ref API 四个方法和登录成功/失败两条主路径，足够在重构期守住底线。
