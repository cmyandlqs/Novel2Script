# Noverl2Script 项目说明

## 项目用途

本项目用于竞赛赛题三：AI 小说转剧本工具。

目标用户是小说作者。作品需要把 3 个章节以上的小说文本，通过 AI 辅助转换为可编辑、可继续打磨的结构化剧本初稿。

核心交付结果必须是 YAML 格式的结构化剧本，并额外提交一份 YAML Schema 定义文档，说明 Schema 的设计原因。

## 仓库信息

- GitHub 仓库：https://github.com/cmyandlqs/Noverl2Script
- 当前可见性：`PRIVATE`
- 可见性规则：开发阶段保持私有；等竞赛规定的公开时间或提交截止后，再切换为公开以供评审访问。
- 远程名：`origin`
- 远程地址：`git@github.com:cmyandlqs/Noverl2Script.git`
- 主分支：`main`
- 首次提交：`e04003d docs: add competition constraints`
- 首次 push 状态：已推送到 `origin/main`

## 当前开发状态

- 当前阶段：阶段 4：多阶段 Agent Pipeline
- 当前状态：OpenAI Provider 已实现，PR 待创建
- 上一阶段：阶段 3：章节解析与输入校验，已完成，PR #4
- 下一步入口：合并阶段 4 PR 后进入阶段 5：YAML 校验与质量评分
- 下一步建议分支：`feat/yaml-validation-scoring`

## 竞赛硬约束

后续所有开发、文档和演示都必须遵守以下要求：

1. 必须围绕“AI 小说转剧本工具”议题，不能偏离小说改编剧本方向。
2. 必须支持输入 3 个章节以上的小说文本。
3. 必须输出结构化剧本初稿。
4. 结构化剧本必须使用 YAML 格式。
5. 输出内容应可编辑、可进一步打磨。
6. 必须额外提交 YAML Schema 定义文档。
7. Schema 文档必须说明设计原因。
8. 最终必须提交公开可访问的 GitHub 或 Gitee 仓库；开发阶段需按竞赛防抄袭要求保持私有，等竞赛规定时间再公开。
9. 必须提交 README 文档，并包含必要说明和 Demo 视频链接。
10. 必须提交可访问、可播放的 Demo 视频，视频需有声音讲解并展示主要功能和效果。
11. 开发过程必须持续交付，不能在最后一天一次性导入所有代码。
12. 所有 commit 时间戳必须落在所选批次的开始时间与截止时间之内。
13. 代码仓库必须在开题后创建。
14. 每个 PR 只做一件事，大功能必须拆成多个独立 PR。
15. PR 标题和描述必须清晰完整。
16. PR 描述必须包含功能描述、实现思路、测试方式。
17. PR 合并后主分支必须保持可运行，评委应能复现演示效果。
18. 第三方库或框架必须在 README 中列明。
19. README 需要说明哪些部分是原创功能。
20. 复用自己过去的代码片段时，必须在 PR 描述中注明来源。
21. 不得抄袭代码或技术方案，不得侵犯他人知识产权。
22. 代码重复率达到 50% 以上会导致取消路演资格并列入招聘黑名单。

## PR 与 Commit 规范

当前目录已初始化为 Git 仓库，并已连接到 GitHub 远程仓库；当前仓库应保持私有，等竞赛规定时间再公开。

### 赛题原始要求

- 必须基于 PR 添加新功能。
- 必须保持持续 PR 记录和持续 commit 提交。
- commit 时间戳必须落在所选批次的开始时间与截止时间之内。
- 不能在最后一天一次性导入所有代码，否则会被视为无效作品。
- 每个 PR 只做一件事，大功能必须拆成多个独立 PR 分步提交。
- PR 标题必须一句话说明本 PR 新增或修改了什么。
- PR 描述必须清晰完整，至少包含功能描述、实现思路、测试方式。
- PR 描述不能为空，且不能与实际代码变更严重不符。
- PR 合并后主分支必须保持可运行，评委在任意时间查看时应能复现演示效果。
- 引用第三方库或框架时，必须在 README 中列明依赖，并说明原创功能部分。
- 复用自己过去的代码片段时，必须在 PR 描述中注明来源。
- 多人组队时，每位队员必须使用各自账号提交 commit，PR 需清晰描述各自分工。

