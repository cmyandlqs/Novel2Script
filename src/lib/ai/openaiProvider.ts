import OpenAI from "openai";
import type { ParsedChapter } from "@/lib/chapters/parseChapters";
import type { GenerationProvider } from "./provider";
import type {
  ScriptChapter,
  ScriptCharacter,
  ScriptLocation,
  ScriptPlotSummary,
  ScriptScene,
  AdaptationNote,
} from "./types";

export class OpenAIProvider implements GenerationProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY 环境变量未设置。");
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL ?? "https://opencode.ai/zen/go/v1",
    });
    this.model = process.env.OPENAI_MODEL ?? "deepseek-v4-flash";
  }

  private async callLlm(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<unknown> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("模型返回了空响应。");
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new Error("模型返回的内容不是合法 JSON。");
    }
  }

  async summarizeChapters(chapters: ParsedChapter[]): Promise<ScriptChapter[]> {
    const data = await this.callLlm(
      "你是一位专业的小说改编剧本助手。用户会提供多个章节，请为每个章节生成摘要和关键事件。返回 JSON 对象，包含一个 chapters 数组。输出内容使用中文。",
      `以下是小说章节：\n\n${formatChapters(chapters)}\n\n请为每个章节生成：\n1. summary：2-3 句话的内容摘要\n2. key_events：关键事件列表（短语）\n\n返回格式：{"chapters": [{"id": "chapter_001", "title": "...", "order": 1, "summary": "...", "key_events": ["事件1", "事件2"]}]}`,
    );

    const result = data as { chapters: ScriptChapter[] };
    return result.chapters;
  }

  async extractCharacters(
    chapters: ParsedChapter[],
  ): Promise<ScriptCharacter[]> {
    const data = await this.callLlm(
      "你是一位专业的小说改编剧本助手。请从小说章节中提取所有具名人物。返回 JSON 对象，包含一个 characters 数组。输出内容使用中文。",
      `以下是小说章节：\n\n${formatChapters(chapters)}\n\n请提取所有具名人物，为每个人物提供：\n- id："character_NNN" 格式\n- name：人物姓名\n- role：protagonist / antagonist / supporting / minor / unknown\n- description：1-2 句人物描述\n- motivation：（可选）人物动机\n- arc：（可选）人物弧线\n\n返回格式：{"characters": [{"id": "character_001", "name": "...", "role": "protagonist", "description": "...", "motivation": "...", "arc": "..."}]}`,
    );

    const result = data as { characters: ScriptCharacter[] };
    return result.characters;
  }

  async extractLocations(chapters: ParsedChapter[]): Promise<ScriptLocation[]> {
    const data = await this.callLlm(
      "你是一位专业的小说改编剧本助手。请从小说章节中提取所有重要地点。返回 JSON 对象，包含一个 locations 数组。输出内容使用中文。",
      `以下是小说章节：\n\n${formatChapters(chapters)}\n\n请提取所有重要地点，为每个地点提供：\n- id："location_NNN" 格式\n- name：地点名称\n- description：1-2 句描述\n\n返回格式：{"locations": [{"id": "location_001", "name": "...", "description": "..."}]}`,
    );

    const result = data as { locations: ScriptLocation[] };
    return result.locations;
  }

  async generatePlotSummary(
    chapters: ParsedChapter[],
    characters: ScriptCharacter[],
  ): Promise<ScriptPlotSummary> {
    const characterList = characters
      .map((c) => `${c.name}（${c.role}）`)
      .join("、");

    const data = await this.callLlm(
      "你是一位专业的小说改编剧本助手。请根据小说章节和人物信息生成剧情梗概。返回 JSON 对象。输出内容使用中文。",
      `以下是小说章节：\n\n${formatChapters(chapters)}\n\n主要人物：${characterList}\n\n请生成：\n- logline：一句话故事核心（30 字以内）\n- synopsis：3-5 句剧情概述\n- central_conflict：核心冲突\n- themes：主题词列表\n\n返回格式：{"logline": "...", "synopsis": "...", "central_conflict": "...", "themes": ["主题1", "主题2"]}`,
    );

    return data as ScriptPlotSummary;
  }

  async splitScenes(
    chapters: ParsedChapter[],
    characters: ScriptCharacter[],
    locations: ScriptLocation[],
  ): Promise<ScriptScene[]> {
    const characterIds = characters.map((c) => `${c.id}: ${c.name}`).join("\n");
    const locationIds = locations.map((l) => `${l.id}: ${l.name}`).join("\n");

    const data = await this.callLlm(
      "你是一位专业的小说改编剧本助手。请将小说内容拆分为剧本场景，每个场景包含 beats（动作、对白、旁白、转场）。返回 JSON 对象，包含一个 scenes 数组。输出内容使用中文。注意：对白类型的 beat 必须包含 speaker_id 字段。",
      `以下是小说章节：\n\n${formatChapters(chapters)}\n\n可用人物 ID：\n${characterIds}\n\n可用地点 ID：\n${locationIds}\n\n请将故事拆分为 3-6 个场景。每个场景包含：\n- id："scene_NNN" 格式\n- title：场景标题\n- chapter_source：来源章节 ID 数组\n- location_id：使用的地点 ID\n- time_of_day：时间段（如"深夜"、"清晨"、"白天"）\n- characters：出场人物 ID 数组\n- summary：1-2 句场景摘要\n- dramatic_purpose：场景的戏剧作用\n- beats：剧本节拍数组，每个 beat 包含 type（action/dialogue/narration/transition）、content、speaker_id（dialogue 类型必填）\n\n返回格式：{"scenes": [{"id": "scene_001", "title": "...", "chapter_source": ["chapter_001"], "location_id": "location_001", "time_of_day": "深夜", "characters": ["character_001"], "summary": "...", "dramatic_purpose": "...", "beats": [{"type": "action", "content": "..."}, {"type": "dialogue", "content": "...", "speaker_id": "character_001"}]}]}`,
    );

    const result = data as { scenes: ScriptScene[] };
    return result.scenes;
  }

  async generateAdaptationNotes(
    chapters: ParsedChapter[],
    scenes: ScriptScene[],
  ): Promise<AdaptationNote[]> {
    const sceneList = scenes
      .map((s) => `${s.id}: ${s.title} — ${s.summary}`)
      .join("\n");

    const data = await this.callLlm(
      "你是一位专业的小说改编剧本助手。请审阅从小说到剧本的改编结果，标注需要注意的事项。返回 JSON 对象，包含一个 notes 数组。输出内容使用中文。",
      `以下是小说章节：\n\n${formatChapters(chapters)}\n\n生成的场景：\n${sceneList}\n\n请标注：\n- assumption：改编中做出的假设\n- uncertainty：不确定需要人工确认的部分\n- editorial_suggestion：编辑建议\n- schema_note：结构说明\n\n每条包含 type、content、related_scene_id（可选）。\n\n返回格式：{"notes": [{"type": "assumption", "content": "...", "related_scene_id": "scene_001"}]}`,
    );

    const result = data as { notes: AdaptationNote[] };
    return result.notes;
  }
}

function formatChapters(chapters: ParsedChapter[]): string {
  return chapters
    .map((ch) => `【${ch.id}】${ch.title}\n\n${ch.content}`)
    .join("\n\n---\n\n");
}
