## Why

`UserProfileManager.tsx` 649 行，14 个 useState，职责包括：

- 登录对话框（表单 + fetch POST /api/login + 错误处理）
- 注册对话框（表单 + fetch POST /api/register + 错误处理）
- 个人资料对话框（表单 + 修改昵称/邮箱/密码 + fetch POST /api/updateProfile）
- 登出流程（含确认弹窗 + localStorage 清理）
- forwardRef 向父组件暴露 4 个命令式 API

一个文件扛了 4 个独立业务流程，违反单一职责。测试网已在 `refactor-large-components` 提案建好（9 个集成测试），现在是拆分的最佳时机。

## What Changes

按业务流程拆为 6 个文件，主组件仅保留 forwardRef API 和弹窗编排：

```
src/components/user/
├── LoginDialog.tsx              登录对话框（UI + submit handler）
├── RegisterDialog.tsx           注册对话框
├── ProfileEditDialog.tsx        资料编辑对话框（包含密码修改）
└── hooks/
    ├── useAuthDialogs.ts        三个弹窗 open/close 状态聚合
    └── useUserAuthApi.ts        登录/注册/改资料 fetch 封装
```

主文件 `src/components/UserProfileManager.tsx` 保留 forwardRef，内部组合子组件 + 2 个 hook，≤ 250 行。

**明确范围**：
- 不改组件对外 props / forwardRef API
- 不改任何业务行为（用户感知一致）
- 不引入新依赖

## Capabilities

### Modified Capabilities

- `component-structure`: 增加"forwardRef 命令式 API 的拆分标准写法"——主组件通过 `useImperativeHandle` 转发 hook 暴露的方法

## Impact

- 新增：`src/components/user/` 目录 + 3 个对话框 + 2 个 hook 共 5 个文件
- 修改：`src/components/UserProfileManager.tsx` 改为编排层
- 不改：`StockPortfolioTracker.tsx` 调用方代码
- 测试：现有 9 个集成测试不变，全部继续通过
