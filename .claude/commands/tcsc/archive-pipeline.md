---
name: "TCSC: Archive Pipeline"
description: "对指定 OpenSpec 变更执行归档流水线——4 步 + 测试兜底流程(tasks 勾选完整性检查 → 测试守门兜底 → docs 回填工作流 → openspec archive 调起 → INDEX 语义化更新)。当用户提到归档变更、archive change、完成提案、收尾本次 change 时使用此命令;也是 rules.archive v3 的统一入口。"
argument-hint: "<change-name>"
---

对指定 OpenSpec 变更执行完整的归档流水线。本命令是 `rules.archive` v3 的统一入口——`config.yaml.rules.archive` 极简化为 1 行指针指向本命令,所有详细的归档前置检查 + 索引更新逻辑全部下沉到本命令体。

与 `/tcsc:review-pipeline` 同代际命名空间、同分发模式(项目级斜杠命令双胞胎部署到 `.codebuddy/commands/tcsc/` + `.claude/commands/tcsc/`)。

---

**调用方式**:`/tcsc:archive-pipeline <change-name>` 或由 `rules.archive` v3 自动触发。

## Phase 1:参数解析

从参数获取 `<change-name>`(kebab-case,必填)。如果未提供:
- 通过 `openspec list --json` 列出活跃变更
- 用 **AskUserQuestion tool** 让用户选择
- SHALL NOT 自动选择默认值

```bash
openspec list --json
```

提示用户编号选择后,把 change-name 作为后续 4 步 + 测试兜底流程的输入。

---

## Phase 2:4 步 + 测试兜底流程概览

```
Step 0: tasks 勾选完整性检查   → 确认 tasks.md 中所有 - [ ] 都已变为 - [x]
Step 0.5: 测试守门兜底         → 确认功能/逻辑代码具备测试执行证据
Step 1: ★ docs 回填工作流      → 5 阶段流程,使 docs/ 知识库与 spec 状态对齐
Step 2: openspec archive 调起  → 真正执行归档
Step 3: INDEX 语义化更新       → AI 读 specs/ 与 archive/ 后生成两个 INDEX.md
```

任一步失败 MUST 阻止流程进入下一步,并明确告知用户需要先完成的步骤。

> Step 0.5「测试守门兜底」是 v1.8.1 新增能力:它是 archive 前最后一道测试证据检查,用于兜住 review-pipeline 未触发 / verifier 未落盘 / 用户直接 archive 的场景。
>
> Step 1「docs 回填工作流」是 v1.5.0 新增能力(对应 iWiki 4018851370《技术知识建设和治理规范》§5/§6)。Step 1 不以“文档未完全回填”作为硬失败:用户选择跳过 / STALE / 误报 / 跳过业务域等可继续分支时,AI 记录 docs_sync 后正常进入 Step 2;但若用户明确选择“暂缓 archive,我去手动改”,则本次流程优雅终止,不进入 Step 2,提示用户整理后重跑。

---

## Step 0:tasks 勾选完整性检查

在做任何 git/archive 动作之前,先确认 `openspec/changes/<change-name>/tasks.md` 中所有 checkbox 任务都已完成(即文件中不存在任何 `- [ ]` 形式的未勾选行)。这一步是归档的最基础前提:任务都没做完,归档没意义,且会让"半成品"被错误纳入 `archive/` 目录,污染历史记录。

**作用域**:Step 0 只读取**当前要归档的那个 change**(由 Phase 1 解析得到的 `<change-name>`)对应的 `openspec/changes/<change-name>/tasks.md` 这一条精确路径。SHALL NOT 遍历或扫描项目里其他 active changes 的 `tasks.md`(它们各自独立、与本次归档无关)。每次归档只检查"被归档的那个 change"。

```bash
TASKS_FILE="openspec/changes/<change-name>/tasks.md"

if [ ! -f "$TASKS_FILE" ]; then
    echo "[WARN] $TASKS_FILE 不存在,跳过任务勾选检查"
else
    # 提取所有未完成任务行(行首允许前导空白,匹配 - [ ] 模式,中括号内单空格)
    UNCHECKED=$(grep -nE '^[[:space:]]*-[[:space:]]+\[[[:space:]]\]' "$TASKS_FILE" || true)

    if [ -n "$UNCHECKED" ]; then
        echo "[FAIL] 检测到未完成任务,不能归档"
        echo ""
        echo "$UNCHECKED" | while IFS=: read -r TASK_LINE TASK_TEXT; do
            # 反向查找该行所在的最近一个 ## 二级标题
            SECTION=$(awk -v target="$TASK_LINE" '/^## /{sec=$0} NR==target{print sec; exit}' "$TASKS_FILE")
            echo "  • ${SECTION:-(无小节标题)}"
            echo "    └─ $TASKS_FILE:$TASK_LINE  $TASK_TEXT"
        done
        echo ""
        echo "请先用 /opsx:apply 完成剩余任务,或显式将其改为已完成标记后,再重新运行本命令"
        exit 1
    fi

    echo "[OK] tasks.md 中所有任务均已勾选完成"
fi
```

