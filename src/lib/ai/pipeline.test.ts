import { describe, expect, it } from "vitest";
import { MockProvider } from "./mockProvider";
import { runPipeline } from "./pipeline";
import type { ParsedChapter } from "@/lib/chapters/parseChapters";

const sampleChapters: ParsedChapter[] = [
  {
    id: "chapter_001",
    order: 1,
    title: "第一章 雨中的包裹",
    heading: "## 第一章 雨中的包裹",
    content: "林舟在旧城区的档案馆值夜班。",
    charCount: 12,
  },
  {
    id: "chapter_002",
    order: 2,
    title: "第二章 被删掉的城市",
    heading: "## 第二章 被删掉的城市",
    content: "第二天清晨，林舟打开硬盘。",
    charCount: 10,
  },
  {
    id: "chapter_003",
    order: 3,
    title: "第三章 钟楼里的名单",
    heading: "## 第三章 钟楼里的名单",
    content: "林舟和许澄在雨后的城市边缘找到钟楼。",
    charCount: 16,
  },
];

const fourChapters: ParsedChapter[] = [
  ...sampleChapters,
  {
    id: "chapter_004",
    order: 4,
    title: "第四章 新的线索",
    heading: "## 第四章 新的线索",
    content: "林舟发现名单背后还有一条新的线索。",
    charCount: 16,
  },
];

describe("runPipeline with MockProvider", () => {
  const provider = new MockProvider();

  it("returns a complete pipeline result", async () => {
    const result = await runPipeline(provider, sampleChapters, "测试作品");

    expect(result.draft.metadata.title).toBe("测试作品");
    expect(result.draft.metadata.schema_version).toBe("1.0.0");
    expect(result.draft.metadata.draft_type).toBe("screenplay_draft");
    expect(result.draft.metadata.language).toBe("zh-CN");
    expect(result.draft.source.chapter_count).toBe(3);
  });

  it("runs all six pipeline steps", async () => {
    const result = await runPipeline(provider, sampleChapters);

    expect(result.steps).toHaveLength(6);
    expect(result.steps.map((s) => s.step)).toEqual([
      "summarize",
      "extract_characters",
      "extract_locations",
      "plot_summary",
      "split_scenes",
      "adaptation_notes",
    ]);
  });

  it("emits real start and done events for every pipeline step", async () => {
    const events: string[] = [];

    await runPipeline(provider, sampleChapters, "测试作品", {
      onStepStart(step) {
        events.push(`start:${step.step}`);
      },
      onStepDone(step) {
        events.push(`done:${step.step}:${step.status}`);
      },
    });

    expect(events).toEqual([
      "start:summarize",
      "done:summarize:completed",
      "start:extract_characters",
      "done:extract_characters:completed",
      "start:extract_locations",
      "done:extract_locations:completed",
      "start:plot_summary",
      "done:plot_summary:completed",
      "start:split_scenes",
      "done:split_scenes:completed",
      "start:adaptation_notes",
      "done:adaptation_notes:completed",
    ]);
  });

  it("all steps complete without error", async () => {
    const result = await runPipeline(provider, sampleChapters);

    for (const step of result.steps) {
      expect(step.status).toBe("completed");
      expect(step.duration_ms).toBeGreaterThanOrEqual(0);
      expect(step.error).toBeUndefined();
    }
  });

  it("produces chapter summaries matching input chapters", async () => {
    const result = await runPipeline(provider, sampleChapters);

    expect(result.draft.source.chapters).toHaveLength(3);
    expect(result.draft.source.chapters[0].id).toBe("chapter_001");
    expect(result.draft.source.chapters[0].title).toBe("第一章 雨中的包裹");
  });

  it("produces at least one character", async () => {
    const result = await runPipeline(provider, sampleChapters);

    expect(result.draft.characters.length).toBeGreaterThanOrEqual(1);
    expect(result.draft.characters[0].id).toBe("character_001");
    expect(result.draft.characters[0].name).toBeTruthy();
  });

  it("produces at least one scene with beats", async () => {
    const result = await runPipeline(provider, sampleChapters);

    expect(result.draft.scenes.length).toBeGreaterThanOrEqual(1);
    const scene = result.draft.scenes[0];
    expect(scene.id).toBeTruthy();
    expect(scene.chapter_source).toContain("chapter_001");
    expect(scene.beats.length).toBeGreaterThanOrEqual(1);
  });

  it("includes adaptation notes", async () => {
    const result = await runPipeline(provider, sampleChapters);

    expect(result.draft.adaptation_notes).toBeDefined();
    expect(result.draft.adaptation_notes!.length).toBeGreaterThanOrEqual(1);
  });

  it("covers every input chapter when more than three chapters are provided", async () => {
    const result = await runPipeline(provider, fourChapters);
    const coveredChapterIds = new Set(
      result.draft.scenes.flatMap((scene) => scene.chapter_source),
    );

    expect(result.draft.source.chapter_count).toBe(4);
    expect(result.draft.scenes).toHaveLength(4);
    expect(coveredChapterIds).toEqual(
      new Set(["chapter_001", "chapter_002", "chapter_003", "chapter_004"]),
    );
  });

  it("drops null related_scene_id values returned by LLM providers", async () => {
    class ProviderWithNullNote extends MockProvider {
      async generateAdaptationNotes() {
        return [
          {
            type: "uncertainty",
            content: "模型未能确认关联场景。",
            related_scene_id: null,
          },
        ] as never;
      }
    }

    const result = await runPipeline(
      new ProviderWithNullNote(),
      sampleChapters,
    );

    expect(result.draft.adaptation_notes).toEqual([
      {
        type: "uncertainty",
        content: "模型未能确认关联场景。",
      },
    ]);
  });

  it("fills empty scene characters with dialogue speakers or fallback character", async () => {
    class ProviderWithEmptySceneCharacters extends MockProvider {
      async splitScenes(
        chapters: ParsedChapter[],
        characters: Awaited<ReturnType<MockProvider["extractCharacters"]>>,
        locations: Awaited<ReturnType<MockProvider["extractLocations"]>>,
      ) {
        const scenes = await super.splitScenes(chapters, characters, locations);
        return scenes.map((scene, index) => ({
          ...scene,
          characters: [],
          beats:
            index === 0
              ? [
                  {
                    type: "dialogue" as const,
                    content: "我会继续查下去。",
                    speaker_id: "character_002",
                  },
                ]
              : scene.beats,
        }));
      }
    }

    const result = await runPipeline(
      new ProviderWithEmptySceneCharacters(),
      sampleChapters,
    );

    expect(result.draft.scenes[0].characters).toEqual(["character_002"]);
    expect(result.draft.scenes[1].characters).toEqual(["character_001"]);
  });
});
