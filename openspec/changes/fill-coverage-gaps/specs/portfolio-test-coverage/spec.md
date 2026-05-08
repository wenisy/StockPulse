## ADDED Requirements

### Requirement: hooks 层覆盖率阈值提升

`src/hooks/**` 的 jest coverageThreshold SHALL 收紧至：lines ≥ 85%, branches ≥ 68%, functions ≥ 80%, statements ≥ 85%。

#### Scenario: hooks 覆盖率低于阈值

- **WHEN** `npm run test:coverage` 报告 hooks 层 line 覆盖率低于 85%
- **THEN** CI 退出码非零，阻止合入

#### Scenario: 阈值生效保护重构

- **WHEN** 未来重构删除某 hook 的分支测试但忘记补其他
- **THEN** 阈值会下降到 85% 以下触发失败，提醒维护者补齐
