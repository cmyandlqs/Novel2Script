# Noverl2Script

AI 小说转剧本工具。项目面向小说作者，目标是把 3 个章节以上的小说文本转换为可编辑、可继续打磨的 YAML 结构化剧本初稿。

## 当前状态

当前处于阶段 4：多阶段 Agent Pipeline（Mock Pipeline 已完成）。

已具备：

- Next.js + TypeScript + Tailwind Web 工程骨架。
- 原创 3 章节小说样例。
- YAML 剧本输出 Schema。
- 章节解析与 3+ 章节输入校验。
- Mock 多阶段生成 Pipeline（章节摘要 → 人物抽取 → 地点抽取 → 场景拆分 → YAML 输出）。
- 页面展示 Pipeline 步骤、人物表和场景列表等中间产物。

后续阶段会实现真实 LLM Provider、Schema 校验面板和结构化编辑工作台。

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

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm test` | 运行 Vitest 测试 |

## 关键目录

```text
src/app/                 # Next.js App Router 页面与 API（含 /api/generate）
src/components/          # 工作台 UI 组件
src/lib/chapters/        # 章节解析与 3+ 章节输入校验
src/lib/ai/              # AI Provider 接口、Mock Provider 和 Pipeline 编排
schemas/                 # 剧本 YAML Schema
examples/                # 原创小说输入样例和 YAML 输出样例
docs/                    # 竞赛文档、开发计划、技术选型和项目状态
```

## 输入规则

当前章节解析支持：

- `第1章 标题`
- `第一章 标题`
- `Chapter 1 Title`
- Markdown 标题形式，例如 `## 第一章 标题`

输入必须识别到至少 3 个章节。少于 3 个章节时，页面会阻止生成初稿并显示错误提示。

## 依赖说明

运行时依赖：

- `next`、`react`、`react-dom`：Web 应用和 UI。
- `yaml`：YAML 序列化，将 Pipeline 生成的剧本对象输出为 YAML 文本。
- `ajv`：后续用于 JSON Schema 校验。
- `openai`：后续用于真实 LLM Provider。
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
- 多阶段生成 Pipeline 架构（GenerationProvider 接口 + MockProvider）。
- 面向小说转剧本流程的工作台页面（含 Pipeline 步骤展示和中间产物）。

## Demo 视频

竞赛最终提交前补充可访问 Demo 视频链接。
