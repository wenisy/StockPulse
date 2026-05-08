## ADDED Requirements

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
