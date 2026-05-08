## ADDED Requirements

### Requirement: 单文件 300 行软约束

`src/**/*.{ts,tsx}`（除 `__tests__/` 外）单文件 SHALL ≤ 300 行。超出时应拆分子组件 / 抽 hook / 提取 lib 纯函数；如确有合理原因（如纯函数本身需要长函数体）SHALL 在 design.md 中说明。

#### Scenario: 新增/修改后某文件超 300 行

- **WHEN** PR 中任何 `*.{ts,tsx}` 源文件（非 __tests__）超过 300 行
- **THEN** code review SHALL 询问是否可拆分；接受 design.md 中明确说明的例外

#### Scenario: 测试文件不受此约束

- **WHEN** `__tests__/*.test.{ts,tsx}` 行数超过 300
- **THEN** 视为合规
