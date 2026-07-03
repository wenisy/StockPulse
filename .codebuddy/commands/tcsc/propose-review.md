---
name: "TCSC: Propose Review"
description: "OpenSpec /opsx:propose 完成后对 proposal/design/tasks 三件套做 5 维评分与 8 类问题分类，产出 review-result.yaml。当用户说「评审提案」「检查提案质量」「跑 propose-review」或由 rules.proposal v3 自动调起时使用。"
argument-hint: "<change-name>"
---

`/tcsc:propose-review` 是 OpenSpec 提案质量评审命令。本命令是**纯分析器**：读取 `proposal.md` / `design.md` / `tasks.md` / `specs/**/*.md` 与 `metadata.yaml`，执行 5 维评分 + 8 类问题分类，写入 `review-result.yaml`，并回写 `metadata.yaml.step2_review_status`。

**关键约束**：本命令 SHALL NOT 修改任何 OpenSpec artifact 文件（`proposal.md` / `design.md` / `specs/**/*.md` / `tasks.md`）。若评分不通过，只产出评审结果并提示用户重新修订。

---

## Phase 1：参数解析

从 `$ARGUMENTS` 获取 `<change-name>`（kebab-case，必填）。如果未提供：

```bash
openspec list --json
```

通过 **AskUserQuestion tool** 让用户从活跃 change 列表中选择。**SHALL NOT 自动选择默认值**。

确定 `CHANGE_NAME` 后，校验 change 目录存在：

```bash
CHANGE_NAME="<从 $ARGUMENTS 取得>"
CHANGE_DIR="openspec/changes/${CHANGE_NAME}"

if [ ! -d "$CHANGE_DIR" ]; then
    echo "[FAIL] $CHANGE_DIR 不存在"
    echo "请先执行 /opsx:propose 或 /opsx:new 创建变更后再运行本命令"
    exit 1
fi
```

---

## Phase 2：读取 metadata.yaml（拿上下文）

```bash
METADATA="$CHANGE_DIR/metadata.yaml"
export METADATA

if [ ! -f "$METADATA" ]; then
    echo "[FAIL] 未找到 $METADATA"
    echo "请先运行：/tcsc:proposal-emit $CHANGE_NAME"
    exit 1
fi

python3 - <<'PY'
import yaml, os
metadata = os.environ.get('METADATA', '')
d = yaml.safe_load(open(metadata)) or {}
print('[INFO] propose_rounds:', d.get('propose_rounds'))
print('[INFO] business_domain:', d.get('business_domain', []))
print('[INFO] knowledge_refs:', d.get('knowledge_refs', []))
PY
```

AI MUST 读取并使用：
- `propose_rounds` → 写入 `review_round`
- `business_domain` → 判断业务背景和影响域
- `knowledge_refs` → 判断是否引用了知识库

---

## Phase 3：5 维评分

读取：
- `$CHANGE_DIR/proposal.md`
- `$CHANGE_DIR/design.md`
- `$CHANGE_DIR/tasks.md`
- `$CHANGE_DIR/specs/**/*.md`

按以下 5 个维度评分。每个维度采用三档质量判定：
- **优秀**（基本清楚完整）= 100% 分
- **建议完善**（不清晰，或部分缺失）= 50% 分
- **建议返修**（完全缺失/完全错误）= 0% 分

> 注意：这里展示的是“质量判定”，不是风险等级。满分项 MUST 显示为“优秀”，不得再显示为“低”。

### 维度 1：背景明确（权重 10）

| 质量判定 | 得分 | 标准 |
|---|---:|---|
| 优秀 | 10 | `proposal.md` §Why 同时包含业务来源 + 问题描述 + 业务价值，并引用 ≥1 个 `docs/modules/<域>/` 业务文档 |
| 建议完善 | 5 | §Why 有内容但缺业务来源或问题二选一；或业务价值描述模糊；或未引用 docs/ |
| 建议返修 | 0 | §Why 缺失，或 < 30 字，或内容与 change 无关 |

### 维度 2：功能/非功能完整（权重 25）

| 质量判定 | 得分 | 标准 |
|---|---:|---|
| 优秀 | 25 | What changes 每条有“主语+动作+对象”精确表述；design 有 input/output/constraint；有异常分支 |
| 建议完善 | 12.5 | 有功能描述但缺约束或输出；或设计段只有流程无字段表；或虚词占比 > 40% |
| 建议返修 | 0 | What changes 全部虚词；或无任何字段/流程描述 |

### 维度 3：无歧义（权重 20）

| 质量判定 | 得分 | 标准 |
|---|---:|---|
| 优秀 | 20 | 无未定义术语 + 无模糊表述 + tasks 每条可定位到人/动作 |
| 建议完善 | 10 | 有 1-3 个模糊表述或未定义术语 |
| 建议返修 | 0 | > 3 个模糊表述贯穿全文 |

### 维度 4：需求边界（权重 25）

| 质量判定 | 得分 | 标准 |
|---|---:|---|
| 优秀 | 25 | 有 in-scope + out-of-scope + Impact 段列出所有受影响模块 |
| 建议完善 | 12.5 | in-scope 有但无 out-of-scope；或 Impact 段枚举不全 |
| 建议返修 | 0 | 无 in-scope/out-of-scope；或 Impact 段为空/只写“无” |

