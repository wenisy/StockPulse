## 1. 提案 0 自身的产出确认（无代码改动）

- [ ] 1.1 用户审阅 `proposal.md` 并确认动机表达准确
- [ ] 1.2 用户审阅 `design.md` 三层架构与切片规划
- [ ] 1.3 用户审阅 `specs/portfolio-domain/spec.md`，逐条确认业务断言无误（重点：加权成本价、卖出剩余成本、去重粒度、价格刷新接口契约）
- [ ] 1.4 用户对决策 1（三层架构）拍板
- [ ] 1.5 用户对决策 2（lib 模块切分清单）拍板
- [ ] 1.6 用户对决策 3（5 个子提案的依赖顺序）拍板
- [ ] 1.7 用户对决策 4（覆盖率阈值 100/80/不强求）拍板
- [ ] 1.8 用户对决策 6（旧测试与临时脚本延后到提案 5 删除）拍板

## 2. 子提案骨架起草（仍属本提案 0 范围，仅产出文档）

- [x] 2.1 起草提案 1 `extract-portfolio-pure-logic` 的 proposal/design/tasks 骨架
- [x] 2.2 起草提案 2 `test-portfolio-pure-logic` 的 proposal/design/tasks 骨架
- [x] 2.3 起草提案 3 `refactor-hooks-to-use-pure-logic` 的 proposal/design/tasks 骨架
- [x] 2.4 起草提案 4 `test-hooks` 的 proposal/design/tasks 骨架
- [x] 2.5 起草提案 5 `cleanup-legacy-tests` 的 proposal/design/tasks 骨架

> 说明：2.1–2.5 是"骨架级"产出（each ~50 行级 proposal + 任务清单），不是完整 spec。每个子提案在自己被启动时（`/opsx:apply` 之前）会被进一步完善。

## 3. 提案 0 校验与归档准备

- [ ] 3.1 运行 `openspec validate add-portfolio-test-foundation --strict` 通过
- [ ] 3.2 运行 `openspec status --change add-portfolio-test-foundation` 确认所有 artifact 状态为 done
- [ ] 3.3 检查 git 当前分支为特性分支（非 main/master）
- [ ] 3.4 提交本提案文档并推送到远端
- [ ] 3.5 用户在远端创建该特性分支的 MR/PR
- [ ] 3.6 执行 `/opsx:archive add-portfolio-test-foundation` 完成归档（按 config.yaml 的 archive 规则）
