## REMOVED Requirements

### Requirement: Legacy 回退机制

**Reason**: 前 7 个 redesign-* sub-change 已完整替代 legacy 视图功能，保留 `?legacy=1` 会拖累 bundle 且形成两套维护负担。

**Migration**: 访问 `/` 直接获得新 dashboard，无 legacy 入口。如需恢复旧 UI，从 git 历史 checkout 此 change 之前的 commit。
