import { NextResponse } from "next/server";
import YAML from "yaml";
import { validateDraft } from "@/lib/validation/validateDraft";
import { scoreDraft } from "@/lib/validation/scoreDraft";
import type { ScriptDraft } from "@/lib/ai/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "请求体不是合法 JSON。" },
      { status: 400 },
    );
  }

  const { yamlText } = body as { yamlText?: string };

  if (!yamlText || typeof yamlText !== "string") {
    return NextResponse.json(
      { error: "缺少 YAML 文本。" },
      { status: 400 },
    );
  }

  const validation = validateDraft(yamlText);

  let qualityScore = null;
  if (validation.schemaValid) {
    try {
      const draft = YAML.parse(yamlText) as ScriptDraft;
      qualityScore = scoreDraft(draft, validation);
    } catch {
      qualityScore = null;
    }
  }

  return NextResponse.json({ validation, qualityScore });
}
