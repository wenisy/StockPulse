# 归档变更索引

| 日期 | 变更 | 动因 | 新增能力 |
|------|------|------|----------|
| 2026-05-28 | [enhance-daily-trend-chart](./2026-05-28-enhance-daily-trend-chart/) | 折线图缺乏独立月份导航、无涨跌幅展示，只能查看当月数据 | 月份独立导航, Tooltip 涨跌幅 |
| 2026-05-27 | [add-planner-daily-value-chart](./2026-05-27-add-planner-daily-value-chart/) | Planner 页缺乏每日资产总值折线图；后端快照已有 `totalValue`，只需前端补类型 + 新增组件 | daily-trend-chart, profit-loss-calendar |
| 2026-05-11 | [harden-numeric-boundaries](./2026-05-11-harden-numeric-boundaries/) | 已有边界防护（除零/空数组）缺乏断言型测试，重构时可能静默回归 | — |
| 2026-05-11 | [fix-zero-shares-filter](./2026-05-11-fix-zero-shares-filter/) | ReportDialog/GrowthInfo 未同步过滤 shares=0 已清仓股票，年报显示数据不一致 | portfolio-domain（delta） |
| 2026-05-11 | [extend-zero-shares-coverage](./2026-05-11-extend-zero-shares-coverage/) | fix-zero-shares-filter 只修了 5 处，barChartData/LineChartData/StockTable 合计行仍有遗漏 | — |
| 2026-05-11 | [add-section-component-tests](./2026-05-11-add-section-component-tests/) | sections/ 下 13 个核心组件测试覆盖率为 0%，关键交互无回归防护 | component-structure（delta） |
| 2026-05-08 | [test-portfolio-pure-logic](./2026-05-08-test-portfolio-pure-logic/) | lib/portfolio/ 纯函数提取后无任何测试，需建立测试金字塔塔基 | portfolio-test-coverage |
| 2026-05-08 | [test-hooks](./2026-05-08-test-hooks/) | hooks 退化为薄壳后，为 10 个 hook 补 renderHook 测试 | — |
| 2026-05-08 | [refactor-user-profile-manager](./2026-05-08-refactor-user-profile-manager/) | UserProfileManager.tsx 649 行、14 个 useState，职责混杂，超出 300 行上限 | — |
| 2026-05-08 | [refactor-portfolio-tracker](./2026-05-08-refactor-portfolio-tracker/) | StockPortfolioTracker.tsx 553 行，混合渲染/逻辑/状态，超出可维护边界 | component-structure |
| 2026-05-08 | [refactor-large-components](./2026-05-08-refactor-large-components/) | 5 个超 300 行组件中 3 个完全无测试，重构前需先补集成测试 | — |
| 2026-05-08 | [refactor-hooks-to-use-pure-logic](./2026-05-08-refactor-hooks-to-use-pure-logic/) | lib 函数独立可用后，hooks 内部仍是双份实现；切换至 lib 调用、删除冗余 | portfolio-codebase-layout（delta） |
| 2026-05-08 | [refactor-hooks-structure](./2026-05-08-refactor-hooks-structure/) | usePortfolioData/useStockOperations 职责过重，需按单职责拆分 | hooks-structure |
| 2026-05-08 | [redesign-ui-foundation](./2026-05-08-redesign-ui-foundation/) | 单页垂直长列表、视觉语言零散、暗色模式不完整；趁数据层稳定做 UI 改版 | app-shell, design-system |
| 2026-05-08 | [redesign-overview-section](./2026-05-08-redesign-overview-section/) | Overview 是首屏，需重设计为"一眼看懂财务状况"的 dashboard | overview-section |
| 2026-05-08 | [redesign-holdings-section](./2026-05-08-redesign-holdings-section/) | StockTable 视觉老旧，需重设计为现代数据表（排序、行高亮、编辑态） | holdings-section |
| 2026-05-08 | [fill-coverage-gaps](./2026-05-08-fill-coverage-gaps/) | hooks 层覆盖率整体 80% 但单文件差异明显，需补全薄弱点 | portfolio-test-coverage（delta） |
| 2026-05-08 | [extract-portfolio-pure-logic](./2026-05-08-extract-portfolio-pure-logic/) | 纯计算逻辑埋在 hooks 副作用回调中，无法独立调用/测试；机械搬运到 lib/ | — |
| 2026-05-08 | [cleanup-legacy-tests](./2026-05-08-cleanup-legacy-tests/) | 测试防线建立后，1870 行组件集成测试与 2 个调试脚本已无价值，清理技术债 | portfolio-codebase-hygiene |
| 2026-05-08 | [add-portfolio-test-foundation](./2026-05-08-add-portfolio-test-foundation/) | hooks 混合三类职责、存在重复实现，缺乏测试基础导致重构高风险 | portfolio-domain |
