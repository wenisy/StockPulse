---
name: "TCSC: Code Review"
description: "对指定 OpenSpec 变更执行代码审查——四阶段流程（上下文收集 → 高层级审查 → 逐行分析 → 总结决策），支持语言专属审查指南（渐进式加载），结合 docs/ 规范，输出六级严重性报告。"
argument-hint: "<change-name> [--lang=<language>]"
---

对指定 OpenSpec 变更的实现代码进行全面审查。与 `/opsx:verify`（需求验收：做了没有）互补，本命令关注"做得好不好"。

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

从 `~/.codebuddy/skills/code-review-skill/reference/` 目录按需读取匹配的指南文件。如果 code-review-skill 未安装或无匹配指南，仅使用通用审查维度（不报错）。

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

合并两个来源，去重，得到本次审查的**文件列表**。

**1.3 确定审查深度策略**

根据文件数量选择策略：

| 文件数 | 策略 |
|--------|------|
| ≤ 3 | 全量审查：逐函数检查所有文件 |
| 4 - 15 | 分层审查：核心文件全量 + 辅助文件快速扫描 |
| > 15 | 高风险优先：安全 → 逻辑 → 架构 → 风格，低风险文件抽检 |
| 全部为 .md / 配置文件 | 跳过代码质量检查，仅检查格式和敏感信息 |

---

## Phase 2：高层级审查

**2.1 架构合规性（对照 docs/ 规范）**

检查 `docs/` 下各子目录，按下表执行对应维度检查。**若子目录不存在或为空，跳过并标注 `[SKIPPED]`**。

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

**2.3 测试策略评估**

检查变更是否有对应的测试文件。如果缺失测试，标记为 suggestion。

---

## Phase 3：逐行深度分析

**3.1 通用代码质量审查（始终执行）**

按以下六个维度逐一检查：

**维度 1：边界条件** — 空值/nil 检查、数组越界、整数溢出、空集合处理

**维度 2：错误处理** — 异常吞没、调试上下文不足、retry 退避策略、错误码区分

**维度 3：并发安全** — 竞态条件、锁粒度、死锁风险、goroutine/协程泄漏

**维度 4：数据一致性** — 事务边界、缓存一致性、并发写入冲突

**维度 5：安全性** — SQL 注入、硬编码密钥、输入验证、越权访问、敏感信息泄露、SSRF/路径穿越/命令注入

**维度 6：资源管理** — 连接关闭（defer/finally）、文件句柄释放、临时资源清理、超时控制

如果加载了 `security-review-guide.md`，在安全性维度中额外参考其专项检查清单。

**3.2 语言专属审查（根据 Phase 0 加载的指南）**

对每个已加载的语言指南，按其中的 Review Checklist 逐项检查。例如：

- **React** → Hooks 规则、useEffect 模式、Server Components、React 19 Actions、TanStack Query v5
- **Go** → goroutine 生命周期、context 传播、interface 设计、receiver 类型选择
- **Java** → Spring Boot 3 模式、虚拟线程、JPA N+1、Records/Sealed Classes
- **Python** → 类型注解、异步模式、依赖管理、安全陷阱
- **Vue** → Composition API、响应式系统、组件设计、Pinia 状态管理
- **Rust** → 所有权模式、unsafe 代码审查、async 安全、错误处理
- **TypeScript** → 类型安全、泛型使用、类型守卫、声明文件

如果未检测到任何语言或无 reference 指南，跳过本节。

---

## Phase 4：总结与决策

### 报告格式

```
## 代码审查报告
**Change**: <change-name>
**审查时间**: <timestamp>
**审查范围**: <N 个文件>
**审查策略**: <全量 / 分层 / 高风险优先 / 纯文档>
**检测到的技术栈**: <Go, React, TypeScript 等>
**加载的审查指南**: <go.md, react.md 等 / 无>

---

### 一、架构合规性

| # | 文件 | 检查项 | 规范来源 | 严重性 | 说明 |
|---|------|--------|---------|--------|------|

#### 跳过的维度
- [SKIPPED] 无 docs/modules/ 目录，跳过模块边界检查

---

### 二、代码质量（通用维度）

| # | 文件:行号 | 维度 | 严重性 | 问题描述 | 建议修复 |
|---|-----------|------|--------|----------|----------|

---

### 三、语言专属审查

| # | 文件:行号 | 语言 | 检查项 | 严重性 | 问题描述 | 建议修复 |
|---|-----------|------|--------|--------|----------|----------|

---

### 四、亮点与学习

| # | 文件:行号 | 类型 | 说明 |
|---|-----------|------|------|
| 1 | src/handler.go:50 | 🌟 praise | 优雅的错误处理链 |
| 2 | src/utils.go:20 | 📚 learning | Go 1.22+ 的 range over int 语法 |

---

### 五、总结

#### 评分卡
| 维度 | 状态 |
|------|------|
| 架构合规性 | ✅ / ⚠️ / ❌ / ⏭️ |
| 通用代码质量 | ✅ / ⚠️ / ❌ |
| 语言专属 | ✅ / ⚠️ / ❌ / ⏭️ |
| 性能 | ✅ / ⚠️ / ❌ / ⏭️ |
| 测试覆盖 | ✅ / ⚠️ / ❌ |

#### 问题统计
- 🔴 blocking: X 个（合并前必须修复）
- 🟠 important: Y 个（应当修复）
- 🟡 nit: Z 个（小问题）
- 🔵 suggestion: W 个（可选优化）
- 📚 learning: L 个（教育性说明）
- 🌟 praise: P 个（优秀代码）

**向下兼容统计**（供 review-pipeline 判断）：
- CRITICAL (blocking): X 个
- WARNING (important): Y 个
- SUGGESTION (nit + suggestion): Z+W 个

#### 结论
```

**结论规则**：
- **有 blocking** → "❌ 不建议 archive，需先修复以上 blocking 问题"
- **无 blocking，有 important** → "⚠️ 可以 archive，建议跟进修复 important 问题"
- **无 blocking，无 important** → "✅ 代码质量良好，建议执行 /opsx:archive"

---

## 六级严重性标记定义

| 标记 | 含义 | 向下兼容 | 典型示例 |
|------|------|---------|---------|
| 🔴 **blocking** | 合并前必须修复 | CRITICAL | SQL 注入、空指针崩溃、数据丢失、硬编码密钥 |
| 🟠 **important** | 应当修复 | WARNING | 无超时控制、日志不足、缺少错误处理、性能隐患 |
| 🟡 **nit** | 风格/偏好小问题 | SUGGESTION | 命名不够清晰、缩进不一致 |
| 🔵 **suggestion** | 值得考虑的优化 | SUGGESTION | 可用更优设计模式、可提取公共函数 |
| 📚 **learning** | 教育性说明 | 不计入统计 | 解释某个 API 的设计意图、推荐文档链接 |
| 🌟 **praise** | 表扬优秀代码 | 不计入统计 | 优雅的错误处理、良好的抽象设计 |

每个问题 **MUST** 包含：
1. 具体文件路径和行号（`文件:行号` 格式）
2. 明确的问题描述
3. 具体的修复建议（代码示例优先）

审查语气采用**协作式**：以提问替代命令，以建议替代指令，强调学习和改进。
