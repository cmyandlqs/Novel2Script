# Novel2Script

AI 小说转剧本工具。项目面向小说作者，目标是把小说文本转换为可编辑、可继续打磨的 YAML 结构化剧本初稿；竞赛 Demo 使用 3 个章节以上的小说样例证明多章节处理能力。

## 当前状态

当前处于阶段 8：README、视频和最终提交准备中。

已具备：

- Next.js + TypeScript + Tailwind Web 工程骨架。
- 原创 3 章节小说样例。
- YAML 剧本输出 Schema。
- 章节解析，支持 1 章试用生成，并支持 3+ 章节竞赛 Demo。
- 多阶段生成 Pipeline（章节摘要 → 人物抽取 → 地点抽取 → 剧情梗概 → 场景拆分 → 改编说明）。
- 真实流式生成反馈，前端能看到每个 Pipeline 步骤的开始、完成和错误状态。
- Mock Provider（无需 API Key 即可演示）和 OpenAI 兼容 Provider。
- 前端大模型 API 配置面板（localStorage 持久化，热切换无需重启）。
- 文本上传入口，支持 `.txt`、`.md`、`.markdown`，自动检测 UTF-8 / GB18030 / GBK 编码。
- YAML 解析校验、Schema 校验（AJV）、业务规则校验（引用一致性、章节覆盖）。
- 质量评分面板（赛题合规性、结构完整度、可编辑性、引用一致性、章节覆盖度）。
- 可编辑剧本工作台：人物名称/描述、场景标题/摘要/时间段、beat 内容均可直接编辑，修改后 YAML 实时同步，并提示重新校验后导出。

后续阶段会完善示例数据、Demo 视频和最终提交。

## 快速开始

```bash
npm install
npm run dev
```

浏览器访问：

```text
http://localhost:3000
```

## 常用命令

| 命令                | 说明                     |
| ------------------- | ------------------------ |
| `npm run dev`       | 启动本地开发服务器       |
| `npm run build`     | 构建生产版本             |
| `npm run start`     | 启动生产服务器           |
| `npm run lint`      | 运行 ESLint              |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm test`          | 运行 Vitest 测试         |

## 关键目录

```text
src/app/                 # Next.js App Router 页面与 API（含 /api/generate、/api/generate/stream、/api/validate）
src/components/          # 工作台 UI 组件
src/lib/chapters/        # 章节解析与输入校验
src/lib/ai/              # AI Provider 接口、Mock Provider 和 Pipeline 编排
src/lib/validation/      # YAML 校验、Schema 校验和质量评分
schemas/                 # 剧本 YAML Schema
examples/                # 小说输入样例和 YAML 输出样例
docs/                    # 竞赛文档、开发计划、技术选型和项目状态
```

## 输入规则

当前章节解析支持：

- `第1章 标题`
- `第一章 标题`
- `Chapter 1 Title`
- Markdown 标题形式，例如 `## 第一章 标题`

产品允许识别到 1 个及以上章节时生成试用初稿。竞赛最终 Demo 和示例数据应使用 3 个及以上章节，以证明赛题要求的多章节处理能力。少于 3 章时，质量评分中的“竞赛 Demo 章节数量 ≥ 3”会提示不满足最终演示建议，但 Schema 结构校验仍可通过。

页面支持两种文本输入方式：

- 直接粘贴小说文本。
- 上传 `.txt`、`.md`、`.markdown` 文本文件。

## Provider 配置

生成 Pipeline 默认使用 Mock Provider（固定样例输出，无需 API Key）。

配置以下环境变量后可切换为真实 LLM 生成：

```bash
cp .env.example .env
# 编辑 .env 填入：
OPENAI_API_KEY=sk-...        # 必填
OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
OPENAI_MODEL=deepseek-v4-flash
```

## 依赖说明

运行时依赖：

- `next`、`react`、`react-dom`：Web 应用和 UI。
- `yaml`：YAML 序列化，将 Pipeline 生成的剧本对象输出为 YAML 文本。
- `ajv`：JSON Schema draft 2020-12 校验，用于验证生成结果是否符合 Schema。
- `openai`：OpenAI 兼容 Provider，通过环境变量配置 API Key 后使用真实模型生成。
- `lucide-react`：工具按钮图标。

开发依赖：

- `typescript`：类型检查。
- `tailwindcss`、`@tailwindcss/postcss`：样式系统。
- `eslint`、`eslint-config-next`：代码质量检查。
- `vitest`：单元测试。
- `prettier`：格式化工具。

## 原创功能说明

当前原创部分包括：

- YAML 剧本 Schema 设计。
- 原创三章节小说样例《雨夜档案》。
- 对应的结构化 YAML 剧本样例。
- 章节解析模块（支持中文/英文章节标题格式）。
- 多阶段生成 Pipeline 架构（GenerationProvider 接口 + MockProvider + OpenAIProvider）。
- 基于 SSE 的真实流式步骤反馈。
- 前端大模型 API 配置面板（localStorage 持久化，热切换无需重启）。
- 多编码文件上传（UTF-8 / GB18030 / GBK 自动检测）。
- YAML 校验模块（语法校验 + Schema 校验 + 业务规则校验）。
- 质量评分面板（5 个维度：赛题合规性、结构完整度、可编辑性、引用一致性、章节覆盖度）。
- 面向小说转剧本流程的工作台页面（含 Pipeline 步骤展示、中间产物、校验结果和评分）。

## YAML Schema

剧本输出契约位于 [`schemas/script.schema.json`](schemas/script.schema.json)，字段设计原因见 [`docs/YAML_Schema设计说明.md`](docs/YAML_Schema设计说明.md)。

## 示例输入与输出

- 原创示例：[`examples/sample-novel.md`](examples/sample-novel.md) → [`examples/output-script.yaml`](examples/output-script.yaml)
- 3+ 章节示例：[`examples/zhe-tian-chapter-1-3.md`](examples/zhe-tian-chapter-1-3.md) → [`examples/zhe-tian-output.yaml`](examples/zhe-tian-output.yaml)（辰东《遮天》前三章，仅作演示）

示例文件说明见 [`examples/README.md`](examples/README.md)。

## Demo 视频

竞赛最终提交前补充可访问 Demo 视频链接。
