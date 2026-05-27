---
name: "TCSC: Pair Feature"
description: "跨前后端 feature 协作命令——7 阶段编排（参数解析 → 双端判定 → 共通事实落盘 → 第一端 propose → apply + handover → 第二端 propose → 第二端 apply 完成）。当用户提到跨前后端、前后端联调、需要在前端 + 后端两个 repo 同步推进同一个 feature 时使用此命令。"
argument-hint: "[<backend_repo> <frontend_repo> '<描述>'] [--resume <feature-id>] [--fork-from <archive-path> <other_repo> '<描述>']"
---

跨前后端 feature 协作的项目级斜杠命令。本命令做**参数解析 + 7 阶段编排 + 调起原生 /opsx 命令**；所有 OpenSpec artifact 生成（proposal / design / specs / tasks）MUST 通过原生 `/opsx:propose` / `/opsx:apply` 完成，命令体 SHALL NOT 自己 Write 任何 OpenSpec artifact 文件。

**关键约束**：本命令 SHALL NOT 依赖 `openspec/config.yaml` 任何字段；即使项目没装 openspec-installer 也可调起。双端 repo MUST 各自已 `openspec init`。

若 `~/.codebuddy/skills/openspec-pair-feature/SKILL.md` 不存在，输出：
```
❌ 未找到 openspec-pair-feature skill。
请安装：通过 openspec-installer 说"安装 OpenSpec"，或手动复制到 ~/.codebuddy/skills/openspec-pair-feature/
```
并停止流程。

---

## Phase 1：参数解析

从 `$ARGUMENTS` 中解析，按以下四分支执行：

### 分支 A：三参数模式（快路径）

若参数格式为 `<backend_repo> <frontend_repo> "<描述>"`（3 个位置参数，第三参数为引号包裹的描述）：
- 直接解析，无反问，直接进入 Phase 2
- 路径规范化：`~` 展开为 `$HOME`，相对路径 resolve 为绝对路径

### 分支 B：零参数模式（引导路径）

若参数为空（无任何参数）：
1. 用 AskUserQuestion 反问 **backend repo 绝对路径**（"`~/codes/aurora-services` 这样的格式"）
2. 用 AskUserQuestion 反问 **frontend repo 绝对路径**
3. 用 AskUserQuestion 反问 **需求描述**（业务背景 + 关键功能，一句话到几句话）
4. 全部收到后进入 Phase 2

### 分支 C：--resume 恢复模式

若参数格式为 `--resume <feature-id>`：
- 定位第一端 repo 的 `.pair-context.yml`：
  1. 优先检查当前 cwd 是否含 `openspec/changes/<feature-id>/.pair-context.yml`
  2. 否则 Glob 扫描 `~/codes/*/openspec/changes/<feature-id>/.pair-context.yml` + `~/codes/*/openspec/changes/archive/*-<feature-id>/.pair-context.yml`
  3. 多命中时 AskUserQuestion 让用户选；0 命中时反问绝对路径
- 找到后 Read `.pair-context.yml`，按 `progress.current_phase` 跳转对应 Phase：
  - `paused` → 读 `paused_reason`，提示用户解决后再 resume，停止
  - `first_propose` → 进入 Phase 4
  - `first_review` → 从 `.pair-context.yml` 读取 `repos.first_end`，输出"请 review 第一端（`<first_end>`）proposal，OK 后告诉我 'lock `<first_end>`'"
  - `first_apply_in_progress` → 进入 Phase 5（检查 apply 进度接续）
  - `handover` → 进入 Phase 6
  - `second_propose` → 进入 Phase 6
  - `second_review` → 从 `.pair-context.yml` 读取 `repos.second_end`，输出"请 review 第二端（`<second_end>`）proposal，OK 后告诉我 'lock `<second_end>`'"
  - `second_apply_in_progress` → 进入 Phase 7（检查 apply 进度接续）
  - `completed` → 输出"流程已完成，无需 resume"
- resume 时追加 history 事件 `{ event: "resumed", actor: "user" }`

### 分支 D：--fork-from 归档复用

