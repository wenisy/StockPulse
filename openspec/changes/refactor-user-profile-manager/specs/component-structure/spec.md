## ADDED Requirements

### Requirement: forwardRef 命令式 API 拆分标准

使用 `forwardRef + useImperativeHandle` 暴露命令式 API 的组件在拆分时 SHALL 遵守：

- 主组件持有 ref 转发逻辑，不下沉到子组件
- `useImperativeHandle` 暴露的方法可来自任意子 hook（通过组合），但调用签名 MUST 与重构前完全一致
- 子对话框组件 MUST NOT 通过 ref 直接操作 DOM，所有开关通过 props 传入

#### Scenario: 子对话框暴露自己的 ref

- **WHEN** `LoginDialog.tsx` 内部使用 `forwardRef` 暴露 API
- **THEN** code review SHALL 拒绝，因为子对话框应由主组件控制开关

#### Scenario: 主组件正确转发 ref API

- **WHEN** `UserProfileManager.tsx` 中 `useImperativeHandle(ref, () => ({ openLoginDialog: dialogs.openLoginDialog, ... }))`
- **THEN** 视为符合标准

---

### Requirement: 对话框组件 presentational 原则

`src/components/user/*Dialog.tsx` SHALL 是"纯表现"组件：

- MUST NOT 直接调用 fetch / localStorage
- MUST 通过 props 接收 state、setter、onSubmit 回调
- 可以本地管理 focus / scroll 等 UI 细节

#### Scenario: Dialog 内调 fetch

- **WHEN** `LoginDialog.tsx` 中出现 `fetch(...)` 调用
- **THEN** code review SHALL 要求把 IO 移到 `useUserAuthApi` hook

#### Scenario: Dialog 通过 props 接收 onSubmit

- **WHEN** `LoginDialog` 的 props 包含 `onSubmit: (creds) => Promise<void>`
- **THEN** 视为合规
