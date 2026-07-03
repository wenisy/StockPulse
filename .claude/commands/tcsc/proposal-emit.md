---
name: "TCSC: Proposal Emit"
description: "OpenSpec /opsx:propose 完成后产出 metadata.yaml 的 5 阶段命令——参数解析 → 返修计数 → knowledge_refs 三源合并去重抽取 → business_domain AskUserQuestion 多选确认 → metadata.yaml 写盘 + 自我校验。当用户说「生成提案元数据」「补 metadata.yaml」「跑 proposal-emit」或由 rules.proposal v1 自动调起时使用此命令；产出 openspec/changes/<change-name>/metadata.yaml,作为知识库使用效果统计 v1（4 指标:提案一次通过率 / 返修次数 / Step 2 业务类问题数 / 知识库命中率）的数据源。schema 严格对齐 iWiki 4020283842 §四。"
argument-hint: "<change-name>"
---

`/opsx:propose` 完成后产出 `metadata.yaml` 的项目级斜杠命令。本命令做**参数解析 + 5 阶段产出 + 自我校验**；schema 严格对齐 iWiki 4020283842《业务知识库效果统计口径》§四,字段含 `change_id` / `business_domain` / `knowledge_refs` / `propose_rounds` / `step2_review_status` / `created_at` / `updated_at`。

与 `/tcsc:review-pipeline` / `/tcsc:archive-pipeline` 同代际命名空间、同分发模式(项目级斜杠命令双胞胎部署到 `.codebuddy/commands/tcsc/` + `.claude/commands/tcsc/`)。

**关键约束**:
- 本命令 SHALL NOT 修改 OpenSpec CLI 内置命令(`/opsx:*`)的任何行为
- 本命令 SHALL NOT 阻塞 OpenSpec 官方 propose 主流程的完成——Phase 5 自我校验失败时只醒目提示用户,允许用户后续手动重跑修复
- `metadata.yaml` 寄居 `openspec/changes/<change-name>/`,跟 `.pair-context.yml` 同款生命周期,OpenSpec `archive` 命令自动带走,0 改造

---

**调用方式**:`/tcsc:proposal-emit <change-name>` 或由 `rules.proposal` v1 自动触发。

## Phase 1:参数解析

从 `$ARGUMENTS` 获取 `<change-name>`(kebab-case,必填)。

```bash
CHANGE_NAME="<从 $ARGUMENTS 取得>"
```

如果未提供:

```bash
openspec list --json
```

通过 **AskUserQuestion tool** 让用户从活跃 change 列表中选择。**SHALL NOT 自动选择默认值**(即使列表中只有 1 个活跃 change,也要求用户显式确认),原因:`metadata.yaml` 是统计数据源,误写会污染口径。

确定 `CHANGE_NAME` 后,先确认 change 目录存在:

```bash
CHANGE_DIR="openspec/changes/${CHANGE_NAME}"

if [ ! -d "$CHANGE_DIR" ]; then
    echo "[FAIL] $CHANGE_DIR 不存在"
    echo "请先执行 /opsx:propose 或 /opsx:new 创建变更后再运行本命令"
    exit 1
fi

echo "[INFO] Change 目录: $CHANGE_DIR"
```

`CHANGE_DIR` 不存在 → 阻止流程,提示用户先创建 change;存在 → 进入 Phase 2。

---

## Phase 2:返修计数

读取已有 `metadata.yaml`(如存在),累加 `propose_rounds`,保留 `created_at` 与 `step2_review_status`,刷新 `updated_at`。

