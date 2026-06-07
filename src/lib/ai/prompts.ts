import type { ParsedChapter } from "@/lib/chapters/parseChapters";
import type { ScriptCharacter, ScriptLocation, ScriptScene } from "./types";

export type PromptPair = {
  system: string;
  user: string;
};

const commonContract = `通用输出契约：
- 只返回一个合法 JSON 对象，不要返回 Markdown、代码块、解释性文字或多余前后缀。
- 输出语言使用中文。
- 不要返回 null；可选字段无法确认时直接省略。
- 不要返回空字符串；必填字段必须给出有意义内容。
- 不要新增示例格式之外的字段。
- ID 必须使用指定格式，例如 chapter_001、character_001、location_001、scene_001。
- 引用型字段只能使用输入中给出的可用 ID，不要臆造不存在的 ID。
- 不要随意改变原文主线、人物关系和关键事件；必要的压缩、合并或推断应在改编说明阶段记录。`;

function systemPrompt(task: string): string {
  return `你是一位专业的小说改编剧本助手，擅长把小说章节转成可编辑、可拍摄的结构化剧本初稿。

${task}

${commonContract}`;
}

function formatChapters(chapters: ParsedChapter[]): string {
  return chapters
    .map(
      (chapter) => `【${chapter.id}｜第 ${chapter.order} 章｜${chapter.title}】
${chapter.content}`,
    )
    .join("\n\n---\n\n");
}

function formatCharacters(characters: ScriptCharacter[]): string {
  if (characters.length === 0) return "无可用人物 ID。";
  return characters
    .map(
      (character) =>
        `${character.id}: ${character.name}｜${character.role}｜${character.description}`,
    )
    .join("\n");
}

function formatLocations(locations: ScriptLocation[]): string {
  if (locations.length === 0) return "无可用地点 ID。";
  return locations
    .map(
      (location) => `${location.id}: ${location.name}｜${location.description}`,
    )
    .join("\n");
}

function formatScenes(scenes: ScriptScene[]): string {
  if (scenes.length === 0) return "暂无场景。";
  return scenes
    .map(
      (scene) =>
        `${scene.id}: ${scene.title}｜来源章节：${scene.chapter_source.join(", ")}｜摘要：${scene.summary}`,
    )
    .join("\n");
}

export function buildChapterSummaryPrompt(
  chapters: ParsedChapter[],
): PromptPair {
  return {
    system: systemPrompt(
      "当前任务：为每个输入章节生成改编用摘要和关键事件，作为后续人物抽取、场景拆分的稳定中间结果。",
    ),
    user: `以下是小说章节：

${formatChapters(chapters)}

请返回 {"chapters": [...]}，并遵守：
- 必须为每个输入章节返回 1 个对象，数量与输入章节完全一致。
- id、title、order 必须沿用输入章节，不要改名、重排或遗漏。
- summary 写 2-3 句话，包含本章核心事件、主要冲突、人物状态变化或悬念推进。
- key_events 写 3-6 条短语，优先提取后续可改编成场景的事件。
- 不要写读后感，不要泛泛总结主题。

返回格式：
{"chapters": [{"id": "chapter_001", "title": "...", "order": 1, "summary": "...", "key_events": ["事件1", "事件2"]}]}`,
  };
}

export function buildCharacterExtractionPrompt(
  chapters: ParsedChapter[],
): PromptPair {
  return {
    system: systemPrompt(
      "当前任务：建立人物表，保证后续场景、对白和人物编辑能使用稳定人物 ID。",
    ),
    user: `以下是小说章节：

${formatChapters(chapters)}

请返回 {"characters": [...]}，并遵守：
- 提取具名人物和对剧情有明确作用的人物，合并同一人物的别名、称谓和代称。
- 至少返回 1 个人物；如果原文没有明确姓名，使用“叙事主体”或最明确的身份称谓作为人物。
- id 从 character_001 开始连续编号，不要跳号。
- name 使用原文中最常见、最适合剧本显示的称呼。
- role 只能是 protagonist / antagonist / supporting / minor / unknown。
- description 写 1-2 句，包含身份、与主线关系、剧本功能。
- motivation 只在原文有依据或可从行为明确推断时填写。
- arc 写人物在这些章节中的变化方向；无法判断时省略，不要写 null。
- 不要把组织、地点、抽象概念当作人物。

返回格式：
{"characters": [{"id": "character_001", "name": "...", "role": "protagonist", "description": "...", "motivation": "...", "arc": "..."}]}`,
  };
}

export function buildLocationExtractionPrompt(
  chapters: ParsedChapter[],
): PromptPair {
  return {
    system: systemPrompt(
      "当前任务：建立地点表，地点必须能作为剧本场景发生地使用。",
    ),
    user: `以下是小说章节：

${formatChapters(chapters)}

请返回 {"locations": [...]}，并遵守：
- 只提取具体、可表演、可承载场景的地点或空间。
- 合并同一地点的不同叫法，不要重复。
- 至少返回 1 个地点；如果原文地点极不明确，使用“主要场景”作为兜底地点。
- id 从 location_001 开始连续编号，不要跳号。
- name 使用简洁地点名。
- description 写 1-2 句，说明空间特征、氛围和可用于场面调度的信息。
- 不要把人物、组织、抽象概念或纯时间词当作地点。

返回格式：
{"locations": [{"id": "location_001", "name": "...", "description": "..."}]}`,
  };
}

