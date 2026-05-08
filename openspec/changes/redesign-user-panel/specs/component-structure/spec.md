## ADDED Requirements

### Requirement: 对话框必须使用 design tokens

`src/components/user/*Dialog.tsx`、`src/components/**/*Drawer.tsx`、`src/components/ui/dialog.tsx` 等所有对话框/抽屉组件 MUST 使用 design tokens 语义 class（`bg-bg-elevated`、`border-border-subtle`、`text-fg` 等），MUST NOT 硬编码颜色、阴影或字面像素边距（`rounded-*`、`p-*` 等 Tailwind 语义类允许）。

#### Scenario: LoginDialog 用原始色

- **WHEN** `LoginDialog.tsx` 写 `className="bg-white dark:bg-gray-900"`
- **THEN** code review 拒绝，要求改为 `bg-bg-elevated`

#### Scenario: 对话框符合规范

- **WHEN** `ProfileEditDialog.tsx` 用 `className="bg-bg-elevated border-border-subtle rounded-xl shadow-lg"`
- **THEN** 视为合规