三种结果分支:

- 全部勾选 → 输出 `[OK] tasks.md 中所有任务均已勾选完成`,进入 Step 0.5
- 存在未勾选 → 输出 `[FAIL]` + 未完成项清单(含小节标题、文件路径、行号、原文行)+ 行动建议,**立即终止流程**(不进入 Step 0.5 / Step 1)
- `tasks.md` 不存在 → 输出 `[WARN] tasks.md 不存在,跳过任务勾选检查`,继续进入 Step 0.5(对老 change / 手工归档场景兼容)

逃生通道:如果用户在 `tasks.md` 中刻意保留某个 `- [ ]` 作为"未来工作 marker",可以将其改写成不会被 grep 命中的形式(如 `- [-] 未来再做`、`- [skip] 待用户操作`、或用 HTML 注释 `<!-- TODO future: ... -->`)。注意 markdown 代码围栏 ```...``` 内的 `- [ ]` 字面量**仍会被命中**——本检查按行扫描不解析 markdown 结构,因此代码围栏不是有效的逃生方式。

本步骤为纯读取操作,SHALL NOT 修改 `tasks.md` 任何字节。

---

## Step 0.5:测试守门兜底

本步骤是 archive 前的最终测试守门兜底,用于兜住 `review-pipeline` 未触发、verifier 未执行或用户绕过审查直接 archive 的场景。它在 Step 0 tasks 勾选检查之后、Step 1 docs 回填工作流之前执行。

**边界**:本步骤不运行完整测试套件、不采集覆盖率、不替代 `/tcsc:review-pipeline`。真正运行测试仍由 verifier 负责。本步骤只检查是否存在足够的测试证据,并基于证据决定是否允许进入 docs 回填和 archive。

### 证据优先级

1. 优先读取 `openspec/changes/<change-name>/test-result.yaml`。
2. 若 `test-result.yaml` 不存在,再用轻量文件启发式判断本次 change 是否涉及功能/逻辑代码、是否出现测试文件改动。
3. 对功能/逻辑代码,若没有 `test_status: pass` 或 `test_status: skipped` 这类合法测试执行证据,archive MUST 拒绝继续。即使发现测试文件改动,也只能说明“可能补了测试”,不能证明测试已运行,仍需重跑 `/tcsc:review-pipeline` 生成 `test-result.yaml`。

### 读取 `test-result.yaml`

```bash
CHANGE_DIR="openspec/changes/<change-name>"
TEST_RESULT="$CHANGE_DIR/test-result.yaml"

if [ -f "$TEST_RESULT" ]; then
    TEST_STATUS=$(python3 -c "import yaml,sys; d=yaml.safe_load(open('$TEST_RESULT')) or {}; print(d.get('test_status','unknown'))" 2>/dev/null || echo "parse_error")

    case "$TEST_STATUS" in
        pass)
            echo "[OK] test-result.yaml 显示测试已通过,测试守门兜底放行"
            ;;
        skipped)
            echo "[SKIPPED] 测试守门已关闭,test-result.yaml 显示 skip=true,继续 archive"
            ;;
        fail)
            echo "[FAIL] test-result.yaml 显示测试失败,拒绝 archive"
            echo "请先修复失败测试后重新运行 /opsx:apply 或 /tcsc:review-pipeline <change-name>"
            exit 1
            ;;
        unknown)
            echo "[FAIL] test-result.yaml 显示测试状态未知,拒绝 archive"
            echo "请配置 openspec/.tcsc-test.yml 或修复测试命令探测后,重新运行 /tcsc:review-pipeline <change-name> 生成有效测试证据"
            exit 1
            ;;
        *)
            echo "[FAIL] test-result.yaml 无法解析或 test_status 非法: $TEST_STATUS"
            echo "请重新运行 /tcsc:review-pipeline <change-name> 生成合法 test-result.yaml"
            exit 1
            ;;
    esac
else
    echo "[WARN] 未发现 $TEST_RESULT,进入轻量文件启发式兜底"
fi
```

### `test-result.yaml` 不存在时的轻量启发式

当 `test-result.yaml` 不存在时,AI MUST 检查本次 change 的实际文件改动:

