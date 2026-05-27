# 归档变更索引

- [`2026-05-08-add-portfolio-test-foundation`](./2026-05-08-add-portfolio-test-foundation/) — 当前 `src/hooks/` 下的核心 hooks（尤其是 `usePortfolioData.ts` 699 行、`useStockOperations.ts` 488 行）将**纯计算逻辑、React 状态管理副作用、HTTP/localStorage 等 IO** 三类职责揉在一起，且存在跨 hook 的重复实现（`updateStock` 与 `updateStockInternal` 是同一段逻辑的两份拷贝）。这种结构有两个直接后果：
- [`2026-05-08-cleanup-legacy-tests`](./2026-05-08-cleanup-legacy-tests/) — 提案 1–4 完成后，lib 层 100% 覆盖 + hook 层 80% 覆盖已经构成完整测试防线。旧的 1870 行组件级集成测试与根目录两个 `test-*.js` 调试脚本此时已失去价值：
- [`2026-05-08-extract-portfolio-pure-logic`](./2026-05-08-extract-portfolio-pure-logic/) — `add-portfolio-test-foundation` 已经把投资组合领域的业务规则显式化为 spec，并定义了三层架构方向。但当前 hooks 中纯计算逻辑仍埋在 `setYearData` 等副作用回调内，无法独立调用、独立测试。本变更负责"机械搬运"：把这些纯逻辑提取到 `src/lib/portfolio/`，**完全不改变行为**。
- [`2026-05-08-fill-coverage-gaps`](./2026-05-08-fill-coverage-gaps/) — 目前 hooks 层覆盖率整体 80% line，但单文件差异明显：
- [`2026-05-08-redesign-holdings-section`](./2026-05-08-redesign-holdings-section/) — Holdings 是核心视图，当前 `StockTable.tsx` 行内编辑信息密度高但视觉老旧。需要重设计为现代数据表，支持排序、行高亮、精致的编辑态。
- [`2026-05-08-redesign-overview-section`](./2026-05-08-redesign-overview-section/) — `redesign-ui-foundation` 合入后，`OverviewSection` 只是 legacy `InvestmentOverview + PortfolioOverview` 的包装。Overview 是用户第一眼看到的页面，应当给出"一眼看懂当前财务状况"的 dashboard 体验。
- [`2026-05-08-redesign-ui-foundation`](./2026-05-08-redesign-ui-foundation/) — StockPulse 当前是一个单页垂直长列表布局：头部 → 控制面板 → 投资总览 → 组合总览 → 退休计算 → 图表 → 表格 → 日历报表，所有模块堆在同一个滚动视口内。信息无层次、移动端滚动冗长、视觉语言（色彩/间距/圆角/阴影）零散，暗色模式支持不完整。业务逻辑已在前几轮重构中被抽离到 `src/lib/portfolio/` 与 `src/hooks/` 之下、测试覆盖率稳定在 hooks 89% / lib 100%，**这是一次只动 UI 层、不动数据层**的低风险改版时机。
- [`2026-05-08-refactor-hooks-structure`](./2026-05-08-refactor-hooks-structure/) — 当前 `usePortfolioData`（611 行）和 `useStockOperations`（438 行）两个 hook 各自承担了太多职责：前者把"年份/筛选状态管理"、"后端数据同步 IO"、"价格刷新 IO"、"现金交易操作"、"股票操作"、"货币格式化"全部揉在一起；后者把"交易表单状态"和"行编辑状态"以及"股票 CRUD 操作"一并管理。
- [`2026-05-08-refactor-hooks-to-use-pure-logic`](./2026-05-08-refactor-hooks-to-use-pure-logic/) — 提案 1+2 完成后，lib 函数已经独立可用、100% 覆盖。但 hook 内部仍是"双份共存"——既有自己的实现，也可调用 lib。本提案完成切换：让 hook 内部全部改用 lib 函数，删除冗余实现，使 hook 真正退化为"useState + 副作用编排"的薄壳。
- [`2026-05-08-refactor-large-components`](./2026-05-08-refactor-large-components/) — 仓库扫描后发现 5 个超 300 行的源文件，其中 3 个组件**完全没有测试**：
- [`2026-05-08-refactor-portfolio-tracker`](./2026-05-08-refactor-portfolio-tracker/) — `StockPortfolioTracker.tsx` 是应用根组件，553 行，混合：
- [`2026-05-08-refactor-user-profile-manager`](./2026-05-08-refactor-user-profile-manager/) — `UserProfileManager.tsx` 649 行，14 个 useState，职责包括：
- [`2026-05-08-test-hooks`](./2026-05-08-test-hooks/) — 提案 3 完成后，hooks 已经退化为薄壳。本提案给 10 个 hook 各写一个 renderHook 测试，覆盖：
- [`2026-05-08-test-portfolio-pure-logic`](./2026-05-08-test-portfolio-pure-logic/) — 提案 1 完成后，`src/lib/portfolio/` 下所有纯函数已经独立可调用，但**还没有任何测试**。本提案是测试金字塔的"塔基"：把 `portfolio-domain` spec 中的每一条 scenario 翻译成 jest 用例，建立"重构防回归"的主防线。这一层覆盖完整后，提案 3 改造 hook 才有底气。
- [`2026-05-11-add-section-component-tests`](./2026-05-11-add-section-component-tests/) — `src/components/sections/` 下 13 个核心业务组件完全没有测试覆盖（0%）。用户每天使用的关键交互——持仓卡片显示已清仓状态、KPI 数字渲染、添加交易表单流程——一旦回归完全无测试拦截。
- [`2026-05-11-extend-zero-shares-coverage`](./2026-05-11-extend-zero-shares-coverage/) — 之前的 `fix-zero-shares-filter` 只修了 5 个点，但**地毯式扫描**发现还有 3 处展示用的 shares=0 过滤遗漏：barChartData、useCalculations.prepareLineChartData、StockTable 的 tfoot 合计。
- [`2026-05-11-fix-zero-shares-filter`](./2026-05-11-fix-zero-shares-filter/) — 之前修复了持仓列表和折线图中展示 shares=0 空壳股票的问题，但 ReportDialog（投资年报弹窗）和 GrowthInfo 组件未做同步过滤，导致用户在打开 2026 年报告时仍能看到 Amazon 等已清仓（shares=0）的股票出现在饼图、柱图和持仓排名中。数据一致性在所有展示层需要统一。
- [`2026-05-11-harden-numeric-boundaries`](./2026-05-11-harden-numeric-boundaries/) — 代码里很多地方做了数值边界防护（`if (totalInvestment > 0)`、`years.length < 1` 等），但**没有测试断言这些保护持续有效**。一旦未来重构改坏了某处保护，KPI 卡可能直接显示 NaN，整个 Overview 页崩。这次为所有"已存在的边界保护"补**断言型测试**，作为防回归基线。
