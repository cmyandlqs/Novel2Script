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

export class MockProvider implements GenerationProvider {
  name = "mock";

  async summarizeChapters(chapters: ParsedChapter[]): Promise<ScriptChapter[]> {
    return chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
      summary: `本章讲述了与「${ch.title}」相关的核心事件。`,
    }));
  }

  async extractCharacters(
    _chapters: ParsedChapter[],
  ): Promise<ScriptCharacter[]> {
    return [
      {
        id: "character_001",
        name: "主角",
        role: "protagonist",
        description: "故事的核心人物，贯穿全部章节。",
      },
      {
        id: "character_002",
        name: "配角",
        role: "supporting",
        description: "协助推进故事发展的重要角色。",
      },
    ];
  }

  async extractLocations(
    _chapters: ParsedChapter[],
  ): Promise<ScriptLocation[]> {
    return [
      {
        id: "location_001",
        name: "主要场景",
        description: "故事发生的核心地点。",
      },
    ];
  }

  async generatePlotSummary(
    _chapters: ParsedChapter[],
    _characters: ScriptCharacter[],
  ): Promise<ScriptPlotSummary> {
    return {
      logline: "一个关于追寻真相的故事。",
      synopsis: "主人公在偶然发现线索后，踏上了揭开谜团的旅程，最终面临意想不到的抉择。",
      central_conflict: "真相与隐瞒之间的冲突。",
      themes: ["真相", "选择", "成长"],
    };
  }

  async splitScenes(
    chapters: ParsedChapter[],
    characters: ScriptCharacter[],
    locations: ScriptLocation[],
  ): Promise<ScriptScene[]> {
    const fallbackCharId = characters[0]?.id ?? "character_001";
    const fallbackLocId = locations[0]?.id ?? "location_001";

    return chapters.slice(0, 3).map((ch, i) => ({
      id: `scene_${String(i + 1).padStart(3, "0")}`,
      title: `场景 ${i + 1}`,
      chapter_source: [ch.id],
      location_id: fallbackLocId,
      time_of_day: i === 0 ? "深夜" : "白天",
      characters: characters.slice(0, 1).map((c) => c.id),
      summary: `来自第 ${i + 1} 章「${ch.title}」的关键场景。`,
      dramatic_purpose: "推进故事发展，揭示关键信息。",
      beats: [
        {
          type: "action",
          content: "角色进入场景，环顾四周。",
        },
        {
          type: "dialogue",
          content: "这里有些不对劲。",
          speaker_id: fallbackCharId,
        },
        {
          type: "narration",
          content: "故事在这一刻发生了转折。",
        },
      ],
    }));
  }

  async generateAdaptationNotes(
    _chapters: ParsedChapter[],
    _scenes: ScriptScene[],
  ): Promise<AdaptationNote[]> {
    return [
      {
        type: "schema_note",
        content:
          "本剧本由 Mock Provider 生成，仅供展示结构化输出能力。接入真实模型后将生成基于原文的改编内容。",
      },
    ];
  }
}