```bash
CHANGE_DIR="openspec/changes/<change-name>"

# 取本次尚未归档前的工作树改动文件。若当前是已提交状态,AI 可结合 change 的 tasks/specs 语义和 git diff HEAD~1..HEAD 辅助判断。
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || true)
CHANGED_FILES="$CHANGED_FILES
$(git diff --cached --name-only 2>/dev/null || true)"
CHANGED_FILES=$(printf '%s
' "$CHANGED_FILES" | sed '/^[[:space:]]*$/d' | sort -u)

LOGIC_FILES=$(printf '%s
' "$CHANGED_FILES" | grep -E '\.(go|js|jsx|ts|tsx|vue|py|java|kt|rs|rb|php|cs|swift|mjs|cjs)$' | grep -Ev '(^|/)(__tests__|tests?|spec)/|(_test\.go|\.test\.|\.spec\.)' || true)
TEST_FILES=$(printf '%s
' "$CHANGED_FILES" | grep -E '(^|/)(__tests__|tests?|spec)/|(_test\.go|\.test\.|\.spec\.)' || true)
NON_LOGIC_ONLY=$(printf '%s
' "$CHANGED_FILES" | grep -Ev '\.(md|mdx|json|ya?ml|toml|css|scss|less|png|jpg|jpeg|gif|svg|lock)$' || true)
```

判定规则:

- 若本次 change 仅涉及纯文档(`*.md`/`*.mdx`)、纯配置(json/yaml/toml)、纯样式(css/scss/less)、静态资源或纯移动/重命名且不改逻辑 → 输出 `[SKIPPED] 纯文档/配置/样式/纯移动变更,跳过测试守门兜底`,继续 Step 1。
- 若涉及功能/逻辑代码,且没有测试文件/测试用例改动 → 输出 `[FAIL] 功能/逻辑代码缺少配套测试与测试执行证据`,拒绝 archive。
- 若涉及功能/逻辑代码,且发现测试文件/测试用例改动,但没有 `test-result.yaml` → 输出 `[FAIL] 发现测试改动但缺少测试执行证据`,拒绝 archive。请重新运行 `/tcsc:review-pipeline <change-name>` 让 verifier 写入 `test-result.yaml` 后再 archive。
- 若无法从 git diff 得到可靠文件清单,AI MUST 结合 `tasks.md` / `spec.md` / 最近提交 diff 继续判断;仍无法判断时按安全侧处理为 `[FAIL] 测试证据不足`,不得静默放行功能/逻辑 change。

失败输出模板:

```
[FAIL] 测试守门兜底未通过,拒绝 archive
原因: <功能/逻辑代码缺少配套测试 | 缺少 test-result.yaml 测试执行证据 | 测试状态 fail/unknown>
建议:
  1. 补充或更新配套测试
  2. 重新运行 /opsx:apply <change-name> 或 /tcsc:review-pipeline <change-name>
  3. 确认 openspec/changes/<change-name>/test-result.yaml 为 test_status: pass 或 skipped 后再 archive
```

本步骤为纯读取 + 阻塞判断操作,SHALL NOT 修改源码、测试文件或 OpenSpec artifact。

---

## Step 1:docs 回填工作流（5 阶段）

> 本步骤是 v1.5.0 新增能力。**触发时机**:Step 0(tasks 勾选完整性检查)与 Step 0.5(测试守门兜底)通过后自动进入。**作用域边界**:仅守护项目根 `docs/` 子树;`openspec/`、`.codebuddy/`、`.claude/`、`skills/`、源码目录等**不在本步骤范围**。**与 4018851370 §5 Code Review Gate 的关系**:本步骤把"无文档更新不予合并"的红线从 PR 阶段前移到 archive 阶段;archive 之前由 AI 主动 diff spec 与 docs 的冲突 / 缺口,反复 AskUserQuestion 与用户确认,确认后 AI 直接写入 `docs/`,让知识库永远保持活跃状态。

### 整体不阻塞策略

- 项目无 `docs/` 目录 → 输出 `[INFO] 项目无 docs/ 目录,跳过 Step 1 docs 回填工作流`,直接进入 Step 2
- `metadata.yaml` 不存在(老 change)→ 仅按 spec.md 关键词推导,弹 AskUserQuestion 提示用户:"未找到 metadata.yaml,是否要先跑 /tcsc:proposal-emit 补一个?"用户选"否"则降级使用 spec 关键词继续
- 用户在 Phase 1.3 选"全部暂缓 archive 我去手动改" → 优雅终止 Step 1,**不进入 Step 2**,提示用户重跑

### Phase 1.1:识别本次 change 的 docs 影响域

三源合并去重抽取(与 `proposal-emit.md` Phase 3 同款思路):

