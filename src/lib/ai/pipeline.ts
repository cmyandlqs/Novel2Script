import type { ParsedChapter } from "@/lib/chapters/parseChapters";
import type { GenerationProvider } from "./provider";
import type {
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
  result: T;
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
      result: undefined as T,
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

export async function runPipeline(
  provider: GenerationProvider,
  chapters: ParsedChapter[],
  title = "未命名作品",
): Promise<PipelineResult> {
  const steps: PipelineStepResult[] = [];

  const { result: scriptChapters, stepResult: s1 } = await runStep(
    "summarize",
    () => provider.summarizeChapters(chapters),
  );
  steps.push(s1);

  const { result: characters, stepResult: s2 } = await runStep(
    "extract_characters",
    () => provider.extractCharacters(chapters),
  );
  steps.push(s2);

  const { result: locations, stepResult: s3 } = await runStep(
    "extract_locations",
    () => provider.extractLocations(chapters),
  );
  steps.push(s3);

  const { result: plotSummary, stepResult: s4 } = await runStep(
    "plot_summary",
    () => provider.generatePlotSummary(chapters, characters),
  );
  steps.push(s4);

  const { result: scenes, stepResult: s5 } = await runStep(
    "split_scenes",
    () => provider.splitScenes(chapters, characters, locations),
  );
  steps.push(s5);

  const { result: adaptationNotes, stepResult: s6 } = await runStep(
    "adaptation_notes",
    () => provider.generateAdaptationNotes(chapters, scenes),
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
      chapters: scriptChapters,
    },
    characters,
    locations,
    plot_summary: plotSummary,
    scenes,
    adaptation_notes: adaptationNotes,
  };

  return { draft, steps };
}