### 维度 5：验收标准（权重 20）

| 质量判定 | 得分 | 标准 |
|---|---:|---|
| 优秀 | 20 | 所有 Requirement 都有 ≥1 Scenario + 至少 1 个含失败路径 |
| 建议完善 | 10 | ≥50% Requirement 有 Scenario；或全部 scenario 只覆盖正常路径 |
| 建议返修 | 0 | 任何 Requirement 都没有 Scenario；或 specs 目录为空 |

### Phase 3 输出格式

```markdown
## 5 维评分

| 维度 | 权重 | 质量判定 | 得分 | 证据 |
|---|---:|---|---:|---|
| 背景明确 | 10% | 建议完善 | 5 | §Why 说明了问题但缺业务来源，未引用 docs/ |
| 功能/非功能完整 | 25% | 优秀 | 25 | What changes 逐条精确，design 有字段表+流程图 |
| 无歧义 | 20% | 优秀 | 20 | 全文无模糊表述，tasks 每条可定位 |
| 需求边界 | 25% | 建议返修 | 0 | 无 in-scope/out-of-scope，Impact 为空 |
| 验收标准 | 20% | 建议完善 | 10 | specs 有 Scenario 但只覆盖正常路径 |

总分：60/100 → 建议完善（result: pass，允许 apply；建议补强后再进入实现）
```

---

## Phase 4：8 类问题分类

对 Phase 3 中每个“建议完善”或“建议返修”的维度，归类到以下 8 类标签：

- 业务背景不足
- 范围边界不清
- 接口规则缺失
- 状态流转遗漏
- 兼容性风险
- 上下游影响遗漏
- 异常场景缺失
- 任务拆解不完整

每类问题输出格式：

```yaml
- type: 业务背景不足
  severity: high    # high / medium，对应 建议返修 / 建议完善
  evidence: "proposal.md §Why 仅 32 字且未引用 docs/modules/"
  suggestion: "在 §Why 补充业务背景，引用 docs/modules/<域>/00-overview.md"
```

严重性映射：
- 判定 **建议返修** → `severity: high`
- 判定 **建议完善** → `severity: medium`
- 判定 **优秀** → 不生成 issue

---

## Phase 5：写 review-result.yaml 并回写 metadata

写盘位置：`openspec/changes/<change-name>/review-result.yaml`

Schema：

```yaml
change_id: <change-name>
review_round: <propose_rounds>
review_at: <ISO8601>
total_score: <0-100>
quality_label: 优秀 | 建议完善 | 建议返修
dimensions:
  - { name: 背景明确, level: 优秀/建议完善/建议返修, score: X, weight: 10 }
  - { name: 功能/非功能完整, level: 优秀/建议完善/建议返修, score: X, weight: 25 }
  - { name: 无歧义, level: 优秀/建议完善/建议返修, score: X, weight: 20 }
  - { name: 需求边界, level: 优秀/建议完善/建议返修, score: X, weight: 25 }
  - { name: 验收标准, level: 优秀/建议完善/建议返修, score: X, weight: 20 }
issues:
  - { type: 业务背景不足, severity: high, evidence: "...", suggestion: "..." }
result: pass | return_to_step1
gate_action: proceed | revise
```

结果规则：
- `total_score >= 85` → `quality_label: 优秀`, `result: pass`, `gate_action: proceed`
- `50 <= total_score < 85` → `quality_label: 建议完善`, `result: pass`, `gate_action: proceed`
- `total_score < 50` → `quality_label: 建议返修`, `result: return_to_step1`, `gate_action: revise`

**重要**：`quality_label` 是给用户看的质量总评；`result` / `gate_action` 是给 apply gate 使用的机器字段。`建议完善` 不阻断 apply，但应提示用户仍有改进建议。

同时回写：

```yaml
# metadata.yaml
step2_review_status: pass | return_to_step1
updated_at: <ISO8601>
```

**不得修改** `metadata.yaml` 中除 `step2_review_status` 与 `updated_at` 之外的字段。

### 自我校验

写盘后执行：

```bash
REVIEW_RESULT="$CHANGE_DIR/review-result.yaml"
python3 -c "import yaml; d=yaml.safe_load(open('$REVIEW_RESULT')); assert d['total_score'] >= 0 and d['total_score'] <= 100; assert d['quality_label'] in ('优秀','建议完善','建议返修'); assert d['result'] in ('pass','return_to_step1'); assert d['gate_action'] in ('proceed','revise'); assert all(x.get('level') in ('优秀','建议完善','建议返修') for x in d.get('dimensions', []))" \
  && echo "[OK] review-result.yaml 合法"
```

校验失败时：输出 `[FAIL] review-result.yaml 自检失败`，提示用户修复后重跑 `/tcsc:propose-review <change-name>`。

---

## 完成输出

```markdown
## 提案质量评审完成

**Change**: <change-name>
**Total Score**: <score>/100
**Quality**: 优秀 | 建议完善 | 建议返修
**Result**: pass | return_to_step1
**Review Result**: openspec/changes/<change-name>/review-result.yaml
**Metadata Updated**: openspec/changes/<change-name>/metadata.yaml.step2_review_status

### 主要问题
<列出 issues 前 5 条；无则写“无”>
```
