---
name: "TCSC: Propose Clarify"
description: "OpenSpec /opsx:propose 前的一句话需求澄清命令。通过 3 个问题补齐业务背景、期望效果、影响范围，并输出 propose 澄清上下文。由 openspec-config-awareness.md 的 pre-propose clarify gate 自动调起。"
argument-hint: "<change-name> <用户原话>"
---

`/tcsc:propose-clarify` 是 OpenSpec propose 前置澄清命令。本命令是**纯交互命令**：只询问用户、整理上下文并输出结构化 prompt，**不得创建 change 目录，不得写任何文件**。

---

## Phase 1：参数解析

从 `$ARGUMENTS` 解析：

```text
<change-name> <用户原话>
```

- `<change-name>`：可选；若用户原始 `/opsx:propose` 已包含 change name，则沿用。
- `<用户原话>`：必填；即触发澄清的一句话需求。

如果 `<change-name>` 缺失，AI MAY 根据用户原话和后续澄清结果推导 kebab-case change name，但不得在本命令中创建 change。

---

## Phase 2：三问澄清

使用 AskUserQuestion 依次询问以下 3 个问题。每题都需要用户用自然语言回答，不要提供固定选项。

1. **业务背景**：你为什么要做这个改动？现在遇到什么问题？
2. **期望效果**：做完以后应该是什么样？用户或系统行为有什么变化？
3. **影响范围**：你预期这个改动会影响哪些模块 / 页面 / 接口 / 文件？只列出你想到的，AI 不要自行扩展到清单外的位置。

---

## Phase 3：输出 propose 澄清上下文

把用户原话和 3 个回答合并成如下结构化上下文：

```markdown
## propose 澄清上下文

change_name: <change-name 或 AI 建议的 kebab-case 名称>

用户原始输入：<用户原话>

业务背景：
<Q1 回答>

期望效果：
<Q2 回答>

影响范围：
<Q3 回答>
```

---

## Phase 4：完成约束

输出澄清上下文后，本命令结束。自动继续 `/opsx:propose <change-name>` 的强制要求由 `openspec-config-awareness.md` 的 `pre-propose clarify gate` 维护。

**禁止事项**：
- SHALL NOT 创建 `openspec/changes/<change-name>/`
- SHALL NOT 写 `proposal.md` / `design.md` / `tasks.md` / specs
- SHALL NOT 写 `metadata.yaml` / `review-result.yaml`
- SHALL NOT 要求用户手动重新输入 `/opsx:propose`