```bash
CHANGE_DIR="openspec/changes/<change-name>"

# 优先源 1:metadata.yaml.knowledge_refs(最准,由 proposal-emit 沉淀)
if [ -f "$CHANGE_DIR/metadata.yaml" ]; then
    KNOWLEDGE_REFS=$(python3 -c "import yaml; d=yaml.safe_load(open('$CHANGE_DIR/metadata.yaml')); [print(x) for x in d.get('knowledge_refs',[])]" 2>/dev/null || true)
    BUSINESS_DOMAIN=$(python3 -c "import yaml; d=yaml.safe_load(open('$CHANGE_DIR/metadata.yaml')); [print(x) for x in d.get('business_domain',[])]" 2>/dev/null || true)
else
    echo "[WARN] metadata.yaml 不存在,降级使用 spec 关键词推导"
    KNOWLEDGE_REFS=""
    BUSINESS_DOMAIN=""
fi

# 优先源 2:spec.md ADDED/MODIFIED Requirement 关键词
SPEC_FILES=$(find "$CHANGE_DIR/specs/" -name 'spec.md' 2>/dev/null)
SUSPECT_API=$(grep -lE 'API|接口|endpoint|action|字段' $SPEC_FILES 2>/dev/null || true)
SUSPECT_RULE=$(grep -lE '规则|rule-|约束|MUST|SHALL|不得|禁止' $SPEC_FILES 2>/dev/null || true)
SUSPECT_FLOW=$(grep -lE '流程|状态|flow-|sequenceDiagram|stateDiagram' $SPEC_FILES 2>/dev/null || true)
SUSPECT_FAQ=$(grep -lE '排障|FAQ|异常|常见问题|误用' $SPEC_FILES 2>/dev/null || true)

# 优先源 3:proposal.md "## Why" 段语义识别(由 AI 完成,读取后用模型语义提取本次 change 涉及的关键能力名称、API 名、规则名等)
```

#### EXPECTED_DOCS 推导规则

由 AI 推导**期望 docs 影响清单**(每个 business_domain 一组):

```
for each domain in BUSINESS_DOMAIN:
  if SUSPECT_API   → 期望 docs/modules/<domain>/api/api-*.md
  if SUSPECT_FLOW  → 期望 docs/modules/<domain>/core-flows/flow-*.md
  if SUSPECT_RULE  → 期望 docs/guides/rule-*.md(跨域共享)
  if SUSPECT_FAQ   → 期望 docs/troubleshooting/faq-*.md(跨域共享)
  始终期望 docs/modules/<domain>/00-overview.md(若本次 change 涉及该业务域的重大调整)
```

knowledge_refs 中已显式列出的 ID(如 `rule-archive-pipeline`、`api-create-snapshot`)直接映射到对应 docs 路径,作为 EXPECTED_DOCS 的精确补充。

#### 用户自定义分组检测

```bash
# 检测 docs/ 下用户自定义分组(如 docs/_exploration/、docs/_drafts/),视为只读
for dir in docs/*/; do
    name=$(basename "$dir")
    case "$name" in
        architecture|api|guides|modules|reviews|troubleshooting) ;;
        _*) echo "[INFO] 检测到用户自定义分组 $dir,视为只读" ;;
        *) echo "[INFO] 检测到非标准分组 $dir,Phase 3 不会触碰其内容" ;;
    esac
done
```

---

### Phase 1.2:与 docs 现状 diff,分类 4 种冲突

按 git 时间窗 + 路径存在性,把 EXPECTED_DOCS 中每一项归入下列 4 类之一:

| 类型 | 判定 | 处理 |
|---|---|---|
| **A. 已陈旧待回填** | docs 文件存在 + 周期内**未**被 git 改 + spec 周期内**有**改动 | 进入 Phase 1.3,弹 4 选项审议 |
| **B. 已同步** | docs 文件存在 + 周期内**已**被 git 改 | 列入"已同步"清单,跳过 |
| **C. 文件应有但缺** | 期望路径下文件不存在,但**父目录在白名单内**且**已存在** | 进入 Phase 1.3,弹"是否新建?" 4 选项 |
| **D. 业务域整缺** | `docs/modules/<域>/` **整个目录不存在** | **AI 不动手**——输出引导 + 2 选项(详见 Phase 1.3) |

#### git 时间窗判定脚本

```bash
# 周期锚点:proposal.md 首次 commit 时间(rebase / squash 后最稳定)
CHANGE_START=$(git log --diff-filter=A --format=%ct -- "$CHANGE_DIR/proposal.md" 2>/dev/null | tail -1)

if [ -z "$CHANGE_START" ]; then
    # 兜底:取 change 目录创建时间(跨平台兼容 Linux + macOS)
    CHANGE_START=$(stat -c %Y "$CHANGE_DIR" 2>/dev/null \
        || stat -f %m "$CHANGE_DIR" 2>/dev/null \
        || echo 0)
fi

classify_doc() {
    local doc_path="$1"

    # 类型 D:业务域整缺
    if [[ "$doc_path" =~ ^docs/modules/([^/]+)/ ]]; then
        local domain="${BASH_REMATCH[1]}"
        if [ ! -d "docs/modules/$domain" ]; then
            echo "D"; return
        fi
    fi

    # 路径存在性
    if [ ! -f "$doc_path" ]; then
        # 父目录是否存在 + 是否白名单内
        local parent_dir=$(dirname "$doc_path")
        if [ -d "$parent_dir" ]; then
            echo "C"; return
        else
            echo "D"; return  # 父目录不在 → 业务域骨架缺失
        fi
    fi

    # 文件存在 → 看周期内是否有 git 改动
    local doc_last=$(git log -1 --format=%ct --since="@$CHANGE_START" -- "$doc_path" 2>/dev/null)
    if [ -n "$doc_last" ]; then
        echo "B"  # 已同步
    else
        echo "A"  # 已陈旧
    fi
}
```

