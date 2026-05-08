# portfolio-test-coverage Specification

## Purpose
TBD - created by archiving change test-portfolio-pure-logic. Update Purpose after archive.
## Requirements
### Requirement: Spec Scenario 与测试用例的强制对应

`openspec/specs/portfolio-domain/spec.md` 中的每一条 `#### Scenario:` SHALL 在 `src/lib/portfolio/__tests__/` 下有至少一个对应的 `it` 用例。该对应关系 SHALL 通过用例标题中包含 scenario 名称的方式建立可追溯性（例如 `it('首次买入时成本价等于交易价', ...)` 对应 spec 中 `#### Scenario: 首次买入`）。

#### Scenario: spec 新增 scenario 后未补测试

- **WHEN** 后续提案在 `portfolio-domain/spec.md` 添加新的 `#### Scenario:` 但未在 lib 测试中加对应用例
- **THEN** 该提案的 PR review SHALL 拒绝合入

#### Scenario: 测试用例命名包含 scenario 名

- **WHEN** 阅读 `cost-basis.test.ts`
- **THEN** 每个 `it` 标题与 spec 中 scenario 标题语义一致，可通过文本搜索快速定位

---

### Requirement: 纯函数库覆盖率阈值

`src/lib/portfolio/**` 路径 SHALL 在 `jest.config.js` 的 `coverageThreshold` 中配置 line/branch/function/statement 均为 100%。`npm run test:coverage` 在该路径覆盖率不足时 MUST 退出码非零。

#### Scenario: 新增未覆盖代码

- **WHEN** 后续提案向 `src/lib/portfolio/` 添加新代码但未补测试
- **THEN** `npm run test:coverage` 失败，CI 阻止合入

#### Scenario: 删除函数后阈值仍满足

- **WHEN** 后续提案合理删除 lib 中已不再使用的导出函数（同步删测试）
- **THEN** 覆盖率仍为 100%，不会因为分母变小而误报

---

### Requirement: 浮点数断言风格

所有涉及金额、价格、百分比的断言 MUST 使用 `toBeCloseTo(expected, 2)` 或更高精度，MUST NOT 使用 `toBe` 比较浮点数。

#### Scenario: 用 toBe 比较浮点数（违规）

- **WHEN** 测试中写 `expect(result).toBe(43.33)`
- **THEN** code review SHALL 要求改为 `toBeCloseTo(43.33, 2)`

---

### Requirement: 测试不引入 mock

`src/lib/portfolio/__tests__/**` MUST NOT 使用 `jest.mock` / `jest.fn` 等 mock 机制。如果某个测试需要 mock 才能写，说明被测函数不是纯函数，需要回到提案 1 的 spec 修订其抽取边界。

#### Scenario: 测试中出现 jest.mock

- **WHEN** lib 测试文件包含 `jest.mock(...)` 调用
- **THEN** code review SHALL 要求重新审视被测函数是否纯函数

### Requirement: hooks 层测试存在性

`src/hooks/` 下的每个 hook 文件 SHALL 在 `src/hooks/__tests__/` 下有一个同名 `.test.ts` 或 `.test.tsx` 文件。删除 hook 文件时 MUST 同步删除测试，新增 hook 时 MUST 同步新增测试。

#### Scenario: 新增 hook 未附测试

- **WHEN** 后续提案新增 `src/hooks/useFoo.ts` 但未添加 `src/hooks/__tests__/useFoo.test.ts`
- **THEN** CI 或 review 阶段 SHALL 提醒/阻止

#### Scenario: 每个 hook 至少有一个 happy path 用例

- **WHEN** 打开任意 hook 的测试文件
- **THEN** 至少存在一个不 mock 失败路径、验证正常行为的 `it` 用例

---

### Requirement: hooks 层覆盖率阈值

`src/hooks/**` 路径 SHALL 在 `jest.config.js` 的 `coverageThreshold` 中配置：line ≥ 80%、branch ≥ 70%、function ≥ 80%、statement ≥ 80%。

#### Scenario: hook 覆盖率低于阈值

- **WHEN** `npm run test:coverage` 报告 hooks 层 line 覆盖率 75%
- **THEN** 退出码非零，CI 阻止合入

---

### Requirement: hooks 测试 mock 边界

hook 测试 MUST 仅 mock IO 边界（`fetch` / `localStorage` / `Date` / `alert`），MUST NOT mock `src/lib/portfolio/` 的任何函数——lib 已在提案 2 被充分测试，hook 测试要验证"hook 正确调用了 lib"。

#### Scenario: 测试中 mock 了 lib 函数

- **WHEN** hook 测试文件出现 `jest.mock('@/lib/portfolio/cost-basis')`
- **THEN** code review SHALL 要求移除该 mock

#### Scenario: 测试中仅 mock fetch

- **WHEN** `usePortfolioData.test.ts` 仅通过 `global.fetch = jest.fn().mockResolvedValueOnce(...)` 控制 IO
- **THEN** 视为合规

