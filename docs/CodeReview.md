# Code Review 报告

审查日期：2026-06-06
审查范围：全部源码（src/、schemas/、examples/、docs/、配置文件）
审查基准：竞赛硬约束合规性、代码正确性、健壮性、安全性、架构合理性

## 一、正确性问题

### 🔴 P1：Pipeline 出错步骤后仍继续执行并组装 draft

文件：`src/lib/ai/pipeline.ts`

当某个步骤出错时，`runStep` 返回 `result: undefined as T`，但后续步骤和最终的 `draft` 组装仍会继续。如果 `extract_characters` 失败，`characters` 为 `undefined`，后续 `splitScenes` 和 `draft` 组装会产生运行时错误或生成不完整的 draft。

修复方案：任何步骤失败后，后续步骤应跳过，`draft` 中用空数组/默认值替代 `undefined`。

状态：✅ 已修复

### 🟡 P2：OpenAI Provider 每次 method call 都创建新 client

文件：`src/lib/ai/openaiProvider.ts:16-20`

`createClient()` 在每次 `callLlm` 调用时都 `new OpenAI()`。6 步 Pipeline 会创建 6 个 client 实例。

修复方案：在 provider 构造时创建一次 client，复用。

状态：✅ 已修复

## 二、健壮性问题

### 🟡 P3：MockProvider 中 `characters.slice(0, 1)` 和 `locations[0]` 无防御

文件：`src/lib/ai/mockProvider.ts:89-90`

如果 `characters` 或 `locations` 为空数组，`characters[0].id` 和 `locations[0].id` 会抛出 `TypeError`。

修复方案：添加空数组保护。

状态：✅ 已修复

### 🟡 P4：API 路由中 `title` 参数未做长度限制

文件：`src/app/api/generate/route.ts:30-31`

`title` 直接传入 `runPipeline`，无长度校验。

修复方案：截断为最大 200 字符。

状态：✅ 已修复

## 三、架构与代码组织

### 🟡 P5：`ScriptWorkbench.tsx` 已达 656 行，职责过多

文件：`src/components/ScriptWorkbench.tsx`

同时包含：小说输入状态管理、Pipeline 调用、校验逻辑、YAML 序列化、编辑处理函数、所有 UI 渲染。

建议：后续迭代时抽取 `useDraftEditor` hook 和子组件。当前不紧急。

状态：不阻塞，后续改进

### 🟢 P6：Provider 接口设计清晰

`GenerationProvider` 接口 + `MockProvider` + `OpenAIProvider` 实现同一接口，`createProvider()` 按环境变量切换。架构合理，易于扩展。

状态：无需修改

## 四、竞赛合规性

### ✅ 完全合规项

- `.gitignore` 正确排除 `.env`、构建产物、IDE 配置
- `.env.example` 存在且不含真实密钥
- README 列明了所有运行时和开发时依赖
- README 有"原创功能说明"段落
- PR 记录持续（13 个 PR），commit 时间戳连续
- 每个 PR 标题清晰、描述包含功能/思路/测试
- YAML Schema 文档存在
- 示例数据均为原创《雨夜档案》

### 🟡 P7：README 缺少 Demo 视频链接

`README.md` 底部仍为"竞赛最终提交前补充可访问 Demo 视频链接"。阶段 8 必须补上。

状态：阶段 8 处理

### 🟡 P8：`package.json` 依赖使用 `latest`

所有依赖版本固定为 `"latest"`，不同时间安装可能产生不同版本。`package-lock.json` 中已锁定，问题不大。

状态：不阻塞，后续改进

## 五、安全性

### ✅ 无安全问题

- 无密钥提交
- API Key 仅通过环境变量注入
- OpenAI Provider 在服务端 API 路由中使用
- 输入校验到位

## 六、测试覆盖

| 模块 | 测试数 | 覆盖情况 |
|---|---|---|
| 章节解析 | 6 | ✅ 完整 |
| Pipeline（Mock） | 7 | ✅ 完整 |
| YAML 校验 | 7 | ✅ 完整 |
| Demo 质量验证 | 4 | ✅ 示例数据覆盖 |
| **总计** | **24** | |
| OpenAI Provider | 0 | 需真实 API Key，合理跳过 |
| 评分模块 | 0 | 通过 demo.test 间接覆盖 |
| API 路由 | 0 | 手动验证 |

## 七、修复计划

| 编号 | 优先级 | 修复内容 | 状态 |
|---|---|---|---|
| P1 | 🔴 高 | Pipeline 错误传播：失败步骤后停止，用默认值填充 draft | ✅ 已修复 |
| P2 | 🟡 中 | OpenAI Provider 复用 client 实例 | ✅ 已修复 |
| P3 | 🟡 中 | MockProvider 空数组防御 | ✅ 已修复 |
| P4 | 🟡 中 | API 路由 title 长度限制 | ✅ 已修复 |
| P5 | 🟡 低 | ScriptWorkbench 组件拆分 | 不阻塞 |
| P6 | — | Provider 接口设计（无问题） | 无需修改 |
| P7 | 🟡 中 | README Demo 视频链接 | 阶段 8 处理 |
| P8 | 🟡 低 | package.json 版本固定 | 不阻塞 |
