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

export type PipelineStepStart = {
  step: PipelineStepName;
  label: string;
};

export type PipelineRunOptions = {
  onStepStart?: (step: PipelineStepStart) => void | Promise<void>;
  onStepDone?: (step: PipelineStepResult) => void | Promise<void>;
};

async function runStep<T>(
  step: PipelineStepName,
  fn: () => Promise<T>,
  options: PipelineRunOptions = {},
): Promise<StepOutcome<T>> {
  await options.onStepStart?.({ step, label: stepLabels[step] });

  const start = Date.now();
  try {
    const result = await fn();
    const stepResult: PipelineStepResult = {
      step,
      label: stepLabels[step],
      status: "completed",
      duration_ms: Date.now() - start,
    };
    await options.onStepDone?.(stepResult);
    return {
      result,
      stepResult,
    };
  } catch (error) {
    const stepResult: PipelineStepResult = {
      step,
      label: stepLabels[step],
      status: "error",
      duration_ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
    await options.onStepDone?.(stepResult);
    return {
      result: undefined,
      stepResult,
    };
  }
}

async function skippedStep(
  step: PipelineStepName,
  options: PipelineRunOptions,
): Promise<PipelineStepResult> {
  await options.onStepStart?.({ step, label: stepLabels[step] });
  const stepResult: PipelineStepResult = {
    step,
    label: stepLabels[step],
    status: "error",
    duration_ms: 0,
    error: "前置步骤失败，跳过",
  };
  await options.onStepDone?.(stepResult);
  return stepResult;
}

/** Default fallback values when a pipeline step fails */
const defaultPlotSummary: ScriptPlotSummary = {
  logline: "",
  synopsis: "",
  central_conflict: "",
};

function normalizeAdaptationNotes(
  notes: AdaptationNote[] | undefined,
): AdaptationNote[] | undefined {
  if (!notes) return undefined;

  return notes.map((note) => {
    const normalized: AdaptationNote = {
      type: note.type,
      content: note.content,
    };

    if (typeof note.related_scene_id === "string") {
      normalized.related_scene_id = note.related_scene_id;
    }

    return normalized;
  });
}

export async function runPipeline(
  provider: GenerationProvider,
  chapters: ParsedChapter[],
  title = "未命名作品",
  options: PipelineRunOptions = {},
): Promise<PipelineResult> {
  const steps: PipelineStepResult[] = [];
  const hasError = () => steps.some((s) => s.status === "error");

  const { result: scriptChapters, stepResult: s1 } = await runStep(
    "summarize",
    () => provider.summarizeChapters(chapters),
    options,
  );
  steps.push(s1);

  const { result: characters, stepResult: s2 } = hasError()
    ? {
        result: undefined as ScriptCharacter[] | undefined,
        stepResult: await skippedStep("extract_characters", options),
      }
    : await runStep(
        "extract_characters",
        () => provider.extractCharacters(chapters),
        options,
      );
  steps.push(s2);

  const { result: locations, stepResult: s3 } = hasError()
    ? {
        result: undefined as ScriptLocation[] | undefined,
        stepResult: await skippedStep("extract_locations", options),
      }
    : await runStep(
        "extract_locations",
        () => provider.extractLocations(chapters),
        options,
      );
  steps.push(s3);

  const { result: plotSummary, stepResult: s4 } = hasError()
    ? {
        result: undefined as ScriptPlotSummary | undefined,
        stepResult: await skippedStep("plot_summary", options),
      }
    : await runStep(
        "plot_summary",
        () => provider.generatePlotSummary(chapters, characters ?? []),
        options,
      );
  steps.push(s4);

  const { result: scenes, stepResult: s5 } = hasError()
    ? {
        result: undefined as ScriptScene[] | undefined,
        stepResult: await skippedStep("split_scenes", options),
      }
    : await runStep(
        "split_scenes",
        () => provider.splitScenes(chapters, characters ?? [], locations ?? []),
        options,
      );
  steps.push(s5);

  const { result: adaptationNotes, stepResult: s6 } = hasError()
    ? {
        result: undefined as AdaptationNote[] | undefined,
        stepResult: await skippedStep("adaptation_notes", options),
      }
    : await runStep(
        "adaptation_notes",
        () => provider.generateAdaptationNotes(chapters, scenes ?? []),
        options,
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
      chapters:
        scriptChapters ??
        chapters.map((ch) => ({
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
    adaptation_notes: normalizeAdaptationNotes(adaptationNotes),
  };

  return { draft, steps };
}