```bash
METADATA="$CHANGE_DIR/metadata.yaml"
NOW=$(date -Iseconds 2>/dev/null || python3 -c "import datetime; print(datetime.datetime.now().astimezone().isoformat(timespec='seconds'))")

if [ -f "$METADATA" ]; then
    # 已存在:propose_rounds += 1,保留 created_at 与 step2_review_status
    OLD_ROUNDS=$(python3 -c "import yaml; d=yaml.safe_load(open('$METADATA')); print(d.get('propose_rounds', 0))")
    ROUNDS=$((OLD_ROUNDS + 1))
    CREATED_AT=$(python3 -c "import yaml; d=yaml.safe_load(open('$METADATA')); print(d.get('created_at', ''))")
    [ -z "$CREATED_AT" ] && CREATED_AT="$NOW"
    # 保留 step2_review_status 原值;若读不到合法 enum 则 fallback pending
    STEP2_STATUS=$(python3 -c "import yaml; d=yaml.safe_load(open('$METADATA')); s=d.get('step2_review_status', ''); print(s if s in ('pending','pass','return_to_step1') else 'pending')")
    echo "[INFO] metadata.yaml 已存在,propose_rounds: $OLD_ROUNDS → $ROUNDS,created_at 保留:$CREATED_AT,step2_review_status 保留:$STEP2_STATUS"
else
    # 首次:propose_rounds = 1,created_at = 当前时间,step2_review_status = pending
    ROUNDS=1
    CREATED_AT="$NOW"
    STEP2_STATUS="pending"
    echo "[INFO] metadata.yaml 不存在,首次产出,propose_rounds=1,created_at=$CREATED_AT,step2_review_status=pending"
fi

UPDATED_AT="$NOW"
export ROUNDS CREATED_AT UPDATED_AT STEP2_STATUS
echo "[INFO] updated_at: $UPDATED_AT"
```

**为什么 step2_review_status 必须保留**:此字段由后续 `/tcsc:propose-review` 命令(change 2 引入)在用户 review proposal 后写入 `pass` 或 `return_to_step1`,作为知识库使用效果统计 ② 提案返修次数 与 ③ Step 2 业务类审查问题数 两个指标的依据。`/tcsc:proposal-emit` 重跑场景下若把已审 `pass`/`return_to_step1` 强制重置为 `pending`,会污染口径。本命令 SHALL NOT 触碰其值(除首次写 `pending` 外)。

**校验点(Phase 5 会复查)**:
- `ROUNDS >= 1`
- `CREATED_AT <= UPDATED_AT`(首次产出时两者相等;重跑时 `CREATED_AT` 是历史值,必小于等于当前)
- ISO8601 格式合法(date -Iseconds 与 Python 兼容产出均合法)
- `STEP2_STATUS` 是合法 enum (pending|pass|return_to_step1)

如读取已有 `metadata.yaml` 失败(YAML 损坏 / 字段类型异常),输出 `[WARN] metadata.yaml 读取失败,按首次产出处理` 并将 `ROUNDS=1`、`CREATED_AT=$NOW`、`STEP2_STATUS=pending` 兜底,不阻塞流程。

---

## Phase 3:knowledge_refs 三源合并去重抽取

针对 `proposal.md` / `design.md` / `tasks.md` 三个文件(以及 `specs/**/*.md`),按以下 3 个独立来源抽取知识库引用,合并后去重,产出 `KNOWLEDGE_REFS` 列表。

### 源 1:行内锚点引用

正则:`(rule|flow|api|faq|review|overview)-[a-z0-9-]+(#[a-z0-9-]+)?`

含义:6 类 frontmatter 锚点(对齐 iWiki 4020356477 业务知识库模板),含可选 `#子锚点`(如 `rule-gateway#r2`)。

示例命中:`rule-gateway#r2`、`flow-snapshot-create-and-publish`、`api-search-v1`、`faq-mcp-token-rotate`、`review-coding-style`、`overview-billing-domain`。

```bash
SOURCE1=$(grep -hoE '(rule|flow|api|faq|review|overview)-[a-z0-9][a-z0-9-]*(#[a-z0-9-]+)?' \
    "$CHANGE_DIR/proposal.md" "$CHANGE_DIR/design.md" "$CHANGE_DIR/tasks.md" 2>/dev/null \
    | sort -u || true)
```

### 源 2:markdown 链接到 docs/**/*.md

匹配 markdown link 中 path 为 `docs/...md`,读目标文件 frontmatter 的 `knowledge-id` 字段。

