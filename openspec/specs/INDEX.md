# Specs 索引

| Spec | 用途 | 需求数 |
|------|------|--------|
| [portfolio-domain](./portfolio-domain/spec.md) | 投资组合领域核心计算与状态变换规则：持仓成本、现金交易、货币换算、组合价值、年度增长、新建年份结转、跨年删除、行编辑合并、价格刷新接口契约、localStorage 持久化约定、前后端职责分工与去重契约 | 19 |
| [portfolio-codebase-layout](./portfolio-codebase-layout/spec.md) | src/lib/portfolio/ 纯函数库目录结构契约、lib 层依赖方向约束（禁止依赖 React/Next/hooks/components）、与 hook 实现共存的过渡策略 | 3 |