### 本项目落地规范

- 主分支固定为 `main`，`main` 必须保持可运行。
- 所有功能、修复和文档新增都通过短生命周期分支完成，再合并回 `main`。
- 分支命名使用：
  - `docs/<short-name>`：文档变更。
  - `feat/<short-name>`：新功能。
  - `fix/<short-name>`：缺陷修复。
  - `test/<short-name>`：测试补充。
  - `chore/<short-name>`：脚手架、依赖、配置。
- commit 信息使用 `<type>: <summary>` 格式，例如：
  - `docs: add yaml schema draft`
  - `feat: add chapter parser`
  - `test: cover yaml validation`
  - `fix: handle missing chapter titles`
- 每个 commit 应只表达一个清晰变更，不混合无关改动。
- 每个 PR 合并前必须记录验证方式；有代码变更时至少运行对应测试或说明无法运行的原因。
- 每个 PR 描述建议使用以下结构：

```markdown
## 功能描述

本 PR 新增/修改了什么，用户如何使用。

## 实现思路

核心技术方案、关键模块、为什么这样实现。

## 测试方式

运行了哪些命令，手动验证了哪些流程。

## 备注

依赖、复用代码来源、已知限制或后续 PR。
```

### 禁止事项

- 不要直接在 `main` 上堆积大量未拆分功能。
- 不要把多个大功能合进同一个 PR。
- 不要提交空白 PR 描述。
- 不要提交与实际变更不符的 PR 描述。
- 不要集中在截止日前一次性提交大量代码。
- 不要提交 `.env`、密钥、令牌、构建产物或无关本地配置。
- 不要引入第三方依赖后忘记更新 README。
- 不要复用历史代码却不在 PR 描述中说明来源。


## 当前目录说明

```text
.
├── README.md         # 项目说明、运行方式、依赖和当前 Demo 状态
├── package.json      # Next.js Web 应用依赖和 npm scripts
├── package-lock.json # npm 可复现安装锁文件
├── CLAUDE.md        # Claude/AI agent 使用的项目说明与竞赛硬约束
├── AGENTS.md        # 通用 AI agent 使用的项目说明与竞赛硬约束
├── src/
│   ├── app/          # Next.js App Router 页面和 API route
│   ├── components/   # 基础工作台 UI 组件
│   └── lib/          # 阶段 2 基础逻辑
├── schemas/
│   └── script.schema.json       # 剧本 YAML 输出契约，对应赛题 Schema 要求
├── examples/
│   ├── sample-novel.md          # 原创 3 章节小说输入样例
│   └── output-script.yaml       # 符合 Schema 的剧本 YAML 输出样例
└── docs/
    ├── YAML_Schema设计说明.md   # Schema 字段设计原因与边界说明
    ├── 项目状态.md              # 当前阶段、阶段验收项和状态维护规则
    ├── 竞赛文档.md              # 赛题信息、评审规则、提交要求和硬约束整理
    ├── 输出与Agent评估标准.md   # 输出质量、Agent 能力和 Demo 验收评估标准
    ├── 开发计划.md              # 分阶段开发计划、验收标准和注意事项
    └── 技术选型.md              # 项目形态、技术栈、目录结构和选型理由
```

后续可能新增目录：

```text
src/lib/ai/           # AI Provider Adapter 和 mock/真实模型 provider
src/lib/script/       # YAML 序列化、Schema 校验和剧本结构工具
src/lib/quality/      # 输出质量评分逻辑
tests/                # 跨模块测试或端到端测试
```

## Agent 工作要求

- 开始实现前先阅读 `docs/竞赛文档.md`。
- 开始阶段任务前先阅读 `docs/项目状态.md`，确认当前阶段和验收项。
- 不要引入与赛题无关的大型功能。
- 修改范围要小，优先完成可演示的小说转剧本闭环。
- 任何第三方依赖都要同步记录到 README。
- 任何生成的 YAML 输出结构都要能对应到后续提交的 YAML Schema。
- 发现竞赛硬约束与实现方案冲突时，优先满足竞赛硬约束。
- 任何时候都要保持/home/sikm/Competition/Noverl2Script/CLAUDE.md和/home/sikm/Competition/Noverl2Script/AGENTS.md内容一致