输出 4 类清单:

```
[Phase 1.2 分类结果]
  类型 A 已陈旧待回填:N1 项
    - docs/guides/rule-archive-pipeline.md
    - docs/modules/产品市场/api/api-create-snapshot.md
  类型 B 已同步:N2 项(跳过审议)
  类型 C 文件应有但缺:N3 项
    - docs/troubleshooting/faq-archive-conflict.md
  类型 D 业务域整缺:N4 项
    - 业务域「产品市场」(docs/modules/产品市场/ 不存在)
```

---

### Phase 1.3:用户审议(4 选项 + 类型 D 单独 2 选项)

类型 A 和类型 C 按"一批 3 项"分批呈现给用户(防疲劳)。每项使用 AskUserQuestion 提供 4 选项:

```yaml
question: "📚 docs 待回填(1/3)<path>\n\n本次 change spec 与该 docs 存在 N 处冲突:\n  - <冲突描述>\n\n如何处理?"
multiSelect: false
options:
  - label: "我口述如何改,你来写"
    description: "由你描述关键变更点,AI 落盘 markdown,落盘前你再确认一次"
  - label: "你提议改写方案,我审完确认(推荐)"
    description: "AI 直接生成完整 diff,你 [y]/[n]/[m] 确认;适合大多数场景"
  - label: "这次先跳过,挂 [STALE] 标记下次改"
    description: "在 docs 顶部加警示注释,下次同文件被审议时优先提示;archive 仍可继续"
  - label: "误报(spec 改动与本 docs 无关)"
    description: "请简述误判理由;写入 metadata.yaml.docs_sync.skipped;连 3 次同 path 误报后自动跳过"
```

**[2] 选项 SHALL 标注 "(推荐)"**——避免空白页恐惧,用户改起来比从零写快。

#### 一批 3 项防疲劳

每批审完后,弹 AskUserQuestion:

```yaml
question: "已审完第 N 批(3 项)。剩余 M 项待审。如何继续?"
multiSelect: false
options:
  - label: "继续审下一批"
    description: "再审 3 项"
  - label: "全部已审完,进入回填执行"
    description: "其余 M 项默认按 [3] 暂缓挂 STALE 处理"
  - label: "暂缓 archive,我去手动改"
    description: "立即终止 Step 1,不进入 Step 2;待你手动整理后重跑"
```

#### 类型 D 业务域整缺单独 2 选项(不含"AI 写")

```
❌ 业务域骨架缺失:

  metadata.yaml.business_domain 含「产品市场」,但 docs/modules/产品市场/ 不存在。
  AI 不会自动创建目录(按 v3 铁律 SHALL NOT 1)。

  请在另一个 commit 中手工建目录骨架:

    mkdir -p docs/modules/产品市场/{api,core-flows}
    touch docs/modules/产品市场/INDEX.md
    touch docs/modules/产品市场/00-overview.md
    touch docs/modules/产品市场/api/INDEX.md
    touch docs/modules/产品市场/core-flows/INDEX.md

  完成后请重跑:/tcsc:archive-pipeline <change-name>
```

```yaml
question: "如何处理业务域「产品市场」?"
multiSelect: false
options:
  - label: "我已知此情况,跳过本业务域回填,继续 archive"
    description: "AI 在 docs_sync.domain_skeleton_required 记录;不计入 sync_completeness 分母"
  - label: "暂缓 archive,我先去手工建目录骨架,回头重跑"
    description: "立即终止 Step 1"
```

**SHALL NOT 提供 "AI 自动 mkdir" 选项**——任何形式都不行。

#### 用户选 [3] 暂缓挂 STALE

AI 在该 docs 文件 frontmatter 后插入 HTML 注释 + 文件首段警示(详见后文 [STALE] 标记规范),并在 `metadata.yaml.docs_sync.stale` 记录该路径。

#### 用户选 [4] 误报记录

AI 在 `metadata.yaml.docs_sync.skipped` 写入 `{path: ..., reason: <用户简述>}`。同 path 连续 3 次被标"误报" → AI MUST 在下次自动跳过该 path(无需再问用户)。

---

### Phase 1.4:回填执行(4 步路径校验 + [y]/[n]/[m] 二次确认)

每次 AI 准备写一个 docs 文件前,**MUST** 先跑下面这段 4 步校验:

