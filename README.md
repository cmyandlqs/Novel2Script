# Novel2Script

AI 小说转剧本工具。项目面向小说作者，目标是把小说文本转换为可编辑、可继续打磨的 YAML 结构化剧本初稿；竞赛 Demo 使用 3 个章节以上的小说样例证明多章节处理能力。

## Demo 视频

- [点击查看 Demo 视频](assets/demo.mp4)

## YAML Schema

剧本输出契约位于 [`schemas/script.schema.json`](schemas/script.schema.json)，字段设计原因见 [`docs/YAML_Schema设计说明.md`](docs/YAML_Schema设计说明.md)。

## 示例输入与输出

- 原创示例：[`examples/sample-novel.md`](examples/sample-novel.md) → [`examples/output-script.yaml`](examples/output-script.yaml)
- 3+ 章节示例：[`examples/zhe-tian-chapter-1-3.md`](examples/zhe-tian-chapter-1-3.md) → [`examples/zhe-tian-output.yaml`](examples/zhe-tian-output.yaml)（辰东《遮天》前三章，仅作演示）

示例文件说明见 [`examples/README.md`](examples/README.md)。

## 工作台截图

<img src="assets/novel2script-workbench.png" alt="Novel2Script 工作台截图" width="60%" />

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

## 原创功能说明

当前原创部分包括：

- YAML 剧本 Schema 设计。
- 原创三章节小说样例《雨夜档案》。
- 对应的结构化 YAML 剧本样例。
- 章节解析模块（支持中文/英文章节标题格式）。
- 多阶段生成 Pipeline 架构（GenerationProvider 接口 + MockProvider + OpenAIProvider）。
- 基于 SSE 的真实流式步骤反馈。
- 前端大模型 API 配置面板（服务端模型状态展示，支持会话级 API Key 覆盖）。
- 多编码文件上传（UTF-8 / GB18030 / GBK 自动检测）。
- YAML 校验模块（语法校验 + Schema 校验 + 业务规则校验）。
- 质量评分面板（5 个维度：赛题合规性、结构完整度、可编辑性、引用一致性、章节覆盖度）。
- 面向小说转剧本流程的工作台页面（含 Pipeline 步骤展示、中间产物、校验结果和评分）。
