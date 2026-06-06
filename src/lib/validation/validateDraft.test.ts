import { describe, expect, it } from "vitest";
import { validateDraft } from "./validateDraft";
import YAML from "yaml";

const validDraft = {
  metadata: {
    title: "测试作品",
    schema_version: "1.0.0",
    draft_type: "screenplay_draft",
    language: "zh-CN",
  },
  source: {
    chapter_count: 3,
    chapters: [
      { id: "chapter_001", title: "第一章", order: 1, summary: "摘要一" },
      { id: "chapter_002", title: "第二章", order: 2, summary: "摘要二" },
      { id: "chapter_003", title: "第三章", order: 3, summary: "摘要三" },
    ],
  },
  characters: [
    { id: "character_001", name: "林舟", role: "protagonist", description: "主角" },
  ],
  locations: [
    { id: "location_001", name: "档案馆", description: "旧城区档案馆" },
  ],
  plot_summary: {
    logline: "一句话故事。",
    synopsis: "剧情概述。",
    central_conflict: "核心冲突。",
  },
  scenes: [
    {
      id: "scene_001",
      title: "场景一",
      chapter_source: ["chapter_001"],
      location_id: "location_001",
      time_of_day: "深夜",
      characters: ["character_001"],
      summary: "场景摘要。",
      dramatic_purpose: "引入主角。",
      beats: [
        { type: "action", content: "林舟走入档案馆。" },
        { type: "dialogue", content: "你好。", speaker_id: "character_001" },
      ],
    },
  ],
};

describe("validateDraft", () => {
  it("passes a valid YAML draft", () => {
    const yamlText = YAML.stringify(validDraft);
    const result = validateDraft(yamlText);

    expect(result.yamlValid).toBe(true);
    expect(result.schemaValid).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it("detects invalid YAML syntax", () => {
    const result = validateDraft("metadata: [broken\n  bad indent");

    expect(result.yamlValid).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items[0].message).toContain("YAML 解析失败");
  });

  it("detects non-object YAML content", () => {
    const result = validateDraft("just a string");

    expect(result.yamlValid).toBe(false);
    expect(result.items[0].message).toContain("不是合法的对象");
  });

  it("detects missing required fields", () => {
    const incomplete = { metadata: { title: "测试" } };
    const yamlText = YAML.stringify(incomplete);
    const result = validateDraft(yamlText);

    expect(result.schemaValid).toBe(false);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items.some((i) => i.path !== "")).toBe(true);
  });

  it("detects dialogue beats missing speaker_id", () => {
    const draft = structuredClone(validDraft);
    draft.scenes[0].beats.push({
      type: "dialogue",
      content: "没有说话人。",
    } as { type: string; content: string });
    const yamlText = YAML.stringify(draft);
    const result = validateDraft(yamlText);

    expect(result.valid).toBe(false);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it("detects invalid character references in scenes", () => {
    const draft = structuredClone(validDraft);
    draft.scenes[0].characters = ["character_999"];
    const yamlText = YAML.stringify(draft);
    const result = validateDraft(yamlText);

    const warnings = result.items.filter((i) =>
      i.message.includes("不存在的人物 ID"),
    );
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects invalid chapter_source references", () => {
    const draft = structuredClone(validDraft);
    draft.scenes[0].chapter_source = ["chapter_999"];
    const yamlText = YAML.stringify(draft);
    const result = validateDraft(yamlText);

    const warnings = result.items.filter((i) =>
      i.message.includes("不存在的章节 ID"),
    );
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });
});