```bash
target_path="$1"   # 如 docs/modules/产品市场/api/api-create-snapshot.md

# 校验 1:路径在 docs/ 下
[[ "$target_path" =~ ^docs/ ]] || { echo "[FAIL] 不在 docs/ 下,拒写"; exit 1; }

# 校验 2:父目录存在(AI 不创建目录)
parent_dir=$(dirname "$target_path")
[ -d "$parent_dir" ] || { echo "[FAIL] 父目录 $parent_dir 不存在,AI 不创建目录"; exit 1; }

# 校验 3:路径白名单匹配(9 类白名单;实现上用多个 glob pattern 表达)
case "$target_path" in
  docs/architecture/*.md \
  | docs/api/*.md \
  | docs/api/*/*.md \
  | docs/guides/*.md \
  | docs/modules/*/*.md \
  | docs/modules/*/api/*.md \
  | docs/modules/*/core-flows/*.md \
  | docs/reviews/*.md \
  | docs/troubleshooting/*.md \
  | docs/INDEX.md \
  | docs/*/INDEX.md \
  | docs/modules/*/INDEX.md \
  | docs/modules/*/*/INDEX.md)
    echo "[OK] 路径白名单匹配,可写"
    ;;
  *)
    echo "[FAIL] 路径不在白名单内,拒写:$target_path"
    exit 1
    ;;
esac

# 校验 4:父目录"业务域"是否真实存在
if [[ "$target_path" =~ ^docs/modules/([^/]+)/ ]]; then
  domain="${BASH_REMATCH[1]}"
  [ -d "docs/modules/$domain" ] || { echo "[FAIL] 业务域 docs/modules/$domain 不存在"; exit 1; }
fi
```

任意一条 FAIL → AI 跳过该文件 + 在 `metadata.yaml.docs_sync.skipped` 记录 `{path, reason: "<校验项> FAIL"}`,**不阻塞**整体 Step 1 流程。

#### 二次确认 [y]/[n]/[m]

4 步全过后,AI 渲染最终 markdown 内容(含 frontmatter)给用户,提示:

```
请确认以下回填内容(target: docs/modules/产品市场/api/api-create-snapshot.md):

---
knowledge-id: api-create-snapshot
title: CreateProductVersionSnapshot 接口
class: api
owner: <git config user.name>
last-updated: 2026-05-29
---

# CreateProductVersionSnapshot 接口
...

[y] 确认写盘
[n] 放弃本次回填(自动跳过 + 记 skipped)
[m] 我自己改,把内容贴回来
```

- 选 `y` → AI 写盘 + 记 `docs_sync.backfilled` 或 `docs_sync.created`
- 选 `n` → 跳过 + 记 `docs_sync.skipped {reason: "用户拒绝"}`
- 选 `m` → AI 等待用户粘贴最终内容,然后写盘 + 记 `mode: user-dictated`

#### frontmatter 5 必填模板(对齐 4020356477 §四)

| 字段 | 必填 | 说明 |
|---|---|---|
| `knowledge-id` | ✅ | 全仓唯一 ID,推荐 `<class>-<slug>`(如 `rule-archive-pipeline`) |
| `title` | ✅ | 文档标题(中文) |
| `class` | ✅ | 6 类之一:`rule` / `flow` / `api` / `faq` / `review` / `overview` |
| `owner` | ✅ | 默认取 `git config user.name`;用户可改 |
| `last-updated` | ✅ | ISO 日期(YYYY-MM-DD) |

---

### [STALE] 标记规范(用户选 [3] 暂缓时)

在 docs 文件 frontmatter **后**插入 HTML 注释 + 文件首段警示模板:

```markdown
---
knowledge-id: api-create-snapshot
title: CreateProductVersionSnapshot 接口
class: api
owner: binxiong
last-updated: 2026-05-29
---

<!-- [STALE] marked-at: 2026-05-29; reason: change <change-id> 的 spec 修改了
     字段表但本次 archive 未回填(用户主动选择暂缓) -->
> ⚠️ **本文档可能已过时**。最新 spec 见 `openspec/changes/archive/<YYYY-MM-DD>-<change-id>/`。
> 上次回填确认:YYYY-MM-DD。本次跳过原因:用户主动选择暂缓。

# <原文件标题保持不动>
...
```

下次同一文件再次进入 Phase 1.3 审议时,AI 看到 `[STALE]` 标记会**优先弹出**到审议队列前(技术债优先消化)。

---

### Phase 1.5:metadata.yaml.docs_sync 沉淀(schema v2)

Step 1 全部审议 + 回填执行完成后,AI MUST 在 `openspec/changes/<change-name>/metadata.yaml` 写入或更新 `docs_sync:` 段:

