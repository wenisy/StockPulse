## Context

Hooks 层覆盖率分化明显。通过补针对性测试收敛到 85%+ line，性价比最高。

## Goals / Non-Goals

**Goals:**
- 7 个低覆盖 hook 补测至 ≥ 85% line
- hooks 整体 statements/lines ≥ 85%
- branches ≥ 68%, functions ≥ 80%
- 提升 jest.config.js 阈值

**Non-Goals:**
- 不追求 100%
- 不写脆弱的 DOM 断言
- 不重构 hook

## Decisions

### 决策 1：优先覆盖 happy path + 主要 error path

每个 hook 补用例原则：
- 每个未覆盖函数至少 1 个 happy path 测试
- 每个 try/catch 覆盖 catch 分支
- 不覆盖 defensive `?? 0` 这种不可达分支

### 决策 2：mock 边界统一

- fetch: `global.fetch = jest.fn()`
- localStorage: 文件级 localStorage mock（已有模式）
- 业务 hook: 不 mock（每个 hook 独立测）

## Risks / Trade-offs

- **风险：追求覆盖率导致脆弱测试** → 缓解：每个新用例必须有清晰业务语义
- **权衡：阈值设 85 vs 90** → 选 85 以留出 branch 短路的裕度

## Migration Plan

按低→高覆盖率顺序补：useStockRowEdit → useStockData → useUserManagement → useUserSettings → useStockForm → usePortfolioSync → usePriceData。每次一跑 `npm run test:coverage`。

## Open Questions

无。
