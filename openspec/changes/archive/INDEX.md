# 归档变更索引

| 日期 | 变更 | 动因 | 新增能力 |
|------|------|------|----------|
| 2026-05-08 | [cleanup-legacy-tests](./2026-05-08-cleanup-legacy-tests/) | 删除 1870 行过时的组件级集成测试和根目录调试脚本，用 lib+hooks 双层测试网取代，让测试全绿、运行时间缩短 77% | portfolio-codebase-hygiene |
| 2026-05-08 | [test-hooks](./2026-05-08-test-hooks/) | 给 10 个 hook 补 renderHook 测试，启用 hooks 覆盖率阈值（line/stmt 79%, branch 55%, func 75%），构建 hook 层测试网 | — |
| 2026-05-08 | [refactor-hooks-to-use-pure-logic](./2026-05-08-refactor-hooks-to-use-pure-logic/) | hooks 内部实现改调 lib 纯函数，删除 updateStockInternal 重复代码，让 hook 变成"薄壳"以便后续进一步重构 | — |
| 2026-05-08 | [test-portfolio-pure-logic](./2026-05-08-test-portfolio-pure-logic/) | 给 src/lib/portfolio/ 7 个模块补 100% 覆盖单元测试，启用 jest coverageThreshold，把 spec scenario 翻译成可执行的 jest 用例，构建重构防回归主防线 | portfolio-test-coverage |
| 2026-05-08 | [extract-portfolio-pure-logic](./2026-05-08-extract-portfolio-pure-logic/) | 把投资组合领域的 ~15 个纯计算从 hooks 中机械抽出到 src/lib/portfolio/，行为不变，作为后续 hook 重构的安全基石 | portfolio-codebase-layout |
| 2026-05-08 | [add-portfolio-test-foundation](./2026-05-08-add-portfolio-test-foundation/) | 为即将到来的 hooks 重构建立可靠的单元测试防线——现有 hooks 把纯逻辑/副作用/IO 揉在一起且零测试，直接动手风险高，需先显式化业务规则、规划分层测试路线 | portfolio-domain |
