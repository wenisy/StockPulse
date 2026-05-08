# Specs 索引

| Spec | 用途 | 需求数 |
|------|------|--------|
| [portfolio-domain](./portfolio-domain/spec.md) | 投资组合领域核心计算与状态变换规则：持仓成本、现金交易、货币换算、组合价值、年度增长、新建年份结转、跨年删除、行编辑合并、价格刷新接口契约、localStorage 持久化约定、前后端职责分工与去重契约 | 19 |
| [portfolio-codebase-layout](./portfolio-codebase-layout/spec.md) | src/lib/portfolio/ 纯函数库目录结构契约、lib 层依赖方向约束、hooks 必须通过 lib 完成领域计算、聚合 hook 模式约定 | 6 |
| [portfolio-test-coverage](./portfolio-test-coverage/spec.md) | spec scenario 与 jest 测试用例的强制对应、纯函数库 100% 覆盖率阈值、hook 层覆盖率阈值、浮点数断言风格、测试不引入 mock 的约束、hook 测试 mock 边界 | 7 |
| [portfolio-codebase-hygiene](./portfolio-codebase-hygiene/spec.md) | 禁止 StockPortfolioTracker 级别的业务规则集成测试、禁止根目录放置调试探针脚本、清理旧测试的前置条件 | 3 |
| [hooks-structure](./hooks-structure/spec.md) | 单职责 hook 边界定义（useYearData/usePortfolioSync/useStockForm/useStockRowEdit）、聚合 hook 向下兼容策略、行数约束、每个子 hook 必须有测试 | 4 |