若参数格式为 `--fork-from <archive-path> <other_repo> "<描述>"`：
- `<archive-path>` = 源 archive `.pair-context.yml` 绝对路径（必须存在）
- `<other_repo>` = 当前要开工的 repo 路径
- 路径规范化后进入变种三参数处理（第一端为 other_repo，shared_facts 复用源 archive）
- 在第一端新建 `.pair-context.yml` 时包含 `forked_from: <archive-path>` + `forked_at: <ISO8601>`
- 源 archive MUST 保持字节级未修改，只 Read 不 Write

**所有路径参数 MUST 在 Phase 1 末尾规范化为绝对路径（`~` 展开 + 相对路径 resolve）。**

**命令 MUST NOT 接受旧 v1 参数**：`<change-id>`（单参数）、`--upstream`、`--backend`、`--frontend`。若检测到旧签名，输出"⚠️ v2 签名已变化，请使用 `/tcsc:pair-feature <backend> <frontend> '<描述>'` 形式"。

---

## Phase 2：双端必要性判定与 repo 校验

1. **校验双端 repo**：
   - `ls <backend_repo>/openspec/` 是否存在 → 不存在时反问"backend 路径 `<path>` 没找到 openspec/ 目录，是否路径错了？"
   - `ls <frontend_repo>/openspec/` 同上
   - 校验失败时等待用户答复，不自动 openspec init

2. **校验通过后默认信任双端**：SHALL NOT 二次质疑用户为什么要双端

3. **单端关键词例外**：若需求描述含"只改前端"/"只改后端"/"仅 UI"/"仅 API"/"单端"等明显单端关键词，MUST 反问：
   ```
   ❓ 这听起来像单端 feature，确认要双端吗？建议改用 /opsx:propose 单端走。
   ```
   等待用户答复"确认双端"后才继续。

4. **端身份识别**：
   - 若当前 cwd == backend_repo → 第一端 = backend，第二端 = frontend
   - 若当前 cwd == frontend_repo → 第一端 = frontend，第二端 = backend
   - 否则默认 backend 为第一端，并提示"将先 cd 到 backend repo 执行"

---

## Phase 3：共通事实提取与落盘

所有操作在第一端 repo 执行，每次 Bash 调用 MUST 以 `cd <first_end_repo>` 起始。

1. **加载 checklist**：Read `~/.codebuddy/skills/openspec-pair-feature/checklist.md`

2. **反问补全 4 必填维度**：
   - Why（动因 / 业务背景）
   - AC（验收标准，可验证条件）
   - API 契约（HTTP 方法 + 路径 + 请求/响应 schema + 错误码）
   - 边界（Out of Scope / 不做的事）
   - 已在描述中包含的维度跳过；一次只问 1~2 个维度

3. **Derive 第一端 change-id**：
   - 参考 /opsx:propose 启发式：动词+名词、≤ 4 词、kebab-case，按第一端视角命名
   - 给出 1~3 候选，反问用户确认

4. **创建第一端脚手架**：
   ```bash
   cd <first_end_repo> && openspec new change <derived-id>
   ```

5. **落盘 `.pair-context.yml`**（v2 schema，见 pair-context-template.yml）：
   - 路径：`<first_end_repo>/openspec/changes/<derived-id>/.pair-context.yml`
   - Write v2 8 层结构（schema_version = "2.0"）
   - `progress.current_phase` 设为 `first_propose`
   - 追加 history 事件 `{ event: "created", actor: "user" }`

6. **全机器唯一原则**：`.pair-context.yml` MUST 仅存第一端这一份；第二端在 Phase 6 通过指针文件引用，SHALL NOT 复制副本

---

## Phase 4：第一端 propose 编排（喂事实给 OpenSpec）

所有操作保持在第一端 cwd，每次 Bash 调用 MUST 以 `cd <first_end_repo>` 起始。

1. **Read 共通事实**：
   ```
   Read <first_end_repo>/openspec/changes/<first-change-id>/.pair-context.yml
   ```
   提取 `shared_facts` 段全部内容（why / ac / api_contract / boundaries 必填 + 5 可选若存在）

2. **组装需求文本**：将 shared_facts 组装为人类可读的需求输入：
   - `why` → 业务背景段落
   - `ac` → 验收标准列表
   - `api_contract` → API 契约结构化块（YAML 转 markdown 代码块或表格）
   - `boundaries` → 不做的事列表
   - 可选 5 段（flows / non_functional / dependencies / who / error_handling）按需追加