```yaml
docs_sync:
  performed_at: 2026-05-29T10:45:00+08:00     # ISO8601
  backfilled:                                  # 类型 A 已回填
    - path: docs/guides/rule-archive-pipeline.md
      knowledge-id: rule-archive-pipeline
      mode: ai-proposed                        # ai-proposed / user-dictated / merged
  created:                                     # 类型 C 新建(白名单 + 父目录存在)
    - path: docs/modules/产品市场/api/api-foo.md
      knowledge-id: api-foo
      mode: user-dictated
  stale:                                       # 类型 A 用户选 [3] 暂缓
    - path: docs/troubleshooting/faq-x.md
      knowledge-id: faq-x
      stale_marked_at: 2026-05-29T10:42:00+08:00
      reason: 用户主动选择暂缓
  skipped:                                     # 类型 A/C 误报或路径校验 FAIL
    - path: docs/api/foo.md
      reason: 该 API 已废弃,不需要更新 docs
  domain_skeleton_required:                    # ★ 类型 D 引导项(v3 新增)
    - domain: 产品市场
      reason: business_domain 含此域但 docs/modules/产品市场/ 不存在
      action: 用户已确认跳过本业务域回填;待建目录后下一 change 补
  sync_completeness: "80%"                    # 计算公式见下
```

#### sync_completeness 计算公式

```
分子 = len(backfilled) + len(created) + 0.6 * len(stale)
分母 = len(backfilled) + len(created) + len(stale)

# 注意:skipped 与 domain_skeleton_required **不计入分母**——它们是
# 用户主动判定为"无需回填"或"暂时无目录",不应影响完成度

# 除零保护:分母为 0(所有项均为 skipped/domain_skeleton_required)时
# sync_completeness = "N/A"(本次无可评分项)
```

stale 算 60% 权重(用户已主动标记技术债,不算完全失败)。

#### 老 change 缺 docs_sync 段时自动补

```python
import yaml, os
metadata_path = f"{CHANGE_DIR}/metadata.yaml"
if os.path.exists(metadata_path):
    d = yaml.safe_load(open(metadata_path)) or {}
    if "docs_sync" not in d:
        d["docs_sync"] = {}
        # 写回时保留原有字段顺序
        ...
```

老 change(v1.4.0 之前)缺 `docs_sync` 段时 AI SHALL 自动追加 `docs_sync: {}` 空段,**不报字段缺失错误**(向后兼容)。

---

### Step 1 v3 铁律(仅 docs/ 子树范围)

⚠️ **范围严格限定**:本铁律仅守护 `docs/` 子树。`openspec/`、`.codebuddy/`、`.claude/`、`skills/`、源码目录等**不在本铁律范围**——AI 在 archive Phase 1 之外的命令该建目录建目录、该建文件建文件,按各自命令模板的既有约束走。

#### 4 个 SHALL NOT(仅适用于 docs/ 子树)

| # | 约束 |
|---|---|
| **SHALL NOT 1** | AI 在 archive Phase 1 中 SHALL NOT 在 `docs/` 下创建任何新目录(含 mkdir / mkdir -p / 任何等效操作) |
| **SHALL NOT 2** | AI SHALL NOT 写入 `docs/` 子树中白名单之外的路径 |
| **SHALL NOT 3** | AI SHALL NOT 改 `docs/_exploration/` 等用户自定义分组(视为只读) |
| **SHALL NOT 4** | AI SHALL NOT 重命名 / 删除 / 移动 `docs/` 下任何已存在的 markdown 文件 |

#### 3 个 SHALL(仅适用于 docs/ 子树)

| # | 约束 |
|---|---|
| **SHALL 1** | AI 在 `docs/` 下写入前 MUST 校验目标路径的父目录已存在;不存在 → 进入用户引导,AI 不动手 |
| **SHALL 2** | AI 在 `docs/` 下写入前 MUST 二次确认([y]/[n]/[m]) |
| **SHALL 3** | AI 在 `docs/` 下新建文件时 MUST 严格遵循 4020356477 §五 6 类 frontmatter 模板 |

#### 不受铁律约束的合法 mkdir 场景

| 命令 / 阶段 | 行为 | 理由 |
|---|---|---|
| `openspec-installer` Step 6d | `mkdir -p docs/{architecture,api,guides,modules,reviews,troubleshooting}` 5 顶级骨架 | 项目初始化建立"格子"本身;本铁律守护的是"格子建好之后不要乱加" |
| 用户手工 `mkdir -p docs/modules/<新业务域>/{api,core-flows}` | 用户主动建业务域骨架 | 用户对自己的目录架构有完全控制权 |
| AI 在 `.codebuddy/` / `.claude/` / `openspec/` / 源码目录的 mkdir | 不在 docs/ 范围 | 本铁律仅管 docs/ |

---

### Step 1 9 类白名单完整清单

AI 在 `docs/` 子树**唯一可写区**如下。注意:这是 9 类白名单,实现脚本中会用多个 glob pattern 表达这些类别:

