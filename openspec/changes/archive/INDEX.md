# 归档变更索引

| 日期 | 变更 | 动因 | 新增能力 |
|------|------|------|----------|
| 2026-05-08 | [redesign-holdings-section](./2026-05-08-redesign-holdings-section/) | 新 Holdings 页：现代表格 + 排序 + 抽屉编辑 + 快速添加交易。复用 useStockOperations / useStockRowEdit 全部命令式 API | holdings-section |
| 2026-05-08 | [redesign-overview-section](./2026-05-08-redesign-overview-section/) | 新 Overview 页：4 张 KPI StatCard（AnimatedNumber）+ Recharts 面积走势图 + 4 按钮快捷操作 | overview-section |
| 2026-05-08 | [redesign-ui-foundation](./2026-05-08-redesign-ui-foundation/) | Dashboard 改版第 1 批：设计令牌 + 双主题(FOUC 保护) + AppShell(TopNav/SideNav/BottomTabBar) + 5 section 路由骨架 + legacy ?legacy=1 懒加载回退。风格对齐 Linear/Vercel/Raycast | design-system, app-shell, component-structure |
| 2026-05-08 | [fill-coverage-gaps](./2026-05-08-fill-coverage-gaps/) | 7 个 hook 覆盖率全面提升（hooks 层 80% → 89%），阈值从 lines 79/branches 55 收紧到 85/68，新增 53 个用例，不改源代码 | — |
| 2026-05-08 | [refactor-portfolio-tracker](./2026-05-08-refactor-portfolio-tracker/) | StockPortfolioTracker（553行）拆为 5 个文件（主组件 297 行 + AlertDialog + 3 个 tracker hook），主组件不再持有 useState | — |
| 2026-05-08 | [refactor-user-profile-manager](./2026-05-08-refactor-user-profile-manager/) | UserProfileManager（649行）拆成 7 个文件（主组件 221 行 + 3 个 Dialog + 3 个 hook），forwardRef API 兼容 | — |
| 2026-05-08 | [refactor-large-components](./2026-05-08-refactor-large-components/) | 仓库扫描发现 5 个 >300 行文件，3 个组件零测试。先补 25 个集成测试做安全网，再拆 ProfitLossCalendar 872→273 行（其余两组件留后续提案）；reviewer 抓出 stale closure / useEffect deps 2 个 CRITICAL 已修 | component-structure |
| 2026-05-08 | [refactor-hooks-structure](./2026-05-08-refactor-hooks-structure/) | usePortfolioData（611行）和 useStockOperations（438行）职责混杂难读，拆分为单职责子 hook，聚合 hook 保持 API 兼容 | hooks-structure |
| 2026-05-08 | [cleanup-legacy-tests](./2026-05-08-cleanup-legacy-tests/) | 删除 1870 行过时的组件级集成测试和根目录调试脚本，用 lib+hooks 双层测试网取代 | portfolio-codebase-hygiene |
| 2026-05-08 | [test-hooks](./2026-05-08-test-hooks/) | 给 10 个 hook 补 renderHook 测试，启用 hooks 覆盖率阈值 | — |
| 2026-05-08 | [refactor-hooks-to-use-pure-logic](./2026-05-08-refactor-hooks-to-use-pure-logic/) | hooks 内部实现改调 lib 纯函数，删除 updateStockInternal 重复代码 | — |
| 2026-05-08 | [test-portfolio-pure-logic](./2026-05-08-test-portfolio-pure-logic/) | 给 src/lib/portfolio/ 7 个模块补 100% 覆盖单元测试 | portfolio-test-coverage |
| 2026-05-08 | [extract-portfolio-pure-logic](./2026-05-08-extract-portfolio-pure-logic/) | 从 hooks 中抽出 ~15 个纯计算到 src/lib/portfolio/ | portfolio-codebase-layout |
| 2026-05-08 | [add-portfolio-test-foundation](./2026-05-08-add-portfolio-test-foundation/) | 建立测试基础框架，规划分层测试路线 | portfolio-domain |
