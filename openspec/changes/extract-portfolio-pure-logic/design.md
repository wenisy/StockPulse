## Context

`add-portfolio-test-foundation` 提案 0 已完成所有方向决策。本提案是 5 个执行子提案的第一个，纯粹做"代码搬运 + 结构落地"，不改业务行为，不写测试。

## Goals / Non-Goals

**Goals:**
- 让 `src/lib/portfolio/` 下的每个纯函数都是"零依赖、可独立调用"的状态
- 7 个模块文件按业务概念切分（不按现有 hook 切分），自然完成 `updateStockInternal` vs `updateStock` 的去重
- ESLint 在 import 层面强制 lib 不可依赖 React，防止未来回退
- jest config 把 lib 加入覆盖率收集（但本提案不启用阈值）

**Non-Goals:**
- 不写任何单测（提案 2 做）
- 不修改 hook 内部使用方（提案 3 做）
- 不删除 hook 内部的"重复实现"，让它们暂时与 lib 函数共存
- 不修改 components / types

## Decisions

### 决策：函数签名以"输入纯数据 + 返回纯数据"为准

抽出的函数 SHALL 接收纯数据（不接收 setState、不接收 alert 回调），返回新的不可变结构。例如：

```ts
// 反面（原 hook 内部）
setYearData(prev => { /* mutates prev */ });

// 正面（抽出后）
function applyCashTransactionToYear(
  yearData: { [year: string]: YearData },
  year: string,
  amount: number,
  type: 'deposit' | 'withdraw',
  userUuid?: string
): { [year: string]: YearData } { /* returns new object */ }
```

这样 hook 调用变成 `setYearData(prev => applyCashTransactionToYear(prev, year, amount, type))`。

### 决策：不引入 immer 等不可变库

手写浅拷贝即可（`{ ...prev, [year]: { ...prev[year], stocks: [...] } }`）。理由：体积小、对当前数据结构够用、不引入新依赖。

### 决策：保留 hook 内的旧实现（共存策略）

提案 1 期间 hook 不改动，意味着 lib 函数和 hook 内部实现"同时存在"。这是有意为之的"安全过渡"，提案 3 才完成切换。

## Risks / Trade-offs

- **风险：抽出过程中行为不等价** → 缓解：每个函数提取时，先把它当前的内嵌实现按"等价改写"原则搬过去；提案 1 的 PR 描述要逐个函数列出"原位置 → 新位置"的对照表。在没有单测的情况下，依赖代码 review 和现有集成测试做兜底。
- **风险：ESLint 规则配置错误导致 build 失败** → 缓解：ESLint 规则 `no-restricted-imports` 只针对 `src/lib/**` 路径，规则上线后立即跑 `npm run lint` 验证。

## Open Questions

1. 抽出函数时是否把 TypeScript 严格度（strict null checks 等）也对齐？建议保持与项目一致，不在本提案里改 tsconfig。
2. `src/lib/utils.ts`（仅 `cn` 函数）是否要移到 `src/lib/portfolio/` 之外的位置？建议不动，它与领域无关。
