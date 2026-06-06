import type { ScriptDraft } from "@/lib/ai/types";
import type { DraftValidationResult } from "./validateDraft";

export type DimensionCheck = {
  label: string;
  passed: boolean;
};

export type ScoreDimension = {
  name: string;
  maxScore: number;
  score: number;
  checks: DimensionCheck[];
};

export type QualityScore = {
  dimensions: ScoreDimension[];
  totalScore: number;
  totalMax: number;
};

export function scoreDraft(
  draft: ScriptDraft,
  validation: DraftValidationResult,
): QualityScore {
  const dimensions: ScoreDimension[] = [];

  // 1. 赛题合规性 (20)
  {
    const checks: DimensionCheck[] = [
      {
        label: "章节数量 ≥ 3",
        passed: draft.source.chapter_count >= 3,
      },
      {
        label: "YAML 解析通过",
        passed: validation.yamlValid,
      },
      {
        label: "Schema 校验通过",
        passed: validation.schemaValid,
      },
      {
        label: "包含人物表",
        passed: draft.characters.length > 0,
      },
      {
        label: "包含场景列表",
        passed: draft.scenes.length > 0,
      },
    ];
    const score = checks.filter((c) => c.passed).length * 4;
    dimensions.push({ name: "赛题合规性", maxScore: 20, score, checks });
  }

  // 2. 结构完整度 (20)
  {
    const checks: DimensionCheck[] = [
      { label: "包含 metadata", passed: !!draft.metadata?.title },
      { label: "包含 source", passed: !!draft.source?.chapters?.length },
      { label: "包含 characters", passed: draft.characters.length > 0 },
      { label: "包含 locations", passed: draft.locations.length > 0 },
      { label: "包含 plot_summary", passed: !!draft.plot_summary?.logline },
      { label: "scenes 含 beats", passed: draft.scenes.every((s) => s.beats.length > 0) },
      {
        label: "包含 adaptation_notes",
        passed: (draft.adaptation_notes?.length ?? 0) > 0,
      },
    ];
    const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 20);
    dimensions.push({ name: "结构完整度", maxScore: 20, score, checks });
  }

  // 3. 可编辑性 (20)
  {
    const hasStableIds = draft.characters.every((c) => /^character_\d{3}$/.test(c.id))
      && draft.scenes.every((s) => /^scene_\d{3}$/.test(s.id));
    const hasDialogueWithSpeaker = draft.scenes.some((s) =>
      s.beats.some((b) => b.type === "dialogue" && b.speaker_id),
    );
    const hasMultipleBeatTypes = draft.scenes.some((s) => {
      const types = new Set(s.beats.map((b) => b.type));
      return types.size >= 2;
    });
    const checks: DimensionCheck[] = [
      { label: "人物 ID 格式稳定", passed: hasStableIds },
      { label: "对白有 speaker 标记", passed: hasDialogueWithSpeaker },
      { label: "beat 类型多样化", passed: hasMultipleBeatTypes },
      {
        label: "场景可独立定位（有 chapter_source）",
        passed: draft.scenes.every((s) => s.chapter_source.length > 0),
      },
    ];
    const score = checks.filter((c) => c.passed).length * 5;
    dimensions.push({ name: "可编辑性", maxScore: 20, score, checks });
  }

  // 4. 引用一致性 (20)
  {
    const charIds = new Set(draft.characters.map((c) => c.id));
    const locIds = new Set(draft.locations.map((l) => l.id));
    const chapIds = new Set(draft.source.chapters.map((c) => c.id));

    const sceneCharsValid = draft.scenes.every((s) =>
      s.characters.every((id) => charIds.has(id)),
    );
    const sceneLocsValid = draft.scenes.every((s) => locIds.has(s.location_id));
    const sceneChapsValid = draft.scenes.every((s) =>
      s.chapter_source.every((id) => chapIds.has(id)),
    );
    const dialogueSpeakersValid = draft.scenes.every((s) =>
      s.beats
        .filter((b) => b.type === "dialogue" && b.speaker_id)
        .every((b) => charIds.has(b.speaker_id!)),
    );
    const checks: DimensionCheck[] = [
      { label: "场景人物引用合法", passed: sceneCharsValid },
      { label: "场景地点引用合法", passed: sceneLocsValid },
      { label: "场景章节引用合法", passed: sceneChapsValid },
      { label: "对白 speaker 引用合法", passed: dialogueSpeakersValid },
    ];
    const score = checks.filter((c) => c.passed).length * 5;
    dimensions.push({ name: "引用一致性", maxScore: 20, score, checks });
  }

  // 5. 章节覆盖度 (20)
  {
    const chapIds = new Set(draft.source.chapters.map((c) => c.id));
    const coveredChapters = new Set(
      draft.scenes.flatMap((s) => s.chapter_source),
    );
    const coverageRatio = chapIds.size > 0 ? coveredChapters.size / chapIds.size : 0;
    const checks: DimensionCheck[] = [
      { label: "所有章节被场景覆盖", passed: coverageRatio >= 1 },
      { label: "至少覆盖 80% 章节", passed: coverageRatio >= 0.8 },
      { label: "至少 3 个场景", passed: draft.scenes.length >= 3 },
      {
        label: "每章至少有 1 个场景",
        passed: [...chapIds].every((id) => coveredChapters.has(id)),
      },
    ];
    const score = checks.filter((c) => c.passed).length * 5;
    dimensions.push({ name: "章节覆盖度", maxScore: 20, score, checks });
  }

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);
  const totalMax = dimensions.reduce((sum, d) => sum + d.maxScore, 0);

  return { dimensions, totalScore, totalMax };
}