```bash
# 抽取 markdown 链接中所有 docs/ 路径
DOCS_LINKS=$(grep -hoE '\(docs/[^)]+\.md\)' \
    "$CHANGE_DIR/proposal.md" "$CHANGE_DIR/design.md" "$CHANGE_DIR/tasks.md" 2>/dev/null \
    | sed 's/^(\(.*\))$/\1/' \
    | sort -u || true)

SOURCE2=""
for DOC_PATH in $DOCS_LINKS; do
    if [ -f "$DOC_PATH" ]; then
        # 抽取 frontmatter 中 knowledge-id 字段(YAML 头部 --- ... ---)
        KID=$(awk '/^---$/{f=!f; next} f && /^knowledge-id:/{gsub(/^knowledge-id:[[:space:]]*/, ""); gsub(/[[:space:]"]/, ""); print; exit}' "$DOC_PATH" 2>/dev/null)
        [ -n "$KID" ] && SOURCE2="$SOURCE2"$'\n'"$KID"
    fi
done
SOURCE2=$(echo "$SOURCE2" | grep -v '^$' | sort -u || true)
```

如目标 `docs/...md` 不存在或缺 `knowledge-id` frontmatter 字段,该来源跳过(不报错,只记录到 `[INFO]` 日志)。

### 源 3:"## 相关规则" / "## 相关流程" / "## 相关文档" 段引用

扫描这些段落内的 link 与 锚点引用。

AI **应直接读 proposal.md / design.md / tasks.md 内容**,定位 `## 相关规则` / `## 相关流程` / `## 相关文档` 段(直到下一个二级标题为止),再次抽取该段内的:
- 行内锚点(同源 1 正则)
- markdown 链接到 `docs/**/*.md`(同源 2,读 frontmatter knowledge-id)

把命中的 ID 累计到 `SOURCE3`。

> 实现提示:由于该段落定位需要语义理解,AI 可用 Read 直接读三个文件,定位段标题,再 grep 段内文本;或用 awk 按 `^## ` 切块取目标块。优先用 AI 语义提取——脚本拼接难覆盖各种空白/层级写法。

### 合并去重

```bash
KNOWLEDGE_REFS=$(printf "%s\n%s\n%s\n" "$SOURCE1" "$SOURCE2" "$SOURCE3" | grep -v '^$' | sort -u)
KNOWLEDGE_REFS_COUNT=$(echo "$KNOWLEDGE_REFS" | grep -v '^$' | wc -l)
echo "[INFO] knowledge_refs 抽取到 $KNOWLEDGE_REFS_COUNT 项(三源去重后)"
```

**去重规则**:
- 相同 ID 不重复出现两次(不论来自哪个源)
- `rule-gateway` 与 `rule-gateway#r2` **保留两条**(后者带子锚点,语义不等价)
- 如果同一 ID 同时出现"无锚点"和"有锚点"两个变体,**两条都保留**(用户 review 时可裁剪)

---

## Phase 4:business_domain AskUserQuestion 多选确认(必走)

业务域(`business_domain`)永远走用户确认,即使 AI 预选 100% 正确。理由:业务域是统计 ④(知识库命中率)的分组维度,错一个就影响月报。

### Step 4-1:AI 预选

扫 `proposal.md` / `design.md` 中出现频次最高的 `docs/modules/<域>/` 路径:

```bash
PRESELECT_RAW=$(grep -hoE 'docs/modules/[^/]+/' \
    "$CHANGE_DIR/proposal.md" "$CHANGE_DIR/design.md" 2>/dev/null \
    | sed 's|^docs/modules/||; s|/$||' \
    | sort | uniq -c | sort -rn \
    | awk '{print $2}' \
    | grep -v '^_template$' || true)
PRESELECTED=$(echo "$PRESELECT_RAW" | grep -v '^$')
echo "[INFO] AI 预选业务域: $(echo $PRESELECTED | tr '\n' ',')"
```

### Step 4-2:列出全部候选业务域

```bash
ALL_DOMAINS=$(ls -d docs/modules/*/ 2>/dev/null \
    | sed 's|^docs/modules/||; s|/$||' \
    | grep -v '^_template$' \
    | sort)
echo "[INFO] 全部候选业务域: $(echo $ALL_DOMAINS | tr '\n' ',')"
```

如 `docs/modules/` 不存在或只含 `_template/` → `ALL_DOMAINS` 为空,直接走 unknown 分支(见 Step 4-4)。

