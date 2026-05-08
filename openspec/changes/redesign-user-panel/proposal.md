## Why

`UserProfileManager` 的 3 个 Dialog（Login / Register / ProfileEdit）视觉需要与新设计系统对齐。对外命令式 API 不变。

## What Changes

- 重构 `src/components/user/LoginDialog.tsx`、`RegisterDialog.tsx`、`ProfileEditDialog.tsx` 的视觉：
  - 改用新 tokens（`bg-bg-elevated`、`border-border-subtle`、`text-fg-muted`）
  - 对话框圆角改为 `rounded-xl`，标题用 `PageHeader`
  - 输入框统一 `h-10 rounded-md`，焦点环 `--color-accent`
  - 错误态用 `text-danger` + 图标
- TopNav 的用户入口改为头像 + 下拉菜单（未登录显示"登录"按钮）
- `UserProfileManager` 的 ref API（`openLoginDialog` / `openRegisterDialog` / `openProfileDialog`）**签名不变**

## Capabilities

### New Capabilities
- （无 - 只是视觉改版）

### Modified Capabilities
- `component-structure`：补充"对话框视觉必须使用 design tokens"约束

## Impact

- 修改 `src/components/user/*Dialog.tsx`
- 不改 hooks / ref API / props 签名