3. **调起原生 /opsx:propose**：
   ```
   /opsx:propose <first-change-id>
   ```
   把上步组装的需求文本作为 propose 输入，让 OpenSpec 走原生 5 步生成 proposal / design / specs / tasks

4. **命令 MUST NOT 自己 Write 任何 OpenSpec artifact**：不写 proposal.md / design.md / specs/*.md / tasks.md，也不追加任何 pair-feature 自创标记（无 `📌` / `🛠` / HTML 注释边界 / `> 🔗 Upstream:` 等）

5. **propose 完成后 validate**：
   ```bash
   cd <first_end_repo> && openspec validate <first-change-id>
   ```
   通过后更新第一端 `.pair-context.yml`：`linked_changes.<first-end>.artifacts_status` 全部设为 done，`progress.current_phase` 设为 `first_review`

---

## Phase 5：第一端 review + apply + handover

1. **等待用户 lock**：
   输出"请 review 第一端 proposal，OK 后告诉我 'lock backend'（或 'lock frontend' 若第一端是 frontend）"
   等待用户明确给出 lock 指令后：
   - 更新 `.pair-context.yml`：`stages.<first-end>.proposal_locked = true`，`proposal_locked_at = <ISO8601>`
   - `progress.current_phase` 设为 `first_apply_in_progress`
   - 追加 history 事件 `{ event: "first_proposal_locked", actor: "user" }`

2. **调起原生 /opsx:apply**：
   ```
   /opsx:apply <first-change-id>
   ```
   保持在第一端 cwd（每次 Bash 调用前缀 `cd <first_end_repo>`）

3. **apply 完成检测**（tasks.md 全 [x]）后：
   - 更新 `.pair-context.yml`：`stages.<first-end>.apply_completed = true`，`apply_completed_at = <ISO8601>`
   - `linked_changes.<first-end>.apply_status = done`
   - `progress.current_phase` 设为 `handover`
   - 追加 history 事件 `{ event: "first_apply_completed", actor: "AI" }`
   - 输出"✅ 第一端 apply 完成，自动切到第二端..."

4. **MUST NOT 等待 archive**：apply 完成即自动进入 Phase 6，不等用户 archive

---

## Phase 6：第二端 propose 编排（指针文件 + 单一权威源）

每次 Bash 调用 MUST 以 `cd <second_end_repo>` 起始。

### 6-1：第一端归档检测

在切换到第二端前，检测第一端 `.pair-context.yml` 当前路径：

1. 检查 active 路径：`<first_end_repo>/openspec/changes/<first-change-id>/.pair-context.yml`
2. 若 active 不存在，Glob 扫描归档路径：`<first_end_repo>/openspec/changes/archive/*-<first-change-id>/.pair-context.yml`

**若 active 存在**：正常继续 Phase 6-2，`upstream_pair_context_path` = active 绝对路径。

**若 active 不存在但 archive 命中**：
输出：
```
⚠️ 检测到第一端已归档于 <archive-path>，请选择：
   a) 引用归档（只读），第二端本地维护 stages/progress/history
   b) 取消，先 unarchive 第一端再继续（/opsx:archive --restore 或等 MR merge 后重新 archive）
```
等待用户答复：
- **选 a**：`upstream_pair_context_path` = archive 绝对路径；继续 Phase 6-2；在 Phase 6-3 除指针文件外额外创建 `.pair-context-local-state.yml`
- **选 b**：退出 Phase 6，等待用户处理

### 6-2：第二端脚手架与指针文件

1. **Derive 第二端 change-id**：按第二端视角命名（与第一端视角不同，如 backend 的 `add-avatar-upload-api` → frontend 的 `add-avatar-upload-ui`），给 1~3 候选反问用户确认

2. **创建第二端脚手架**：
   ```bash
   cd <second_end_repo> && openspec new change <derived-second-id>
   ```

3. **写指针文件**（MUST NOT 复制 `.pair-context.yml`）：
   Write `<second_end_repo>/openspec/changes/<derived-second-id>/.pair-context-upstream.yml`：
   ```yaml
   # 指针文件：引用第一端 .pair-context.yml（单一权威源）
   upstream_pair_context_path: <upstream_pair_context_path>
   upstream_resolved_at: <ISO8601>
   ```
   文件总行数 MUST ≤ 5 行（含注释行）

4. **归档场景额外创建本地 state 文件**（仅第一端已归档时）：
   Write `<second_end_repo>/openspec/changes/<derived-second-id>/.pair-context-local-state.yml`：
   ```yaml
   # 本地 stage 文件（第一端已归档，无法写回）
   # shared_facts / repos / metadata / linked_changes 从 upstream 指针只读获取
   stages:
     frontend:
       proposal_locked: false
       proposal_locked_at: null
       apply_completed: false
       apply_completed_at: null
   progress:
     current_phase: second_propose
     next_action: "调起 /opsx:propose 生成第二端 4 件套"
     paused_reason: null
     resume_command: null
   history: []
   ```

5. **更新第一端 `.pair-context.yml` 的 linked_changes.second_end 段**（通过 upstream 指针写回）：
   - `change_id` = 第二端 change-id
   - `feature_branch` = 当前分支
   - `openspec_change_dir` = `openspec/changes/<derived-second-id>/`

### 6-3：第二端 propose（同 Phase 4 姿势）

1. 通过指针文件路径 Read 第一端 `.pair-context.yml` 获取 `shared_facts`
2. 组装同 Phase 4 的需求文本（第二端视角，frontend 关注 UI 调用）
3. 调起原生 `/opsx:propose <derived-second-id>`（在第二端 repo 执行）
4. propose 完成后：更新 linked_changes.second_end.artifacts_status，`progress.current_phase` = `second_review`（写回权威源）

---

## Phase 7：第二端 apply + 流程完成

每次 Bash 调用 MUST 以 `cd <second_end_repo>` 起始。

1. **等待用户 lock 第二端 proposal**：
   输出"请 review 第二端 proposal，OK 后告诉我 'lock <second-end>'"
   收到后更新 stages.second_end（写回第一端权威源；若第一端已归档则写本地 `.pair-context-local-state.yml`）

2. **调起原生 /opsx:apply**：
   ```
   /opsx:apply <derived-second-id>
   ```

3. **apply 完成后**：
   - 更新 stages.second_end.apply_completed = true（写回权威源或本地 state 文件）
   - `linked_changes.second_end.apply_status = done`
   - `progress.current_phase = completed`
   - 追加 history 事件 `{ event: "completed", actor: "AI" }`

4. **输出完成提示**（MUST NOT 自动 archive）：
   ```
   🎉 跨端 feature 编排完成！
   
   请双端各自归档：
   - 第一端：在 <first_end_repo> 运行 /opsx:archive <first-change-id>
   - 第二端：在 <second_end_repo> 运行 /opsx:archive <derived-second-id>
   ```

---

## 跨 Phase 公共约束

**1. cwd 切换**：每次 Bash 工具调用 MUST 以 `cd <target_repo>` 起始，不假设 cwd 状态：
```bash
cd <first_end_repo> && openspec validate <id>
```

**2. git 操作 cwd 校验**：git 操作前 MUST 校验 cwd 与预期 repo 配对，不匹配时先 cd：
```bash
cd <expected_repo> && git status
```

**3. 切换失败兜底**：若 cd 命令失败（路径不存在/无权限），MUST 立即：
- 更新 `.pair-context.yml.progress.paused_reason` = 错误原因
- 更新 `progress.current_phase = paused`
- 输出"❌ 切换到 `<path>` 失败：<原因>，请修复后运行 `/tcsc:pair-feature --resume <feature-id>` 接续"
- 停止流程，不静默重试

**4. history 追加**：每个状态转换点 MUST 追加 history entry（append-only，不删除旧条目）：
```yaml
- timestamp: <ISO8601>
  event: <事件类型>
  actor: user | AI | command
  note: <可选补充>
```

**5. 命令 MUST NOT Write 任何 OpenSpec artifact**：proposal.md / design.md / specs/*.md / tasks.md 全部由 /opsx:propose / /opsx:apply 生成，命令体 SHALL NOT 写入这些文件，也不追加任何 pair-feature 自创标记。
