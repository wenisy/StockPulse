## ADDED Requirements

### Requirement: 应用根组件的状态拆分模式

应用根组件（如 `StockPortfolioTracker`）SHALL 将 UI 级 state 拆到独立 hook，主组件 MUST NOT 直接声明超过 5 个 useState。useEffect 和 callback 也 SHALL 分别聚合到单独 hook。

#### Scenario: 主组件内嵌超过 5 个 useState

- **WHEN** `StockPortfolioTracker.tsx` 内出现 6+ 个 `useState` 调用
- **THEN** code review SHALL 要求把它们抽到 `useTrackerState` 类 hook

#### Scenario: 主组件正确组合子 hook

- **WHEN** `StockPortfolioTracker.tsx` 调用 `useTrackerState` + `useTrackerCallbacks` + `useTrackerEffects`，自身不声明任何 useState
- **THEN** 视为合规
