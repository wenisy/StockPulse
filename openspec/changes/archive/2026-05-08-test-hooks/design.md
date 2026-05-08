## Context

提案 3 完成后 hook 变薄，但"薄"不等于"零代码"——hook 仍包含：
- useState 的初值与持久化加载
- 事件处理器对 alert 弹窗的异步编排
- fetch 的成功/失败处理分支
- hook 间的 props 传递

这些都是单元测试应该覆盖的部分。本提案用 renderHook 完成。

## Goals / Non-Goals

**Goals:**
- 10 个 hook 各至少一个测试文件
- 覆盖每个 hook 对外 API（导出方法）的 happy path + 至少一条失败路径
- hook 层覆盖率达到 line 80% / branch 70%
- mock 粒度：仅 mock IO 边界（fetch / localStorage / 当前时间），不 mock 业务函数

**Non-Goals:**
- 不测 lib 函数（已在提案 2 测过，不重复）
- 不测 UI 交互（那是 component 测试范畴）
- 不追求 100% 覆盖率（IO 重试、网络错误等路径允许不覆盖）

## Decisions

### 决策：使用 `@testing-library/react` 的 `renderHook`

已存在于 devDependencies。不引入 `@testing-library/react-hooks`（已废弃，RTL 16+ 自带）。

### 决策：mock fetch 的方式

统一用 `global.fetch = jest.fn()`，每个测试前 `jest.clearAllMocks()` + `mockResolvedValueOnce` 定制返回。

### 决策：localStorage mock 放 jest.setup.js 全局 mock 还是测试文件内

建议放测试文件内（每个测试独立 store），避免测试间污染。全局保留 `window.matchMedia` / `ResizeObserver` 等浏览器 API mock。

### 决策：不测"价格刷新"的完整链路

`refreshPrices` 内部调 fetch → 更新 state → 可能弹 alert，全链路测试 mock 成本高。本提案只测：
- 当年无股票时的短路行为
- 成功响应时 `priceData` 的更新
- 失败响应时的 alert 调用参数

不测手动/自动两种 isManual 分支的所有组合。

## Risks / Trade-offs

- **风险：renderHook 内 async setState 需要 `act` 包裹，容易漏导致警告** → 缓解：在 jest.setup.js 开启 React 18 act 警告为错误模式，强制开发者正确处理。
- **风险：hook 间依赖（如 useStockOperations 依赖 usePortfolioData 的 setter）导致测试需要复杂 mock** → 缓解：测试中直接用 `jest.fn()` 替代 setter，断言调用参数而非状态后果（状态后果已由 lib 测试保证）。
- **权衡：80% 阈值 vs 100% 阈值** → 选 80% 是为了给"网络错误/token 过期回退等长尾路径"留逃生空间，避免为覆盖率写低价值用例。

## Open Questions

1. `useUserManagement` / `useUserSettings` 这类偏 CRUD 的 hook 是否单独归类？建议照样按 hook 切测试文件，不单独归类。
2. 是否为 hook 测试建立 fixture 文件（`__tests__/fixtures/portfolio.ts`）？建议按需再说，初期各测试文件内部组装数据即可。
