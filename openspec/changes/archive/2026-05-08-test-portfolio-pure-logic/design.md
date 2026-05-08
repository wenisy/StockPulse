## Context

提案 1 已经把纯函数抽出来了，但它们目前是"裸体"的——任何人都可以静默改动行为而不被发现。本提案的目的是把 `portfolio-domain` spec 写下的 18 条 Requirement、40+ 条 scenario 全部固化为可执行的 jest 用例。

## Goals / Non-Goals

**Goals:**
- spec 的每条 scenario MUST 有至少 1 个对应 `it` 用例
- 每个 lib 函数额外覆盖 happy path / 边界 / 异常三类用例
- `src/lib/portfolio/**` 达到 100% line + 100% branch 覆盖率
- 启用 jest `coverageThreshold` 在 CI 自动卡阈值

**Non-Goals:**
- 不写 hook 层测试（提案 4）
- 不写 component 测试
- 不修改 lib 源代码（除非测试过程中发现行为与 spec 不符——此时优先修代码）

## Decisions

### 决策：测试文件与源文件 1:1 对应

`src/lib/portfolio/cost-basis.ts` ↔ `src/lib/portfolio/__tests__/cost-basis.test.ts`，不跨文件混测。

### 决策：用 `describe` 按"业务场景"分组而非按"函数"分组

```
describe('加权成本价（买入）', () => {
  it('首次买入时成本价等于交易价', ...)
  it('加仓时按总成本除以总股数计算', ...)
  it('零股加仓不应除零', ...)
})
```

这样 spec → describe → it 形成清晰的可追溯链。

### 决策：浮点比较一律用 `toBeCloseTo(expected, 2)`

不使用 `toBe` 防止 IEEE 754 误差导致 flaky。

### 决策：覆盖率阈值的启用范围

```js
coverageThreshold: {
  './src/lib/portfolio/': {
    lines: 100,
    branches: 100,
    functions: 100,
    statements: 100
  }
}
```

不影响其他目录（hooks 阈值在提案 4 启用）。

### 决策：不引入 mock 库

纯函数无副作用，根本不需要 mock。如果某个函数"看起来需要 mock"，说明它不够纯——需要回头看是不是抽错了。

## Risks / Trade-offs

- **风险：100% branch 覆盖可能产生"凑覆盖率"的无意义用例** → 缓解：每个用例必须有清晰的业务语义，code review 拒绝"为覆盖而覆盖"。
- **风险：测试发现 lib 实际行为与 spec 不符** → 处理：优先修代码使其符合 spec；若 spec 本身错误，先在本提案内修订 spec（作为 MODIFIED Requirements），但要在 PR 中明确标注。

## Open Questions

1. 是否需要 snapshot 测试？建议不用——纯函数返回值用断言更明确。
2. 覆盖率报告是否上传 CI？建议本提案先不接 codecov 等服务，等团队需要时再说。
