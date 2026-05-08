## 1. 准备

- [x] 1.1 在 feat/refactor-user-profile-manager 分支工作
- [x] 1.2 新建 `src/components/user/hooks/` 目录
- [x] 1.3 跑基线：`npx jest UserProfileManager` 应 9/9 绿

## 2. 抽出 useUserAuthApi

- [x] 2.1 创建 `src/components/user/hooks/useUserAuthApi.ts`
- [x] 2.2 实现 `login(credentials) → { success, user?, token?, message? }`
- [x] 2.3 实现 `register(data) → { success, message? }`
- [x] 2.4 实现 `updateProfile(token, data) → { success, user?, message? }`
- [x] 2.5 统一 fetch 错误处理

## 3. 抽出 useAuthDialogs

- [x] 3.1 创建 `src/components/user/hooks/useAuthDialogs.ts`
- [x] 3.2 聚合 3 个对话框开关 + 各自表单 state + 错误消息
- [x] 3.3 暴露 openLoginDialog / openRegisterDialog / openProfileDialog（useCallback）
- [x] 3.4 暴露 resetLogin / resetRegister / resetProfile

## 4. 拆出 LoginDialog

- [x] 4.1 创建 `src/components/user/LoginDialog.tsx`
- [x] 4.2 接收 props（isOpen/onOpenChange/username/password/error/onSubmit/onOpenRegister）
- [x] 4.3 保留原登录弹窗 UI + 首次打开自动聚焦
- [x] 4.4 文件 ≤ 150 行

## 5. 拆出 RegisterDialog

- [x] 5.1 创建 `src/components/user/RegisterDialog.tsx`
- [x] 5.2 接收注册相关字段 + onSubmit
- [x] 5.3 文件 ≤ 150 行

## 6. 拆出 ProfileEditDialog

- [x] 6.1 创建 `src/components/user/ProfileEditDialog.tsx`
- [x] 6.2 保留 RetirementCalculator 嵌入点
- [x] 6.3 接收资料编辑相关字段 + 密码修改字段 + onSubmit
- [x] 6.4 文件 ≤ 200 行（含 RetirementCalculator 插槽）

## 7. 改写 UserProfileManager

- [x] 7.1 主文件改为编排层：调 useAuthDialogs + useUserAuthApi + 3 个 Dialog
- [x] 7.2 保留 forwardRef + useImperativeHandle 的 4 个方法
- [x] 7.3 保留 handleLogout 内联（含 setAlertInfo 确认弹框）
- [x] 7.4 保留登录成功后的 onDataFetch / onRefreshPrices 流程
- [x] 7.5 文件 ≤ 250 行

## 8. 校验

- [x] 8.1 `npx jest UserProfileManager` 9/9 全绿
- [x] 8.2 `npm test` 所有 289+ 用例全绿
- [x] 8.3 `npm run lint` 0 errors
- [x] 8.4 `npm run build` 通过
- [x] 8.5 确认所有文件 ≤ 各自上限

## 9. review-pipeline + 归档

- [x] 9.1 commit
- [x] 9.2 触发 verifier + reviewer
- [x] 9.3 修复任何 CRITICAL
- [x] 9.4 merge + push
- [x] 9.5 openspec archive
