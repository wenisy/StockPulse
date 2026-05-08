# portfolio-codebase-hygiene Specification

## Purpose
TBD - created by archiving change cleanup-legacy-tests. Update Purpose after archive.
## Requirements
### Requirement: 禁止 StockPortfolioTracker 级别的业务规则集成测试

代码库 MUST NOT 存在以 `StockPortfolioTracker` 为入口、通过 render 组件间接验证业务计算规则的大型集成测试。业务规则测试 SHALL 位于 `src/lib/portfolio/__tests__/`（纯函数层），hook 行为测试 SHALL 位于 `src/hooks/__tests__/`（编排层）。

#### Scenario: 新增 StockPortfolioTracker.*.test 文件

- **WHEN** 有提案添加 `src/components/__tests__/StockPortfolioTracker.xxx.test.tsx`
- **THEN** code review SHALL 拒绝并要求把测试意图拆到 lib 或 hooks 层

#### Scenario: Combobox.test.tsx 存在（合规）

- **WHEN** 代码库中存在 `src/components/__tests__/Combobox.test.tsx`
- **THEN** 视为合规（UI primitive 独立测试，不违反本约束）

---

### Requirement: 禁止根目录放置调试探针脚本

项目根目录 MUST NOT 存在形如 `test-*.js` / `debug-*.js` 的独立调试探针脚本。所有测试 SHALL 位于 `src/**/__tests__/` 或 `src/**/*.test.{ts,tsx}` 路径下。

#### Scenario: 根目录新增 test-foo.js

- **WHEN** 有人在项目根目录添加 `test-foo.js`
- **THEN** code review SHALL 拒绝合入

#### Scenario: 跨仓库/后端的探针脚本

- **WHEN** 类似探针需求出现但属于后端逻辑
- **THEN** SHALL 放在 `stock-backend` 仓库，前端仓库 MUST NOT 包含

---

### Requirement: 清理删除的前置条件

执行本提案（删除旧测试）之前 MUST 满足：

1. 提案 1 `extract-portfolio-pure-logic` 已归档
2. 提案 2 `test-portfolio-pure-logic` 已归档且覆盖率 100%
3. 提案 3 `refactor-hooks-to-use-pure-logic` 已归档
4. 提案 4 `test-hooks` 已归档且 hooks 覆盖率 ≥ 80%
5. 人工执行过一次完整的手动 E2E 回归（添加/买入/卖出/新建年份/行编辑/删除）

#### Scenario: 前置条件未满足却尝试归档

- **WHEN** `/opsx:archive cleanup-legacy-tests` 时发现提案 2 尚未归档
- **THEN** SHALL 阻止归档并提示缺失的前置条件

