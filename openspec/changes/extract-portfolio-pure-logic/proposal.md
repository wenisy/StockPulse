## Why

`add-portfolio-test-foundation` 已经把投资组合领域的业务规则显式化为 spec，并定义了三层架构方向。但当前 hooks 中纯计算逻辑仍埋在 `setYearData` 等副作用回调内，无法独立调用、独立测试。本变更负责"机械搬运"：把这些纯逻辑提取到 `src/lib/portfolio/`，**完全不改变行为**。

## What Changes

- 新增目录 `src/lib/portfolio/` 及 7 个模块文件（见 design.md 决策 2 的清单）
- 抽出的纯函数全部为零副作用、零 React 依赖
- 现有 hooks **暂不修改**（提案 3 才改），仍保留它们内部的实现拷贝
- 在 jest 配置中加入 `src/lib/portfolio/` 的覆盖率收集路径（仍不强制阈值）
- 新增 ESLint 规则禁止 `src/lib/**` 引入 react / next（design.md Open Question 2 的落地）

## Capabilities

### New Capabilities

- `portfolio-codebase-layout`: 定义 `src/lib/portfolio/` 目录下必须存在的模块、各模块必须导出的函数签名、依赖方向约束。这是一份"代码结构契约"，让未来重构 hook 时有明确的"哪些函数已经独立可用"清单。

### Modified Capabilities

无。本提案不改变任何业务行为，因此不修改 `portfolio-domain` 的任何 Requirement。

## Impact

- 新增：`src/lib/portfolio/{currency,cost-basis,year-data,duplicate-tx,incremental,portfolio-metrics,years}.ts`
- 修改：`.eslintrc.json` 或 `eslint.config.mjs`（新增 `no-restricted-imports` 规则）
- 修改：`jest.config.js`（添加 `collectCoverageFrom`）
- 不改：`src/hooks/**`、`src/components/**`、`src/types/**`
- 不改：所有 API 契约、localStorage 键名、用户数据格式
