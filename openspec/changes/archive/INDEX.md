# 归档变更索引

| 日期 | 变更 | 动因 | 新增能力 |
|------|------|------|----------|
| 2026-05-08 | [refactor-hooks-structure](./2026-05-08-refactor-hooks-structure/) | usePortfolioData（611行）和 useStockOperations（438行）职责混杂难读，拆分为单职责子 hook，聚合 hook 保持 API 兼容 | hooks-structure |
| 2026-05-08 | [cleanup-legacy-tests](./2026-05-08-cleanup-legacy-tests/) | 删除 1870 行过时的组件级集成测试和根目录调试脚本，用 lib+hooks 双层测试网取代 | portfolio-codebase-hygiene |
| 2026-05-08 | [test-hooks](./2026-05-08-test-hooks/) | 给 10 个 hook 补 renderHook 测试，启用 hooks 覆盖率阈值 | — |
| 2026-05-08 | [refactor-hooks-to-use-pure-logic](./2026-05-08-refactor-hooks-to-use-pure-logic/) | hooks 内部实现改调 lib 纯函数，删除 updateStockInternal 重复代码 | — |
| 2026-05-08 | [test-portfolio-pure-logic](./2026-05-08-test-portfolio-pure-logic/) | 给 src/lib/portfolio/ 7 个模块补 100% 覆盖单元测试 | portfolio-test-coverage |
| 2026-05-08 | [extract-portfolio-pure-logic](./2026-05-08-extract-portfolio-pure-logic/) | 从 hooks 中抽出 ~15 个纯计算到 src/lib/portfolio/ | portfolio-codebase-layout |
| 2026-05-08 | [add-portfolio-test-foundation](./2026-05-08-add-portfolio-test-foundation/) | 建立测试基础框架，规划分层测试路线 | portfolio-domain |
