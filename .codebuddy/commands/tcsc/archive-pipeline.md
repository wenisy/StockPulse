---
name: "TCSC: Archive Pipeline"
description: "对指定 OpenSpec 变更执行归档流水线——5 步串行流程(git branch 检查 → unpushed commits 检查 → MR/PR 存在性检查 → openspec archive 调起 → INDEX 语义化更新)。当用户提到归档变更、archive change、完成提案、收尾本次 change 时使用此命令;也是 rules.archive v2 的统一入口。"
argument-hint: "<change-name>"
---

对指定 OpenSpec 变更执行完整的归档流水线。本命令是 `rules.archive` v2 的统一入口——`config.yaml.rules.archive` 极简化为 1 行指针指向本命令,所有详细的归档前置检查 + 索引更新逻辑全部下沉到本命令体。

与 `/tcsc:review-pipeline` 同代际命名空间、同分发模式(项目级斜杠命令双胞胎部署到 `.codebuddy/commands/tcsc/` + `.claude/commands/tcsc/`)。

---

**调用方式**:`/tcsc:archive-pipeline <change-name>` 或由 `rules.archive` v2 自动触发。

## Phase 1:参数解析

从参数获取 `<change-name>`(kebab-case,必填)。如果未提供:
- 通过 `openspec list --json` 列出活跃变更
- 用 **AskUserQuestion tool** 让用户选择
- SHALL NOT 自动选择默认值

```bash
openspec list --json
```

提示用户编号选择后,把 change-name 作为后续 5 步流程的输入。

---

## Phase 2:4 步流程概览

```
Step 1: git branch 检查        → 确认非 main/master 特性分支
Step 2: unpushed commits 检查  → 确认无未推送提交
Step 3: openspec archive 调起  → 真正执行归档
Step 4: INDEX 语义化更新       → AI 读 specs/ 与 archive/ 后生成两个 INDEX.md
```

任一步失败 MUST 阻止流程进入下一步,并明确告知用户需要先完成的步骤。

---

## Step 1:git branch 检查

```bash
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
echo "[INFO] 当前分支: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    echo "[FAIL] 不能在主分支(main/master)上归档变更"
    echo "请先切换到特性分支(如 feat/<change-name>),再重新运行本命令"
    exit 1
fi
```

- 不通过 → 阻止流程,提示切换分支
- 通过 → 进入 Step 2

---

## Step 2:unpushed commits 检查

```bash
UNPUSHED=$(git log --oneline @{u}..HEAD 2>/dev/null)

if [ -n "$UNPUSHED" ]; then
    echo "[FAIL] 检测到未推送的本地提交:"
    echo "$UNPUSHED"
    echo "请先 git push 推送所有提交,再重新运行本命令"
    exit 1
fi

echo "[OK] 所有本地提交已推送到远端"
```

- 有未推送提交 → 阻止流程,提示先 git push
- 无未推送提交 → 进入 Step 3

---

## Step 3:调起 `openspec archive`

前 2 步全过后,执行真正的归档:

```bash
openspec archive <change-name> --yes 2>&1
```

- `--yes` 跳过 OpenSpec CLI 的交互式确认
- 归档操作 SHALL 把 `openspec/changes/<change-name>/` 整个目录移到 `openspec/changes/archive/<YYYY-MM-DD>-<change-name>/`
- 同时把 specs delta(ADDED / MODIFIED / REMOVED Requirements)应用到 `openspec/specs/`

如果 archive 命令返回错误(如 change 不存在 / specs delta 冲突):
- 报错 → 终止本流程,**不进入 Step 4**
- 输出 archive 命令的完整 stderr 给用户排查

---

## Step 4:INDEX 语义化更新

archive 成功后,AI MUST 更新两个 INDEX.md 文件。**这一步是 AI 任务,不是机械 shell**——需要语义理解 + 表格生成。

### Step 4-1:更新 `openspec/specs/INDEX.md`

读取 `openspec/specs/` 下每个子目录的 `spec.md`,理解其内容后生成表格:
- 从文档中语义提取该 spec 的用途描述(优先从 `## Purpose` 段落,若无则从首个 Requirement 概括)
- 统计 `### Requirement:` 出现次数作为需求数
- 生成 Markdown 表格写入 `openspec/specs/INDEX.md`,格式如下:

```markdown
# Specs 索引

| Spec | 用途 | 需求数 |
|------|------|--------|
| [spec-name](./spec-name/spec.md) | 用途描述 | N |
```

如果 specs 目录下无子目录,写入:`_暂无 spec。_`

### Step 4-2:更新 `openspec/changes/archive/INDEX.md`

读取 `openspec/changes/archive/` 下每个子目录的 `proposal.md`,理解其内容后生成表格:
- 从目录名提取日期(YYYY-MM-DD 前缀)和变更名
- 从 proposal.md 的 `## Why` 段落语义提取动因摘要(一句话)
- 从 proposal.md 的 `### New Capabilities` 提取新增能力名称
- 生成 Markdown 表格按日期倒序写入 `openspec/changes/archive/INDEX.md`,格式如下:

```markdown
# 归档变更索引

| 日期 | 变更 | 动因 | 新增能力 |
|------|------|------|----------|
| 2026-05-27 | [change-name](./2026-05-27-change-name/) | 动因摘要 | capability-a, capability-b |
```

如果 archive 目录下无子目录,写入:`_暂无归档变更。_`

### Step 4-3:汇报完成

4 步全部完成后输出汇总:

```
✅ 归档完成

Change: <change-name>
归档位置: openspec/changes/archive/<YYYY-MM-DD>-<change-name>/

specs 索引: openspec/specs/INDEX.md(已更新)
archive 索引: openspec/changes/archive/INDEX.md(已更新)
```

---

## 命令独立可用,不依赖 config.yaml

本命令的全部行为 SHALL NOT 依赖 `openspec/config.yaml` 中的任何字段。即使项目没有装 `openspec-installer`、即使 `openspec/config.yaml` 缺失、即使 bridge rule 不存在,本命令仍可被用户主动调起并完成 4 步流程(前提仅为 `openspec` CLI 已安装且当前在 git 工作树内)。

如果 `openspec` CLI 未安装,Step 3 会返回错误,本命令会在该步终止——这是 OpenSpec CLI 的边界,不属于本命令的失败。

---

## 兜底:OpenSpec 未初始化的项目

如果当前目录没有 `openspec/` 目录(用户未运行 `openspec init`):
- Step 3 的 `openspec archive` 会报错"not in an openspec project"
- 本命令 MUST 输出:

```
❌ 当前目录不是 OpenSpec 项目。

请先运行:
  openspec init --tools codebuddy,claude --force

或安装 openspec-installer:
  在 IDE 中说"安装 OpenSpec"或"初始化 OpenSpec 环境"
```

并终止流程。

---

## 与 review-pipeline 的协作关系

- `/tcsc:review-pipeline <change-name>` → 编码完成后审查(`rules.apply` 触发)
- `/tcsc:archive-pipeline <change-name>` → 审查通过后归档(`rules.archive` 触发)

两个命令同代际命名空间、同分发模式、同流程风格。完整工作流:

```
/opsx:propose → /opsx:continue × N → /opsx:apply
                                          ↓ (rules.apply 触发)
                                      /tcsc:review-pipeline
                                          ↓ (审查通过)
                                      /opsx:archive
                                          ↓ (rules.archive 触发)
                                      /tcsc:archive-pipeline ← 本命令
                                          ↓
                                      INDEX 自动更新
```
