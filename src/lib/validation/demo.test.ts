import { describe, expect, it } from "vitest";
import { validateDraft } from "./validateDraft";
import { scoreDraft } from "./scoreDraft";
import YAML from "yaml";
import fs from "fs";
import path from "path";

const sampleYaml = fs.readFileSync(
  path.resolve("examples/output-script.yaml"),
  "utf-8",
);

describe("Demo flow validation", () => {
  it("sample output passes YAML and Schema validation", () => {
    const result = validateDraft(sampleYaml);

    expect(result.yamlValid).toBe(true);
    expect(result.schemaValid).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it("sample output scores at least 85 out of 100", () => {
    const validation = validateDraft(sampleYaml);
    expect(validation.valid).toBe(true);

    const draft = YAML.parse(sampleYaml) as Parameters<typeof scoreDraft>[0];
    const score = scoreDraft(draft, validation);

    expect(score.totalScore).toBeGreaterThanOrEqual(85);
  });

  it("sample output has all required structure", () => {
    const draft = YAML.parse(sampleYaml) as Record<string, unknown>;

    expect(draft.metadata).toBeDefined();
    expect(draft.source).toBeDefined();
    expect(draft.characters).toBeDefined();
    expect(draft.locations).toBeDefined();
    expect(draft.plot_summary).toBeDefined();
    expect(draft.scenes).toBeDefined();
    expect(draft.adaptation_notes).toBeDefined();
  });

  it("sample output covers all 3 chapters", () => {
    const draft = YAML.parse(sampleYaml) as {
      source: { chapters: { id: string }[] };
      scenes: { chapter_source: string[] }[];
    };

    const chapterIds = new Set(draft.source.chapters.map((c) => c.id));
    const coveredIds = new Set(
      draft.scenes.flatMap((s) => s.chapter_source),
    );

    expect(chapterIds.size).toBe(3);
    for (const id of chapterIds) {
      expect(coveredIds.has(id)).toBe(true);
    }
  });
});
