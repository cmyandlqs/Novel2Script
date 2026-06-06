import type { ParsedChapter } from "@/lib/chapters/parseChapters";
import type { GenerationProvider } from "./provider";
import type {
  ScriptCharacter,
  ScriptLocation,
  ScriptPlotSummary,
  ScriptScene,
  AdaptationNote,
  ScriptDraft,
  PipelineResult,
  PipelineStepName,
  PipelineStepResult,
} from "./types";

const stepLabels: Record<PipelineStepName, string> = {
  summarize: "章节摘要",
  extract_characters: "人物抽取",
  extract_locations: "地点抽取",
  plot_summary: "剧情梗概",
  split_scenes: "场景拆分",
  adaptation_notes: "改编说明",
};

type StepOutcome<T> = {
  result: T | undefined;
  stepResult: PipelineStepResult;
};

async function runStep<T>(
  step: PipelineStepName,
  fn: () => Promise<T>,
): Promise<StepOutcome<T>> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      result,
      stepResult: {
        step,
        label: stepLabels[step],
        status: "completed",
        duration_ms: Date.now() - start,
      },
    };
  } catch (error) {
    return {
      result: undefined,
      stepResult: {
        step,
        label: stepLabels[step],
        status: "error",
        duration_ms: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/** Default fallback values when a pipeline step fails */
const defaultPlotSummary: ScriptPlotSummary = {
  logline: "",
  synopsis: "",
  central_conflict: "",
};

export async function runPipeline(
  provider: GenerationProvider,
  chapters: ParsedChapter[],
  title = "未命名作品",
): Promise<PipelineResult> {
  const steps: PipelineStepResult[] = [];
  const hasError = () => steps.some((s) => s.status === "error");

  const { result: scriptChapters, stepResult: s1 } = await runStep(
    "summarize",
    () => provider.summarizeChapters(chapters),
  );
  steps.push(s1);

  const { result: characters, stepResult: s2 } = hasError()
    ? { result: undefined as ScriptCharacter[] | undefined, stepResult: { step: "extract_characters" as PipelineStepName, label: stepLabels.extract_characters, status: "error" as const, duration_ms: 0, error: "前置步骤失败，跳过" } }
    : await runStep("extract_characters", () =>
        provider.extractCharacters(chapters),
      );
  steps.push(s2);

  const { result: locations, stepResult: s3 } = hasError()
    ? { result: undefined as ScriptLocation[] | undefined, stepResult: { step: "extract_locations" as PipelineStepName, label: stepLabels.extract_locations, status: "error" as const, duration_ms: 0, error: "前置步骤失败，跳过" } }
    : await runStep("extract_locations", () =>
        provider.extractLocations(chapters),
      );
  steps.push(s3);

  const { result: plotSummary, stepResult: s4 } = hasError()
    ? { result: undefined as ScriptPlotSummary | undefined, stepResult: { step: "plot_summary" as PipelineStepName, label: stepLabels.plot_summary, status: "error" as const, duration_ms: 0, error: "前置步骤失败，跳过" } }
    : await runStep("plot_summary", () =>
        provider.generatePlotSummary(chapters, characters ?? []),
      );
  steps.push(s4);

  const { result: scenes, stepResult: s5 } = hasError()
    ? { result: undefined as ScriptScene[] | undefined, stepResult: { step: "split_scenes" as PipelineStepName, label: stepLabels.split_scenes, status: "error" as const, duration_ms: 0, error: "前置步骤失败，跳过" } }
    : await runStep("split_scenes", () =>
        provider.splitScenes(chapters, characters ?? [], locations ?? []),
      );
  steps.push(s5);

  const { result: adaptationNotes, stepResult: s6 } = hasError()
    ? { result: undefined as AdaptationNote[] | undefined, stepResult: { step: "adaptation_notes" as PipelineStepName, label: stepLabels.adaptation_notes, status: "error" as const, duration_ms: 0, error: "前置步骤失败，跳过" } }
    : await runStep("adaptation_notes", () =>
        provider.generateAdaptationNotes(chapters, scenes ?? []),
      );
  steps.push(s6);

  const draft: ScriptDraft = {
    metadata: {
      title,
      schema_version: "1.0.0",
      draft_type: "screenplay_draft",
      language: "zh-CN",
    },
    source: {
      chapter_count: chapters.length,
      chapters: scriptChapters ?? chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        order: ch.order,
        summary: "",
      })),
    },
    characters: characters ?? [],
    locations: locations ?? [],
    plot_summary: plotSummary ?? defaultPlotSummary,
    scenes: scenes ?? [],
    adaptation_notes: adaptationNotes,
  };

  return { draft, steps };
}
