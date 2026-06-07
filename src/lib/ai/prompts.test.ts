import { describe, expect, it } from "vitest";
import {
  buildAdaptationNotesPrompt,
  buildChapterSummaryPrompt,
  buildSceneSplitPrompt,
} from "./prompts";
import type { ParsedChapter } from "@/lib/chapters/parseChapters";
import type { ScriptCharacter, ScriptLocation, ScriptScene } from "./types";

const chapters: ParsedChapter[] = [
  {
    id: "chapter_001",
    order: 1,
    title: "第一章 雨中的包裹",
    heading: "## 第一章 雨中的包裹",
    content: "林舟在雨夜收到一个包裹。",
    charCount: 12,
  },
];

const characters: ScriptCharacter[] = [
  {
    id: "character_001",
    name: "林舟",
    role: "protagonist",
    description: "档案馆值夜班的人。",
  },
];

const locations: ScriptLocation[] = [
  {
    id: "location_001",
    name: "档案馆",
    description: "旧城区里潮湿安静的档案馆。",
  },
];

const scenes: ScriptScene[] = [
  {
    id: "scene_001",
    title: "雨夜包裹",
    chapter_source: ["chapter_001"],
    location_id: "location_001",
    time_of_day: "深夜",
    characters: ["character_001"],
    summary: "林舟发现包裹异常。",
    dramatic_purpose: "建立悬念。",
    beats: [{ type: "action", content: "雨水敲打窗户。" }],
  },
];

describe("prompt builders", () => {
  it("injects the common output contract into system prompts", () => {
    const prompt = buildSceneSplitPrompt(chapters, characters, locations);

    expect(prompt.system).toContain("只返回一个合法 JSON 对象");
    expect(prompt.system).toContain("不要返回 null");
    expect(prompt.system).toContain("不要臆造不存在的 ID");
  });

  it("keeps source chapter ids in chapter summary prompts", () => {
    const prompt = buildChapterSummaryPrompt(chapters);

    expect(prompt.user).toContain("chapter_001");
    expect(prompt.user).toContain("id、title、order 必须沿用输入章节");
    expect(prompt.user).toContain("key_events 写 3-6 条短语");
  });

  it("formats character and location ids into scene split prompts", () => {
    const prompt = buildSceneSplitPrompt(chapters, characters, locations);

    expect(prompt.user).toContain("character_001: 林舟");
    expect(prompt.user).toContain("location_001: 档案馆");
    expect(prompt.user).toContain("characters 必须至少包含 1 个可用人物 ID");
  });

  it("requires adaptation note scene references to use existing scene ids", () => {
    const prompt = buildAdaptationNotesPrompt(chapters, scenes);

    expect(prompt.user).toContain("scene_001: 雨夜包裹");
    expect(prompt.user).toContain(
      "related_scene_id 只在明确关联某个场景时填写",
    );
    expect(prompt.user).toContain("没有关联时省略，不要写 null");
  });
});