### Step 4-3:AskUserQuestion 多选

构造 AskUserQuestion 调用:

```
question: "请确认本次提案【add-rules-proposal-and-emit-command】涉及的业务域(多选)"
multiSelect: true
options:
  - 对每个 ALL_DOMAINS 中的域 D,生成一个 option:
      label: "<D>"
        - 若 D 在 PRESELECTED 集合中,label 后追加 "(AI 预选)"
      description: "<读 docs/modules/<D>/00-overview.md 中『业务定位』段首句>;读取失败则给出『暂无简介』>"
  - 兜底 option(必加):
      label: "unknown / 跨多个未列出业务域"
      description: "无对应业务域或新业务域待补建 docs/modules/<域>/"
```

**业务定位首句抽取(可选优化)**:
```bash
get_overview_intro() {
    local domain="$1"
    local f="docs/modules/$domain/00-overview.md"
    if [ -f "$f" ]; then
        # 找 "## 业务定位" 段首句
        awk '/^## 业务定位/{f=1; next} f && /^## /{exit} f && NF>0 {print; exit}' "$f"
    else
        echo "暂无简介"
    fi
}
```

> **多选规则**:用户可同时勾选多个域 + `unknown`(罕见但允许);也可只勾 `unknown`。

### Step 4-4:解析用户答复

```
- BUSINESS_DOMAINS = 用户最终勾选结果(list)
- 若 BUSINESS_DOMAINS == ["unknown"]:
    - 输出: [INFO] 用户选择 unknown,后续请补建 docs/modules/<域>/
    - knowledge_refs 不再强制 >= 1(放宽,见 Phase 5 校验)
- 若 BUSINESS_DOMAINS 非空且不含 unknown:
    - 标准路径,Phase 5 强制要求 knowledge_refs >= 1
- 若 ALL_DOMAINS 为空:
    - 跳过 AskUserQuestion,直接 BUSINESS_DOMAINS = ["unknown"]
    - 输出: [INFO] 项目无 docs/modules/<域>/,本次默认 unknown
```

---

## Phase 5:metadata.yaml 写盘与自我校验

### Step 5-1:构建 metadata.yaml 内容

schema(严格对齐 iWiki 4020283842 §四):

```yaml
change_id: <change-name>
business_domain:                 # list,即使只 1 个域也用数组
  - <域 1>
  - <域 2>
knowledge_refs:                  # list,三源去重后 ID 列表
  - <id 1>
  - <id 2>#<anchor>
propose_rounds: <integer ≥1>
step2_review_status: pending     # pending | pass | return_to_step1
created_at: <ISO8601 string>
updated_at: <ISO8601 string>
```

写盘建议用 Python(避免 shell 引号转义陷阱;同时手工拼字段顺序,跳过 PyYAML `sort_keys` kwarg 在旧版本上的兼容问题):

```bash
python3 - <<'PY'
import os

change_id = os.environ.get("CHANGE_NAME")
business_domains = [d.strip() for d in os.environ.get("BUSINESS_DOMAINS", "").split(",") if d.strip()] or ["unknown"]
knowledge_refs = [r.strip() for r in os.environ.get("KNOWLEDGE_REFS", "").split("\n") if r.strip()]
rounds = int(os.environ.get("ROUNDS", "1"))
created_at = os.environ.get("CREATED_AT", "")
updated_at = os.environ.get("UPDATED_AT", "")
# step2_review_status 由 Phase 2 决定(首次写 pending;重跑保留原值)
step2_status = os.environ.get("STEP2_STATUS", "pending")
if step2_status not in ("pending", "pass", "return_to_step1"):
    step2_status = "pending"

def yaml_str(s):
    """对字符串做 YAML safe 单行输出:用双引号 + 反斜杠转义保险"""
    if s is None:
        return "null"
    s = str(s)
    # 简单字符串(无特殊字符)直接裸出;含特殊字符时用双引号
    if any(c in s for c in ":#'\"\\n\\t\\r,&*!|>[]{}@`%") or s != s.strip() or not s:
        escaped = s.replace("\\\\", "\\\\\\\\").replace("\"", "\\\\\"")
        return '"' + escaped + '"'
    return s

