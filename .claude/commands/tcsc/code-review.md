---
name: "TCSC: Code Review"
description: "对指定 OpenSpec 变更执行代码审查——四阶段流程（上下文收集 → 高层级审查 → 6维分数制分析 → 总结决策），支持语言专属审查指南（渐进式加载），结合 docs/ 规范，输出结构化 coding-score-result.yaml + 六级严重性文本报告。"
argument-hint: "<change-name> [--lang=<language>]"
---

对指定 OpenSpec 变更的实现代码进行全面审查。与 `/opsx:verify`（需求验收：做了没有）互补，本命令关注"做得好不好"。

采用部门 SDD 矩阵 6 维分数制审查体系：
- 安全合规（25%）、代码正确性与幻觉检测（20%）、稳定性与容错（20%）
- 接口契约与兼容性（15%）、可观测性（10%）、性能与资源效率（10%）
- 每条检查项按高(-20)/中(-10)/低(0) 扣分，每个维度满分 100 分起扣
- 加权总分 0-100，<50 分阻断 archive，结构化 yaml 落盘

参考 [awesome-skills/code-review-skill](https://github.com/awesome-skills/code-review-skill) 的最佳实践，采用四阶段审查流程和语言专属审查指南。

---

**调用方式**：`/tcsc:code-review <change-name>` 或 `/tcsc:code-review <change-name> --lang=go,react`

## Phase 0：技术栈检测与指南加载

**0.1 自动检测技术栈**

扫描项目根目录的标志文件，自动识别技术栈：

| 标志文件 | 技术栈 | 加载指南 |
|---------|--------|---------|
| `package.json` 含 `react` | React | `~/.codebuddy/skills/code-review-skill/reference/react.md` |
| `package.json` 含 `vue` | Vue | `~/.codebuddy/skills/code-review-skill/reference/vue.md` |
| `tsconfig.json` | TypeScript | `~/.codebuddy/skills/code-review-skill/reference/typescript.md` |
| `go.mod` | Go | `~/.codebuddy/skills/code-review-skill/reference/go.md` |
| `Cargo.toml` | Rust | `~/.codebuddy/skills/code-review-skill/reference/rust.md` |
| `pom.xml` / `build.gradle` | Java | `~/.codebuddy/skills/code-review-skill/reference/java.md` |
| `requirements.txt` / `pyproject.toml` | Python | `~/.codebuddy/skills/code-review-skill/reference/python.md` |
| `CMakeLists.txt` 或 `*.c` 文件 | C | `~/.codebuddy/skills/code-review-skill/reference/c.md` |
| `*.cpp` / `*.cc` 文件 | C++ | `~/.codebuddy/skills/code-review-skill/reference/cpp.md` |
| `*.css` / `*.less` / `*.sass` / `*.scss` | CSS/Less/Sass | `~/.codebuddy/skills/code-review-skill/reference/css-less-sass.md` |

如果用户通过 `--lang=` 参数手动指定语言，跳过自动检测，仅加载指定语言的指南。

**0.2 加载语言指南**

从 `~/.codebuddy/skills/code-review-skill/reference/` 目录按需读取匹配的指南文件。如果 code-review-skill 未安装或无匹配指南，仅使用通用审查维度��不报错）。

**0.3 加载通用专项指南**

始终尝试加载（如存在）：
- `~/.codebuddy/skills/code-review-skill/reference/security-review-guide.md` — 安全审查专项
- `~/.codebuddy/skills/code-review-skill/reference/performance-review-guide.md` — 性能审查专项
- `~/.codebuddy/skills/code-review-skill/reference/architecture-review-guide.md` — 架构审查专项

---

## Phase 1：上下文收集

**1.1 定位变更**

从参数获取 `<change-name>`，定位变更目录：
```
openspec/changes/<change-name>/
```

如果未提供参数，通过 `openspec list --json` 列出活跃变更，提示用户选择。

**1.2 识别实现文件**

读取 `openspec/changes/<change-name>/tasks.md`，找出所有已完成（`[x]`）的任务，推断这些任务涉及的代码文件。

同时读取 `openspec/changes/<change-name>/proposal.md` 的 `## Impact` 节，获取 `affected-files` 列表。

合并两个来源，去重，得到本次审查��**文件列表**。

**1.3 确定审查深度策略**

根据文件数量选择策略：

| 文件数 | 策略 |
|--------|------|
| ≤ 3 | 全量审查：逐函数检查所有文件 |
| 4 - 15 | 分层审查：核��文件全量 + 辅助文件快速扫描 |
| > 15 | 高风险优先：安全 → 逻辑 → 架构 → 风格，低风险文件抽检 |
| 全部为 .md / 配置文件 | 跳过代码质量检查，仅检查格式和敏感信息 |

---

## Phase 2：高层级审查

**2.1 架构合规性（对照 docs/ 规范）**

检查 `docs/` 下各子目录，按下表执行对应维度检查。
**先读 `docs/INDEX.md` 锁定相关目录 → 再读对应子目录的 `INDEX.md` 筛选相关文件 → 最后只 Read 筛选后的文件。禁止全量 ls + 逐文件盲读。**
**若子目录不存在或为空，跳过并标注 `[SKIPPED]`**。

| docs 子目录 | 检查内容 |
|-------------|---------|
| `docs/architecture/` | 分层结构、依赖方向、跨层调用 |
| `docs/api/` | API 路径、参数、响应结构、错误码、版本兼容性 |
| `docs/guides/` | 命名规范、日志规范、配置管理、错误处理规范 |
| `docs/modules/` | 模块职责、跨模块依赖、模块间通信方式 |

如果加载了 `architecture-review-guide.md`，额外参考其中的 SOLID 原则、反模式检查清单。

**2.2 性能影响评估**

如果加载了 `performance-review-guide.md`，按其指南评估：
- 前端：Core Web Vitals、Bundle Size、渲染性能
- 后端：N+1 查询、内存泄漏、缓存策略
- 通用：算法复杂度、I/O 优化

**2.3 测试覆盖评估（评分维度，非 suggestion）**

读取 verifier 传入的测试结果 + 覆盖率数据（review_mode=parallel 时由 main 汇总合并）。测试覆盖是正式评分维度，不再是 suggestion-only 提示。

| 情况 | 严重性 | 处理 |
|---|---|---|
| 功能/逻辑代码无任何配套测试 | 🔴 blocking | 结论 MUST 为「不建议 archive」 |
| 有测试但增量覆盖率 < 阈值（默认 70%） | 🟠 important | v1.8.0 不 blocking，但必须提示覆盖率风险 |
| 测试齐全且覆盖率达标 | ✅ | 记录测试 PASS + 覆盖率 |
| 纯文档/配置或 `openspec/.tcsc-test.yml` 中 `skip: true` | ⏭️ [SKIPPED] | 不因缺测试输出 blocking |

若 verifier 未能探测测试命令或无法采集覆盖率，SHALL 按 important 记录风险，并提示配置 `openspec/.tcsc-test.yml`；SHALL NOT 伪造测试 PASS 或覆盖率数字。

---

## Phase 3：6 维分数制审查

按以下 6 个维度逐维审查。每个维度的每条检查项，逐条判定风险等级并扣分：

**扣分规则**：
- **高风险**（完全违反规范，现网隐患大）→ 扣 20 分
- **中风险**（不完全遵守规范，无现网影响，有维护提升空间）→ 扣 10 分
- **低风险**（基本遵守规范，无现网影响）→ 扣 0 分
- **N/A**（本次变更不涉及该检查项）→ 扣 0 分，标记 N/A

**维度分 = max(0, 100 - 扣分总和)**

---

### 维度 1：安全合规（权重 25%，满分 100）

1. **注入防御**：SQL/命令/LDAP/NoSQL/模板注入是否使用参数化/预处理/ORM，禁止字符串拼接
2. **鉴权与权限**：对外接口是否有身份校验 + 资源级权限检查（既要登录态也要资源 owner）
3. **密钥管理**：是否硬编码了 password/secret/token/api_key/private_key
4. **反序列化**：是否使用 pickle/yaml.load/eval/ObjectInputStream 处理外部输入
5. **路径遍历**：文件操作是否直接拼接用户输入，是否校验路径前缀（basename + realpath）
6. **SSRF**：外发 HTTP/HTTPS 请求的 URL 是否来自用户输入

### 维度 2：代码正确性与幻觉检测（权重 20%，满分 100）

1. **函数/方法真实性**：调用的函数/方法是否真实存在（非 AI 虚构的 API/库函数）
2. **类型兼容性**：参数类型是否与声明一致，返回值类型是否正确
3. **空值/null 处理**：是否对可能为 null/nil/None 的值做了防护性检查
4. **逻辑悖论**：是否存在不可能成立的条件（如 `x > 10 && x < 5`）、死代码

### 维度 3：稳定性与容错（权重 20%，满分 100）

1. **超时设置**：HTTP/RPC/DB 调用是否设置了合理的超时时间
2. **重试/降级/熔断**：外部依赖调用失败时是否有容错机制
3. **竞态条件**：并发读写共享变量是否有锁或原子操作保护
4. **事务保护**：多步数据库操作是否有事务边界
5. **资源泄漏**：文件句柄/连接/goroutine/线程 是否正确关闭（defer/finally）

### 维度 4：接口契约与兼容性（权重 15%，满分 100）

1. **API 签名变更**：公共方法/接口签名是否发生变化，是否为 breaking change
2. **参数默认值**：新增参数是否有默认值��确保向后兼容
3. **返回值结构**：返回值类型/字段是否发生不兼容变更
4. **版本标注**：是否有接口版本号或 @since/@deprecated 注释

### 维度 5：可观测性（权重 10%，满分 100）

1. **关键路径日志**：核心业务逻辑是否有日志记录，不含敏感信息
2. **错误上下文**：错误日志是否包含 traceId/spanId/入参摘要等排查信息
3. **日志级别**：Error/Warn/Info/Debug 使用是否合理
4. **Metrics/埋点**：是否有业务指标上报或监控埋点

### 维度 6：性能与资源效率（权重 10%，满分 100）

1. **N+1 查询**：循环内是否有数据库/RPC 调用
2. **循环嵌套**：是否有不必要的多层嵌套循环，时间复杂度是否合理
3. **流式处理**：大文件/大数据集是否流式处理而非全量加载到内存
4. **缓存**：是否有合理的缓存策略，是否缓存了高频不变数据

---

### 语言专属审查指引（根据 Phase 0 加载的指南）

如果 Phase 0 加载了语言专属指南，在各维度中额外参考其检查清单。例如：
- **React** → Hooks 规则、useEffect 模式、Server Components、React 19 Actions、TanStack Query v5
- **Go** → goroutine 生命周期、context 传播、interface 设计、receiver 类型选择
- **Java** → Spring Boot 3 模式、虚拟线程、JPA N+1、Records/Sealed Classes
- **Python** → 类型注解、异步模式、依赖管理、安全陷阱
- **Vue** → Composition API、响应式系统、组件设计、Pinia 状态管理
- **Rust** → 所有权模式、unsafe 代码审查、async 安全、错误处理
- **TypeScript** → 类型安全、泛型使用、类型守��、声明文件

未检测到任何语言或无 reference 指南，跳过本节。

---

## Phase 4：总分计算与门禁判定

### 权重计算

```
��度 1 (安全合规)      最终分 = max(0, 100 - 扣分总和), 加权 = 最终分 × 0.25
维度 2 (正确性/幻觉)    最终分 = max(0, 100 - 扣分总和), 加权 = 最终分 × 0.20
维度 3 (稳定性/容错)    最终分 = max(0, 100 - 扣分总和), 加权 = 最终分 × 0.20
维度 4 (接口兼容)      最终分 = max(0, 100 - 扣分总和), 加权 = 最终分 × 0.15
维度 5 (可观测性)      最终分 = max(0, 100 - 扣分总和), 加权 = 最终分 × 0.10
维度 6 (性能/资源)     最终分 = max(0, 100 - 扣分总和), 加权 = 最终分 × 0.10

总分 = Σ 加权分（保留整数）
```

### 质量标签

| 总分 | quality_label | result | gate_action |
|------|--------------|--------|-------------|
| ≥ 85 | 优秀 | pass | proceed |
| 50 ~ 84 | 建议完善 | pass | proceed |
| < 50 | 建议返修 | return_to_step1 | block |

### 维度等级

| 维度最终分 | level |
|-----------|-------|
| ≥ 85 | 优秀 |
| 50 ~ 84 | 建议完善 |
| < 50 | 建议返修 |

---

## Phase 5：写 coding-score-result.yaml

### 文件位置

`openspec/changes/<change-name>/coding-score-result.yaml`

### Schema 定义

```yaml
change_id: <change-name>
review_round: <从 metadata.yaml.propose_rounds 读取，首次为 1>
review_at: <ISO8601>
total_score: <0-100>
quality_label: 优秀 | 建议完善 | 建议返修

dimensions:
  - name: 安全合规
    weight: 25
    level: 优秀 | 建议完善 | 建议返修
    score: <0-100>
    deduction_details:
      - item: <检查项名如"SQL注入">
        risk: 高 | 中 | 低 | N/A
        deduction: 20 | 10 | 0
        evidence: "<文件:行号 + 代码片段>"
        suggestion: "<修复建议>"
  - name: 代码正确性与幻觉检测
    weight: 20
    level: ...
    score: <0-100>
    deduction_details: [...]
  - name: 稳定性与容错
    weight: 20
    level: ...
    score: <0-100>
    deduction_details: [...]
  - name: 接口契约与兼容性
    weight: 15
    level: ...
    score: <0-100>
    deduction_details: [...]
  - name: 可观测性
    weight: 10
    level: ...
    score: <0-100>
    deduction_details: [...]
  - name: 性能与资源效率
    weight: 10
    level: ...
    score: <0-100>
    deduction_details: [...]

issues:
  - dimension: <维度名>
    item: <检查项名>
    severity: high | medium
    evidence: "<文件:行号 + 代码片段>"
    suggestion: "<修复建议>"

result: pass | return_to_step1
gate_action: proceed | block
```

### 写入指令

1. 根据 Phase 4 计算结果，填充上述 yaml 所有字段
2. 每个维度的 `deduction_details` 必须逐条包含 item / risk / deduction / evidence / suggestion
3. 如某维度无任何扣分，`deduction_details` 写空数组 `[]`，level 为"优秀"
4. N/A 项：risk=N/A, deduction=0, evidence="N/A", suggestion="N/A"
5. `issues` 汇总所有 severity=high 和 medium 的扣分项，severity 取值：high（risk=高）| medium（risk=中）
6. 写入完成后进入 Phase 6 自检

---

## Phase 6：自我校验

写入 coding-score-result.yaml 后，立即执行以下自检：

```bash
CHANGE_ID="<change-name>"
python3 -c "
import yaml, sys
path = f'openspec/changes/{sys.argv[1]}/coding-score-result.yaml'
d = yaml.safe_load(open(path))
# 字段合法性
assert 0 <= d['total_score'] <= 100, f'total_score {d[\"total_score\"]} out of range'
assert d['quality_label'] in ('优秀','建议完善','建议返修'), f'invalid quality_label: {d[\"quality_label\"]}'
assert d['result'] in ('pass','return_to_step1'), f'invalid result: {d[\"result\"]}'
assert d['gate_action'] in ('proceed','block'), f'invalid gate_action: {d[\"gate_action\"]}'
assert len(d['dimensions']) == 6, f'expected 6 dimensions, got {len(d[\"dimensions\"])}'
# 维度校验
for dim in d['dimensions']:
    assert dim['score'] >= 0, f'{dim[\"name\"]} score {dim[\"score\"]} < 0'
    assert dim['weight'] in (25, 20, 20, 15, 10, 10), f'{dim[\"name\"]} invalid weight {dim[\"weight\"]}'
    assert dim['level'] in ('优秀','建议完善','建议返修'), f'{dim[\"name\"]} invalid level: {dim[\"level\"]}'
    for dd in dim.get('deduction_details', []):
        assert dd['risk'] in ('高','中','低','N/A'), f'{dim[\"name\"]} {dd[\"item\"]} invalid risk: {dd[\"risk\"]}'
        assert dd['deduction'] in (20, 10, 0), f'{dim[\"name\"]} {dd[\"item\"]} invalid deduction: {dd[\"deduction\"]}'
# 综合校验
total_from_dims = sum(dim['score'] * dim['weight'] / 100 for dim in d['dimensions'])
assert abs(round(total_from_dims) - d['total_score']) <= 1, f'total_score mismatch: {d[\"total_score\"]} vs computed {round(total_from_dims)}'
print(f'[OK] coding-score-result.yaml 合法 | {d[\"change_id\"]} | {d[\"total_score\"]}/100 | {d[\"quality_label\"]} | {d[\"gate_action\"]}')
" -- "$CHANGE_ID"
```

---

## Phase 7：生成文本审查报告

### 报告格式

```
## 编码评分报告
**Change**: <change-name>
**评分时间**: <review_at>
**总分**: <total_score>/100
**质量等级**: <quality_label>
**门禁**: <gate_action>

---

### 6 维评分卡

| 维度 | 权重 | 得分 | 等级 | 扣分项数 |
|------|------|------|------|---------|
| 安全合规 | 25% | X/100 | 优秀/建议完善/建议返修 | N |
| 代码正确性与幻觉检测 | 20% | X/100 | ... | N |
| 稳定性与容错 | 20% | X/100 | ... | N |
| 接口契约与兼容性 | 15% | X/100 | ... | N |
| 可观测性 | 10% | X/100 | ... | N |
| 性能与资源效率 | 10% | X/100 | ... | N |

---

### 各维度扣分明细

#### 维度 1：安全合规（X/100）

| # | 检查项 | 风险 | 扣分 | 文件:行号 | 问题 | 建议 |
|---|--------|------|------|-----------|------|------|

<如无扣分：标注 ✅ 无问题>

#### 维度 2：代码正确性与幻觉检测（X/100）
...

---

### 架构合规性

| # | 文件 | 检查项 | 规范来源 | 严重性 | 说明 |
|---|------|--------|---------|--------|------|

#### 跳过的维度
- [SKIPPED] 无 docs/modules/ 目录，跳过模块边界检查

---

### 高风险问题（需立即修复）

<从 issues 中 filter severity=high，逐条列出>

### 中风险问题（建议修复）

<从 issues 中 filter severity=medium，逐条列出>

---

### 结论

<根据 gate_action>
- proceed: 编码评分通过 (<total_score>/100)，建议执行 /opsx:archive
- block: 编码评分未通过 (<total_score>/100)，请修复以上高/中风险问题后重新 apply
```

---

## 六级严重性标记定义

| 标记 | 含义 | 对应扣分 | 典型示例 |
|------|------|---------|---------|
| 🔴 **blocking** | 合并前必须修复 | 高风险 -20 | SQL 注入、空指针崩溃、数据丢失、硬编码密钥 |
| 🟠 **important** | 应当修复 | 中风险 -10 | 无超时控制、日志不足、缺少错误处理 |
| 🟡 **nit** | 风格/偏好小问题 | 低风险 0 | 命名不够清晰、缩进不一致 |
| 🔵 **suggestion** | 值得考虑的优化 | 低风险 0 | 可用更优设计模式、可提取公共函数 |
| 📚 **learning** | 教育性说明 | 不计分 | 解释某个 API 的设计意图、推荐文档链接 |
| 🌟 **praise** | 表扬优秀代码 | 不计分 | 优雅的错误处���、良好的抽象设计 |

每个问题 **MUST** 包含：
1. 具体文件路径和行号（`文件:行号` 格式）
2. 明确的问题描述（evidence）
3. 具体的修复建议（suggestion，代码示例优先）

审查语气采用**协作式**：以提问替代命令，以建议替代指令，强调学习和改进。
