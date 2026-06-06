import YAML from "yaml";
import Ajv2020 from "ajv/dist/2020";
import schema from "../../../schemas/script.schema.json";
import type { ScriptDraft } from "@/lib/ai/types";

export type ValidationItem = {
  path: string;
  message: string;
  severity: "error" | "warning";
};

export type DraftValidationResult = {
  yamlValid: boolean;
  schemaValid: boolean;
  businessValid: boolean;
  valid: boolean;
  items: ValidationItem[];
};

/** Step 1: Parse YAML string and check syntax */
function parseYaml(yamlText: string): { draft: unknown; items: ValidationItem[] } {
  const items: ValidationItem[] = [];

  let draft: unknown;
  try {
    draft = YAML.parse(yamlText);
  } catch (err) {
    items.push({
      path: "",
      message: `YAML 解析失败：${err instanceof Error ? err.message : String(err)}`,
      severity: "error",
    });
    return { draft: null, items };
  }

  if (typeof draft !== "object" || draft === null) {
    items.push({
      path: "",
      message: "YAML 内容不是合法的对象。",
      severity: "error",
    });
    return { draft: null, items };
  }

  return { draft, items };
}

/** Step 2: Validate parsed object against JSON Schema */
function validateSchema(draft: unknown): ValidationItem[] {
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(schema);
  validate(draft);

  if (!validate.errors) return [];

  return validate.errors.map((err) => ({
    path: err.instancePath || "/",
    message: err.message ?? "未知 Schema 错误",
    severity: "error" as const,
  }));
}

/** Step 3: Business rules beyond Schema */
function validateBusiness(draft: ScriptDraft): ValidationItem[] {
  const items: ValidationItem[] = [];

  // Build lookup sets
  const characterIds = new Set(draft.characters.map((c) => c.id));
  const locationIds = new Set(draft.locations.map((l) => l.id));
  const chapterIds = new Set(draft.source.chapters.map((c) => c.id));

  // Scene checks
  for (const scene of draft.scenes) {
    // chapter_source references
    for (const chId of scene.chapter_source) {
      if (!chapterIds.has(chId)) {
        items.push({
          path: `/scenes/${scene.id}/chapter_source`,
          message: `场景「${scene.title}」引用了不存在的章节 ID：${chId}`,
          severity: "warning",
        });
      }
    }

    // location reference
    if (!locationIds.has(scene.location_id)) {
      items.push({
        path: `/scenes/${scene.id}/location_id`,
        message: `场景「${scene.title}」引用了不存在的地点 ID：${scene.location_id}`,
        severity: "warning",
      });
    }

    // character references
    for (const charId of scene.characters) {
      if (!characterIds.has(charId)) {
        items.push({
          path: `/scenes/${scene.id}/characters`,
          message: `场景「${scene.title}」引用了不存在的人物 ID：${charId}`,
          severity: "warning",
        });
      }
    }

    // Beat checks
    for (let i = 0; i < scene.beats.length; i++) {
      const beat = scene.beats[i];
      if (beat.type === "dialogue" && beat.speaker_id && !characterIds.has(beat.speaker_id)) {
        items.push({
          path: `/scenes/${scene.id}/beats[${i}]/speaker_id`,
          message: `对白引用了不存在的人物 ID：${beat.speaker_id}`,
          severity: "warning",
        });
      }
      if (beat.type === "dialogue" && !beat.speaker_id) {
        items.push({
          path: `/scenes/${scene.id}/beats[${i}]`,
          message: `对白缺少 speaker_id`,
          severity: "warning",
        });
      }
    }
  }

  return items;
}

/** Run all validation steps on a YAML string */
export function validateDraft(yamlText: string): DraftValidationResult {
  const { draft, items } = parseYaml(yamlText);
  if (!draft) {
    return {
      yamlValid: false,
      schemaValid: false,
      businessValid: false,
      valid: false,
      items,
    };
  }

  const yamlValid = true;

  const schemaItems = validateSchema(draft);
  const allItems = [...items, ...schemaItems];
  const schemaValid = schemaItems.length === 0;

  let businessValid = true;
  if (schemaValid) {
    const businessItems = validateBusiness(draft as ScriptDraft);
    allItems.push(...businessItems);
    businessValid = businessItems.every((i) => i.severity !== "error");
  }

  const valid = yamlValid && schemaValid && allItems.every((i) => i.severity !== "error");

  return { yamlValid, schemaValid, businessValid, valid, items: allItems };
}