lines = []
lines.append("change_id: " + yaml_str(change_id))
lines.append("business_domain:")
for d in business_domains:
    lines.append("  - " + yaml_str(d))
lines.append("knowledge_refs:")
if knowledge_refs:
    for r in knowledge_refs:
        lines.append("  - " + yaml_str(r))
else:
    lines[-1] = "knowledge_refs: []"
lines.append("propose_rounds: " + str(rounds))
lines.append("step2_review_status: " + step2_status)
lines.append("created_at: " + yaml_str(created_at))
lines.append("updated_at: " + yaml_str(updated_at))
# docs_sync: {} 预留空段（schema v2 向后兼容；archive Phase 3.5 执行后会写入实际值）
lines.append("docs_sync: {}")

content = "\n".join(lines) + "\n"
metadata_path = os.path.join("openspec", "changes", change_id, "metadata.yaml")
with open(metadata_path, "w") as f:
    f.write(content)
print("[INFO] 已写盘:" + metadata_path + " (step2_review_status=" + step2_status + ")")
PY
```

> **重跑场景**:首次写盘自动取 `step2_review_status: pending`;后续 `/tcsc:propose-review`(change 2)会改为 `pass` / `return_to_step1`。本命令在 Phase 2 已读取并保留 `step2_review_status` 原值,Step 5-1 写盘时透传——重跑产生的"返修"行为不会清零审查状态。

### Step 5-2:自我校验(7 项)

```bash
python3 - <<'PY'
import yaml, sys, os, re

p = os.path.join("openspec", "changes", os.environ["CHANGE_NAME"], "metadata.yaml")
d = yaml.safe_load(open(p))
errors = []

# ① change_id 是 string
if not isinstance(d.get("change_id"), str) or not d["change_id"]:
    errors.append("change_id 必须是非空 string")

# ② business_domain 是 list
if not isinstance(d.get("business_domain"), list) or not d["business_domain"]:
    errors.append("business_domain 必须是非空 list")

# ③ knowledge_refs 是 list
if not isinstance(d.get("knowledge_refs"), list):
    errors.append("knowledge_refs 必须是 list")

# ④ knowledge_refs 至少 1 项(business_domain != ["unknown"] 时强制)
if d.get("business_domain") != ["unknown"] and not d.get("knowledge_refs"):
    errors.append("business_domain 非 unknown 时,knowledge_refs 至少 1 项")

# ⑤ propose_rounds >= 1
if not isinstance(d.get("propose_rounds"), int) or d["propose_rounds"] < 1:
    errors.append("propose_rounds 必须是 >= 1 的 integer")

# ⑥ step2_review_status enum
if d.get("step2_review_status") not in ("pending", "pass", "return_to_step1"):
    errors.append("step2_review_status 必须是 pending|pass|return_to_step1")

# ⑦ created_at / updated_at ISO8601 + created_at <= updated_at
# 用 regex 兼容 Python 3.6/3.7+(避开 fromisoformat 在 3.6 不可用的问题)
ISO8601_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}"
    r"(?:\.\d+)?"
    r"(?:Z|[+-]\d{2}:?\d{2})?$"
)
ca_str = d.get("created_at", "")
ua_str = d.get("updated_at", "")
if not (isinstance(ca_str, str) and ISO8601_RE.match(ca_str)):
    errors.append("created_at 不是合法 ISO8601 字符串")
if not (isinstance(ua_str, str) and ISO8601_RE.match(ua_str)):
    errors.append("updated_at 不是合法 ISO8601 字符串")
# 字符串字典序对 ISO8601 等价于时间序(同时区或都带时区时成立)
if isinstance(ca_str, str) and isinstance(ua_str, str) and ca_str and ua_str and ca_str > ua_str:
    errors.append("created_at 不能晚于 updated_at")

if errors:
    print("[FAIL] metadata.yaml 自我校验失败:")
    for e in errors:
        print("  • " + e)
    print("\n[HINT] 你可以手动修复 metadata.yaml,或重跑 /tcsc:proposal-emit " + os.environ["CHANGE_NAME"])
    sys.exit(2)
