---
name: "TCSC: Pair Feature"
description: "跨前后端 feature 协作命令——5 步串行流程(完整性审查 → 落盘 .pair-context.yml → 第一阶段 proposal → 第二阶段 proposal含 upstream 自动扫描 → design+tasks 平行展开)。当用户提到跨前后端、前后端联调、需要在前端 + 后端两个 repo 同步推进同一个 feature 时使用此命令。"
argument-hint: "<change-id> [--backend <path>] [--frontend <path>] [--upstream <path>]"
---

跨前后端 feature 协作的项目级斜杠命令。本命令仅做**参数解析 + 端身份识别 + 调起 skill**,5 步流程定义全部下沉到 `~/.codebuddy/skills/openspec-pair-feature/SKILL.md`,本文件 SHALL NOT 重复 SKILL.md 已定义的流程内容。

---

## 调用方式

| 调用 | 含义 |
|------|------|
| `/tcsc:pair-feature avatar-upload` | 仅 change-id,启动 upstream 自动扫描(若是接续方) |
| `/tcsc:pair-feature avatar-upload --backend ~/codes/aurora-services` | 给定对端 backend 路径(本端 cwd 推断为 frontend 时常用) |
| `/tcsc:pair-feature avatar-upload --frontend ~/codes/product_center` | 给定对端 frontend 路径(本端 cwd 推断为 backend 时常用) |
| `/tcsc:pair-feature avatar-upload --backend X --frontend Y` | 同时给定双端,跳过兄弟目录扫描 |
| `/tcsc:pair-feature avatar-upload --upstream <path>` | 显式指定 upstream `.pair-context.yml` 绝对路径,完全跳过扫描 |

---

## Phase 1:参数解析

从 `$ARGUMENTS` 中解析参数:

1. **第一参数 `<change-id>`**(必填,kebab-case):若缺失,反问用户"请给一个 kebab-case 的 change-id,如 avatar-upload";SHALL NOT 自动生成。
2. **named arguments**:
   - `--backend <path>`:对端或本端的 backend repo 绝对路径,支持 `~` 开头
   - `--frontend <path>`:对端或本端的 frontend repo 绝对路径,支持 `~` 开头
   - `--upstream <path>`:用户显式指定的 upstream `.pair-context.yml` 完整路径(优先级最高,跳过扫描)

路径若以 `~` 开头,MUST 展开为 `$HOME` 后续使用。

---

## Phase 2:端身份识别

按以下优先级判定本端身份(`<self-side>`):

1. **用户显式声明优先**:若 `--backend <path>` 或 `--frontend <path>` 中某一项的路径等于当前 cwd(或为 `.`),则该项即为本端
   - 例:`--frontend .` → 本端是 frontend
   - 例:cwd 是 `~/codes/aurora-services`,且参数有 `--backend ~/codes/aurora-services` → 本端是 backend
2. **cwd 名启发式**:
   - cwd basename 含 `backend` / `api` / `server` / `service`(模糊匹配,大小写不敏感)→ 识别为 `backend`
   - cwd basename 含 `frontend` / `web` / `mobile` / `admin` / `client` → 识别为 `frontend`
3. **兜底反问**:上述都未命中(如 `~/codes/my-secret-project`)→ 输出
   ```
   ❓ 无法从 cwd 推断本端身份。请告诉我:当前 repo 是 backend 还是 frontend?
       (或者你下次可以用 --backend . / --frontend . 显式声明)
   ```
   等待用户答复后再继续。**SHALL NOT** 静默选择默认值。

确定 `<self-side>` 后,推断 `<peer-side>` = (双端 - self) 中的另一端;`<peer-repo>` = 命令参数中"非本端"那一项的路径(若用户给了)。

---

## Phase 3:调起 skill

加载 skill 主体:

```
Read ~/.codebuddy/skills/openspec-pair-feature/SKILL.md
```

把 Phase 1 + 2 解析得到的上下文作为变量传递:

| 传递变量 | 值 |
|---------|---|
| `<change-id>` | Phase 1 解析的第一参数 |
| `<self-side>` | Phase 2 判定的本端 |
| `<self-repo>` | 当前 cwd |
| `<peer-repo>` | Phase 1 中 `--<peer-side>` 路径(可空) |
| `<upstream-path>` | Phase 1 中 `--upstream` 路径(可空) |

---

## Phase 4:由 skill 接管

skill 接管后会按 SKILL.md 5 步流程执行:

- **若本端是发起方**(本端 `openspec/changes/<change-id>/.pair-context.yml` 不存在或 `created_in == <self-side>`):走 Step 1 → 2 → 3,生成 .pair-context.yml + 本端 proposal,等待 review + lock
- **若本端是接续方**(本端不是发起方):跳过 Step 1~3,直接走 Step 4 — upstream 自动扫描 + 反问 + 加载 + 生成本端 proposal + lock
- 任一端 lock 完成后进入 Step 5,与对端独立推进 design + tasks

具体的反问话术、Glob 路径模式、archive 兜底接续版生成、lock 状态机改写、proposal 双区分区生成等细节 — **全部在 SKILL.md 中定义**,本命令文件不重复。

---

## 兜底:命令独立可用

**关键约束**:本命令的全部行为 SHALL NOT 依赖 `openspec/config.yaml` 的任何字段;即使项目没装 `openspec-installer`、即使 `openspec/config.yaml` 缺失、即使 bridge rule 不存在 — 命令仍可被用户主动调起并完成 5 步流程,前提仅是 `~/.codebuddy/skills/openspec-pair-feature/` 目录已就位。

若 `~/.codebuddy/skills/openspec-pair-feature/SKILL.md` 不存在(用户没装 skill),输出:

```
❌ 未找到 openspec-pair-feature skill。

请安装:
1. 通过 openspec-installer:在 CodeBuddy 中说"安装 OpenSpec"或"升级 openspec",
   会自动安装本 skill 到 ~/.codebuddy/skills/openspec-pair-feature/
2. 或手动复制:从 tcsc-skills 仓库的 skills/公共/openspec-pair-feature/ 复制到
   ~/.codebuddy/skills/openspec-pair-feature/
```

并停止流程。

---

## 参数解析示例

```
输入:/tcsc:pair-feature avatar-upload --backend ~/codes/aurora-services

解析:
  change-id   = avatar-upload
  --backend   = /home/<user>/codes/aurora-services  (~ 已展开)
  --frontend  = (未提供)
  --upstream  = (未提供)

端识别:
  cwd = /home/<user>/codes/product_center
  --backend 路径 != cwd → 不命中"显式声明"
  cwd basename "product_center" 含 "center" → 弱信号(不在 backend/frontend 关键词列表)
  → 兜底反问"当前 repo 是 backend 还是 frontend?"

(假设用户答复 "frontend")
最终:
  <change-id>     = avatar-upload
  <self-side>     = frontend
  <self-repo>     = /home/<user>/codes/product_center
  <peer-side>     = backend
  <peer-repo>     = /home/<user>/codes/aurora-services
  <upstream-path> = (空)

→ Read ~/.codebuddy/skills/openspec-pair-feature/SKILL.md → 进入 Step 4(本端是接续方,因为本端 pair-context 不存在)
```