| # | glob | 文件命名约束 |
|---|---|---|
| 1 | `docs/architecture/*.md` | `adr-*.md` / `system-design.md` 等 |
| 2 | `docs/api/*.md` 或 `docs/api/<已存在子目录>/*.md` | 自由命名(看仓库习惯) |
| 3 | `docs/guides/*.md` | `rule-*.md` / `getting-started.md` 等 |
| 4 | `docs/modules/<已存在域>/*.md` | `00-overview.md` / `INDEX.md` |
| 5 | `docs/modules/<已存在域>/api/*.md` | `api-*.md` |
| 6 | `docs/modules/<已存在域>/core-flows/*.md` | `flow-*.md` |
| 7 | `docs/reviews/*.md` | `review-*.md` |
| 8 | `docs/troubleshooting/*.md` | `faq-*.md` |
| 9 | 各级 `INDEX.md`(`docs/INDEX.md` / `docs/*/INDEX.md` / `docs/modules/*/INDEX.md` / `docs/modules/*/*/INDEX.md`) | 仅当索引已存在时更新 |

**所有不在白名单内的路径,AI MUST 拒绝写入**(校验 3 FAIL),进入"用户引导"分支或记 `skipped`。

---

## Step 2:调起 `openspec archive`

前置步骤全过后(Step 0 通过、Step 0.5 测试守门兜底通过或被标记 `[SKIPPED]`,且 Step 1 已完成或被优雅跳过),执行真正的归档:

```bash
openspec archive <change-name> --yes 2>&1
```

- `--yes` 跳过 OpenSpec CLI 的交互式确认
- 归档操作 SHALL 把 `openspec/changes/<change-name>/` 整个目录移到 `openspec/changes/archive/<YYYY-MM-DD>-<change-name>/`
- 同时把 specs delta(ADDED / MODIFIED / REMOVED Requirements)应用到 `openspec/specs/`
- Step 1 写入的 `metadata.yaml.docs_sync` 段会**跟随 change 目录一起被归档**(0 改造,与既有 metadata.yaml 走同一通道)

如果 archive 命令返回错误(如 change 不存在 / specs delta 冲突):
- 报错 → 终止本流程,**不进入 Step 3**
- 输出 archive 命令的完整 stderr 给用户排查

---

## Step 3:INDEX 语义化更新

archive 成功后,AI MUST 更新两个 INDEX.md 文件。**这一步是 AI 任务,不是机械 shell**——需要语义理解 + 表格生成。

### Step 3-1:更新 `openspec/specs/INDEX.md`

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

### Step 3-2:更新 `openspec/changes/archive/INDEX.md`

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

### Step 3-3:汇报完成

4 步 + 测试兜底全部完成后输出汇总:

```
✅ 归档完成

Change: <change-name>
归档位置: openspec/changes/archive/<YYYY-MM-DD>-<change-name>/

测试守门: pass | skipped
docs 回填: backfilled=N1 / created=N2 / stale=N3 / skipped=N4 / sync_completeness=XX%
specs 索引: openspec/specs/INDEX.md(已更新)
archive 索引: openspec/changes/archive/INDEX.md(已更新)
```

---

## 命令独立可用,不依赖 config.yaml

本命令的全部行为 SHALL NOT 依赖 `openspec/config.yaml` 中的任何字段。即使项目没有装 `openspec-installer`、即使 `openspec/config.yaml` 缺失、即使 bridge rule 不存在,本命令仍可被用户主动调起并完成 4 步 + 测试兜底流程(前提仅为 `openspec` CLI 已安装且当前在 git 工作树内)。

如果 `openspec` CLI 未安装,Step 2 会返回错误,本命令会在该步终止——这是 OpenSpec CLI 的边界,不属于本命令的失败。

---

## 兜底:OpenSpec 未初始化的项目

如果当前目录没有 `openspec/` 目录(用户未运行 `openspec init`):
- Step 2 的 `openspec archive` 会报错"not in an openspec project"
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
- `/tcsc:archive-pipeline <change-name>` → 用户决定归档时执行(`rules.archive` 触发);archive 的硬性前置以 Step 0 tasks 勾选检查 + Step 0.5 测试守门兜底为准

两个命令同代际命名空间、同分发模式、同流程风格。完整工作流:

```
/opsx:propose → /opsx:continue × N → /opsx:apply
                                          ↓ (rules.apply 触发)
                                      /tcsc:review-pipeline

当 tasks.md 全 [x] 且用户决定归档时:
/opsx:archive
      ↓ (rules.archive v3 触发)
/tcsc:archive-pipeline ← 本命令
      ↓
INDEX 自动更新
```

注意:`review-pipeline` 是质量保障流程;archive 的硬性前置以本命令 Step 0 的 tasks 勾选检查与 Step 0.5 测试守门兜底为准,不依赖 MR / push / review。