else:
    print("[OK] metadata.yaml 自我校验通过(7/7)")
PY
```

校验结果分支:
- 通过(`[OK]`)→ 输出最终汇总(见 Step 5-3)
- 失败(`[FAIL]`)→ 醒目提示用户,**不阻塞 OpenSpec 主流程**;用户可手动修复或重跑本命令。
- 异常退出码(`exit 2`)仅用于命令本身,SHALL NOT 影响调用方 `/opsx:propose` 的成功状态。

### Step 5-3:汇报完成

```
[OK] metadata.yaml 已写盘:
  路径:openspec/changes/<change-name>/metadata.yaml
  business_domain:[<域 1>, <域 2>]
  knowledge_refs:N 项
  propose_rounds:<rounds>
  step2_review_status:pending
  created_at:<...>
  updated_at:<...>

后续:用户 review proposal/design/tasks 后,可通过 /tcsc:propose-review(change 2 引入)审查并把 step2_review_status 标为 pass / return_to_step1;月底由 /tcsc:kb-stats(change 3 引入)聚合所有 metadata.yaml 产出 4 指标月报。
```

---

## 命令独立可用,不依赖 config.yaml

本命令的全部行为 SHALL NOT 依赖 `openspec/config.yaml` 中的任何字段。即使项目没有装 `openspec-installer`、即使 `openspec/config.yaml` 缺失、即使 bridge rule 不存在,本命令仍可被用户主动调起并完成 5 阶段流程(前提仅为当前在 git 工作树内 + Python 3 + PyYAML 可用)。

如果 PyYAML 未安装,Phase 5 会报 `ImportError`,本命令在写盘阶段中止——这是依赖问题,不属于本命令的逻辑失败。提示用户 `pip install pyyaml`。

---

## 兜底:OpenSpec 未初始化的项目

如果当前目录没有 `openspec/changes/` 目录:
- Phase 1 的 change 目录检查会失败(`$CHANGE_DIR` 不存在)
- 本命令 MUST 输出:

```
❌ 当前目录不是 OpenSpec 项目,或还没创建任何 change。

请先运行:
  openspec init --tools codebuddy,claude --force
  /opsx:propose "你的需求描述"

或安装 openspec-installer:
  在 IDE 中说"安装 OpenSpec"或"初始化 OpenSpec 环境"
```

并终止流程。

---

## 与 review-pipeline / archive-pipeline 的协作关系

- `/opsx:propose <change-name>` → propose 完成后(`rules.proposal` v1 触发)→ `/tcsc:proposal-emit <change-name>` ← 本命令
- `/opsx:apply` → 编码完成后(`rules.apply` v3 触发)→ `/tcsc:review-pipeline <change-name>`
- `/opsx:archive` → 归档前(`rules.archive` v3 触发)→ `/tcsc:archive-pipeline <change-name>`

三个命令同代际命名空间、同分发模式、同 `1 行指针 + 主体下沉` 架构。完整工作流:

```
/opsx:propose
    ↓ (rules.proposal v1 触发)
/tcsc:proposal-emit          ← 本命令(产出 metadata.yaml)
    ↓
/opsx:continue × N
    ↓
/opsx:apply
    ↓ (rules.apply v3 触发)
/tcsc:review-pipeline        ← 质量保障流程

当 tasks.md 全 [x] 且用户决定归档时:
/opsx:archive
    ↓ (rules.archive v3 触发)
/tcsc:archive-pipeline
    ↓
metadata.yaml 随 change 目录一起被归档到 archive/<YYYY-MM-DD>-<change-name>/metadata.yaml
    ↓
/tcsc:kb-stats(change 3 引入)
聚合所有 metadata.yaml → 月报 4 指标
```

注意:`review-pipeline` 是质量保障流程;archive 的硬性前置以 archive-pipeline Step 0 的 tasks 勾选检查为准,不依赖 MR / push / review。

## 参考

- metadata.yaml schema v2（含 `docs_sync` 段）详见 `.codebuddy/commands/tcsc/archive-pipeline.md`（及对应 `.claude/commands/tcsc/archive-pipeline.md`）Phase 3.5。
