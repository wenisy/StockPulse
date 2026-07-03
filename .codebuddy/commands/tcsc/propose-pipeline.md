---
name: "TCSC: Propose Pipeline"
description: "/opsx:propose 的 pre-propose 门禁——一句话需求澄清 gate、docs/INDEX.md 读取。post-propose 自动化（proposal-emit + propose-review）由 openspec-config-awareness.md 的 alwaysApply 强制执行。"
argument-hint: "<change-name> [<需求描述>]"
---

# TCSC Propose Pipeline

本文件是 `/opsx:propose` 的 **pre-propose 门禁**。post-propose 命令（proposal-emit + propose-review）由 `openspec-config-awareness.md` 的 alwaysApply 强制执行，此处不再重复。

`openspec-config-awareness.md` 负责索引到本文件。

---

## 1a. clarify gate

执行 `/opsx:propose <change-name> <需求描述>` 前，AI MUST 先判断 `<需求描述>` 是否为一句话需求。

**强制触发澄清（hard trigger）**：满足任一条件即视为一句话需求：
- 中文字符少于 30 个；或
- 只有单个动宾短语，例如：`修一下 X` / `加个 X` / `做个 X` / `把 X 分清楚`。

**直接 propose**：需求描述不少于 100 个中文字符，并且同时包含业务背景、期望效果、影响范围时，视为完整描述，可直接执行 `/opsx:propose`。

**灰色地带**：不满足 hard trigger、但 AI 判断明显缺少业务背景 / 期望效果 / 影响范围时，AI MAY 主动调用 `/tcsc:propose-clarify`。

命中澄清时，AI MUST：
1. 先调用 `/tcsc:propose-clarify <change-name> <用户原话>`，不得先创建 OpenSpec artifacts。
2. 收到 `propose 澄清上下文` 后，在**同一轮**立即继续 `/opsx:propose <change-name>`。
3. 将澄清上下文作为 propose 的业务输入。
4. SHALL NOT 要求用户手动重新输入 `/opsx:propose`。

## 1b. docs 读取

编写 proposal.md 之前，AI MUST 先执行：
1. Read `docs/INDEX.md`，锁定与本变更相关的业务域
2. Read `docs/modules/<域>/00-overview.md`，获取业务背景
3. §Why 段 MUST 引用上述知识库（此后 /tcsc:proposal-emit 的 knowledge_refs 三源抽取才能命中）
4. 若提案涉及多个业务域，每个域都要读对应的 `00-overview.md`

**降级处理**：若 `docs/INDEX.md` 不存在或 `docs/` 目录为空，输出 `[INFO] docs/INDEX.md 不存在或 docs/ 为空，跳过知识库读取，继续提案`，不阻塞 propose 主流程。后续 `/tcsc:proposal-emit` 的 `business_domain` 将默认为 `unknown`，`knowledge_refs` 校验将自动放宽。
