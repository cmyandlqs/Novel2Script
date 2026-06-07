# YAML Schema 设计说明

## 目的

本项目的竞赛硬约束要求输出 YAML 格式的结构化剧本，并额外提交 YAML Schema 定义文档，说明 Schema 的设计原因。

本文说明 `schemas/script.schema.json` 的第一版设计。该 Schema 用于约束由 1 个及以上章节小说文本改编得到的 YAML 剧本初稿，目标是让输出可解析、可校验、可编辑、可导出，并能支持后续质量评分和 Demo 展示。竞赛最终 Demo 应使用 3 个章节以上的样例来证明赛题要求的多章节处理能力。

## 文件位置

```text
schemas/script.schema.json      # 剧本 YAML 对应的 JSON Schema
examples/sample-novel.md        # 原创 3 章节小说输入样例
examples/output-script.yaml     # 符合 Schema 的 YAML 剧本输出样例
```

## 设计原则

### 1. 满足赛题硬约束

Schema 明确要求：

- `source.chapter_count` 不少于 1。
- `source.chapters` 不少于 1 个章节。
- 输出主体必须包含 `characters`、`locations`、`plot_summary` 和 `scenes`。
- `scenes` 必须包含剧本内容 `beats`。

这样可以把“输出结构化剧本”从文字要求落到可校验结构。赛题要求的 3 个章节以上能力不作为 Schema 硬门槛，而是在质量评分和 Demo 验收中单独检查，避免产品在 1-2 章试用场景下无法生成合法 YAML。

### 2. 保持剧本初稿可编辑

剧本初稿不是最终定稿，小说作者需要继续调整人物、场景、动作和对白。

因此 Schema 使用结构化字段，而不是把整段剧本塞进一个大文本字段：

- 人物放入 `characters`。
- 地点放入 `locations`。
- 场景放入 `scenes`。
- 动作、对白、旁白、转场放入 `beats`。

后续 UI 可以按这些结构提供表单编辑、场景编辑和 YAML 预览。

### 3. 使用稳定 ID 管理引用

Schema 统一使用形如 `character_001`、`scene_001`、`chapter_001` 的 ID。

这样做的原因：

- 同一人物在多场景中可以稳定引用。
- 场景可以明确对应来源章节。
- 对白 speaker 可以引用人物 ID。
- 后续可做人物引用一致性校验。
- 编辑或重排场景时，不依赖显示名称判断对象身份。

### 4. 保留原文到剧本的映射

每个 `scene` 都要求包含 `chapter_source`，每个 `beat` 也可以通过 `source_ref` 标注来源章节。

这样可以帮助评估：

- 剧本是否覆盖原文关键章节。
- 改编是否忠实于小说主线。
- 新增或改写内容是否服务剧本表达。

这也能在 Demo 中展示“从小说章节到剧本场景”的转换链路。

### 5. 支持剧本化表达

`beats.type` 使用有限枚举：

- `action`：可表演动作或场面调度。
- `dialogue`：对白，必须包含 `speaker_id`。
- `narration`：少量必要旁白或屏幕文字。
- `transition`：场景转场或节奏提示。

这能减少模型输出大段小说式摘要，推动输出更接近可编辑剧本。

### 6. 第一版不过度复杂

第一版 Schema 不包含镜号、机位、分镜、预算、拍摄计划、服化道等复杂字段。

原因：

- 赛题要求的是剧本初稿，不是完整制片方案。
- 过细字段会增加生成失败概率。
- 第一版优先保证核心闭环稳定：输入、生成、校验、编辑、导出。

## 顶层结构说明

### metadata

描述剧本输出的基础信息。

核心字段：

- `title`：剧本标题。
- `schema_version`：Schema 版本，便于后续升级。
- `draft_type`：固定为 `screenplay_draft`，明确这是剧本初稿。
- `language`：输出语言。
- `genre`：类型，例如悬疑、都市、奇幻。
- `target_format`：目标剧本形态，例如短剧、电影、舞台剧。

### source

描述输入小说来源和章节摘要。

核心字段：

- `chapter_count`：章节数量，最小值为 1。
- `chapters`：章节数组，最少 1 个。
- `overall_summary`：整体小说摘要。

该结构支撑输入结构合法性、竞赛合规性和章节覆盖率评估。

### characters

描述人物表。

核心字段：

- `id`：人物稳定 ID。
- `name`：人物名。
- `role`：人物定位，例如主角、反派、配角。
- `description`：人物描述。
- `motivation`：人物动机。
- `arc`：人物变化。

人物表是跨章节一致性的基础。

### locations

描述地点表。

核心字段：

- `id`：地点稳定 ID。
- `name`：地点名称。
- `description`：地点描述。

地点表用于避免同一地点在不同场景中命名混乱。

### plot_summary

描述整体故事。

核心字段：

- `logline`：一句话故事钩子。
- `synopsis`：故事梗概。
- `central_conflict`：核心冲突。
- `themes`：主题关键词。

该结构便于用户快速判断生成剧本是否抓住原文主线。

### scenes

描述剧本场景列表。

核心字段：

- `id`：场景稳定 ID。
- `title`：场景标题。
- `chapter_source`：来源章节 ID。
- `location_id`：地点 ID。
- `time_of_day`：时间。
- `characters`：出场人物 ID。
- `summary`：场景摘要。
- `dramatic_purpose`：戏剧目的。
- `beats`：场景内动作、对白、旁白和转场。

场景是剧本输出的核心编辑单元。

### beats

描述场景内的具体剧本内容。

核心字段：

- `type`：动作、对白、旁白或转场。
- `speaker_id`：对白说话人，仅 dialogue 类型必填。
- `content`：剧本内容。
- `emotion`：对白或动作情绪，可选。
- `source_ref`：来源章节引用，可选。

beats 让剧本内容可以逐条编辑，而不是只能修改整段文本。

### adaptation_notes

记录改编说明、模型假设和人工待确认事项。

该字段用于提高输出可解释性，方便作者继续打磨。

## 第一版 Schema 的已知边界

当前 Schema 只校验结构层面的合法性，例如字段类型、必填字段、枚举值和章节数量。

以下规则需要后续用业务校验补充：

- `scene.characters` 中的角色 ID 必须存在于 `characters`。
- `scene.location_id` 必须存在于 `locations`。
- `scene.chapter_source` 必须存在于 `source.chapters`。
- `dialogue.speaker_id` 必须存在于当前场景人物或全局人物表。
- `source.chapter_count` 应等于 `source.chapters.length`。

这些检查会在开发计划阶段 5 的 YAML 校验与质量评分中实现。

## 示例说明

`examples/sample-novel.md` 是原创 3 章节小说样例，满足赛题最终 Demo 输入规模要求。

`examples/output-script.yaml` 是该小说对应的剧本 YAML 示例，覆盖：

- 3 个来源章节。
- 人物表。
- 地点表。
- 故事梗概。
- 3 个主要剧本场景。
- 动作、对白、旁白、转场 beats。
- 来源章节映射。
- 改编说明。

该示例用于后续开发中的 Schema 校验、UI 预览、Demo 演示和测试样例。