export function buildPlotSummaryPrompt(
  chapters: ParsedChapter[],
  characters: ScriptCharacter[],
): PromptPair {
  return {
    system: systemPrompt(
      "当前任务：根据章节和人物表生成供剧本改编使用的故事主线。",
    ),
    user: `以下是小说章节：

${formatChapters(chapters)}

已识别人物：
${formatCharacters(characters)}

请返回一个 JSON 对象，并遵守：
- logline：一句话故事钩子，尽量 30-45 个中文字符，包含主角、目标/困境、核心冲突。
- synopsis：4-6 句话，按“开端、冲突升级、关键转折、结尾方向”概括，不要只复述设定。
- central_conflict：明确写出主要对立力量或核心矛盾。
- themes：2-5 个主题词，必须来自故事内容，不要泛泛而谈。
- 不要改变原文主线，不要凭空增加重大设定。

返回格式：
{"logline": "...", "synopsis": "...", "central_conflict": "...", "themes": ["主题1", "主题2"]}`,
  };
}

export function buildSceneSplitPrompt(
  chapters: ParsedChapter[],
  characters: ScriptCharacter[],
  locations: ScriptLocation[],
): PromptPair {
  return {
    system: systemPrompt(
      "当前任务：把小说内容改编为剧本场景。场景必须可编辑、可表演，并能通过 Schema 校验。",
    ),
    user: `以下是小说章节：

${formatChapters(chapters)}

可用人物 ID：
${formatCharacters(characters)}

可用地点 ID：
${formatLocations(locations)}

请返回 {"scenes": [...]}，并遵守场景拆分规则：
- 每个输入章节至少生成 1 个场景。
- 每个章节通常生成 1-2 个场景；如果该章有明显地点切换、冲突升级或重要反转，可以生成 3 个场景。
- 总场景数不少于章节数，不超过章节数的 2 倍；短样例至少生成 3 个场景。
- 每个 chapter_id 必须至少出现在一个 scene.chapter_source 中。
- 可以把连续、同地点、同冲突目标的多个章节合并到同一场景，但合并后仍必须保证所有章节被 chapter_source 覆盖。

每个 scene 必须满足：
- id 使用 scene_NNN，从 scene_001 连续编号。
- title 是面向创作者可读的场景标题，不要只写“场景一”。
- chapter_source 使用来源章节 ID 数组，至少 1 个。
- location_id 必须来自可用地点 ID。
- time_of_day 写简洁时间段，例如“深夜”“清晨”“白天”“傍晚”。
- characters 必须至少包含 1 个可用人物 ID，不能返回空数组。
- summary 写 1-2 句，说明此场发生了什么。
- dramatic_purpose 写清本场的戏剧作用，例如“建立悬念”“推动冲突升级”“揭示人物选择”。
- beats 必须有 3-7 条。

beats 写作规则：
- 至少包含 1 条 action。
- action 必须是观众能看见或听见的行为、环境变化或场面调度，不要写纯心理描写。
- dialogue 用于推动冲突、揭示关系或表达选择，不要只解释设定。
- dialogue 必须包含 speaker_id，且 speaker_id 必须来自 characters 或可用人物 ID。
- narration 只在必要时使用，每个场景最多 1 条。
- transition 只在有明确节奏或视觉切换价值时使用，不要每场机械添加。
- 不要把小说摘要直接塞进 beats。
- 可以适度压缩和重排信息，但不要改变关键事件和人物关系。

返回格式：
{"scenes": [{"id": "scene_001", "title": "...", "chapter_source": ["chapter_001"], "location_id": "location_001", "time_of_day": "深夜", "characters": ["character_001"], "summary": "...", "dramatic_purpose": "...", "beats": [{"type": "action", "content": "..."}, {"type": "dialogue", "content": "...", "speaker_id": "character_001"}]}]}`,
  };
}

export function buildAdaptationNotesPrompt(
  chapters: ParsedChapter[],
  scenes: ScriptScene[],
): PromptPair {
  return {
    system: systemPrompt(
      "当前任务：审阅小说到剧本的改编结果，记录压缩、推断、不确定点和后续编辑建议。",
    ),
    user: `以下是小说章节：

${formatChapters(chapters)}

已生成场景：
${formatScenes(scenes)}

请返回 {"notes": [...]}，并遵守：
- 生成 2-6 条有实际价值的改编说明，不要泛泛表扬。
- type 只能是 assumption / uncertainty / editorial_suggestion / schema_note。
- assumption：记录改编时做出的合理推断或合并。
- uncertainty：记录原文不明确、需要作者确认的地方。
- editorial_suggestion：给出后续人工打磨建议。
- schema_note：说明结构化输出中的重要设计选择。
- related_scene_id 只在明确关联某个场景时填写，必须是已有 scene_id；没有关联时省略，不要写 null。

返回格式：
{"notes": [{"type": "assumption", "content": "...", "related_scene_id": "scene_001"}]}`,
  };
}
