## ADDED Requirements

### Requirement: 聚合 hook 模式

当多个子 hook 共同构成一个更大的业务能力时，SHALL 通过聚合 hook 向外暴露统一接口。聚合 hook MUST NOT 包含任何业务逻辑或状态，只负责组合子 hook 的返回值并透传给调用方。

#### Scenario: 聚合 hook 包含业务逻辑

- **WHEN** `usePortfolioData.ts`（聚合层）中出现 `useState` 或 `useCallback` 包裹业务操作
- **THEN** code review SHALL 要求将该逻辑下沉到对应的子 hook

#### Scenario: 聚合 hook 正确组合子 hook

- **WHEN** `usePortfolioData` 内部调用 `useYearData` 和 `usePortfolioSync` 并合并返回
- **THEN** 视为符合聚合 hook 模式，代码结构合规
