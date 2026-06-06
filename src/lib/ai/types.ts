/** Types aligned with schemas/script.schema.json */

export type DraftType = "screenplay_draft";
export type TargetFormat =
  | "film"
  | "short_drama"
  | "stage_play"
  | "web_series"
  | "unspecified";
export type CharacterRole =
  | "protagonist"
  | "antagonist"
  | "supporting"
  | "minor"
  | "unknown";
export type BeatType = "action" | "dialogue" | "narration" | "transition";
export type NoteType =
  | "assumption"
  | "uncertainty"
  | "editorial_suggestion"
  | "schema_note";

export type ScriptMetadata = {
  title: string;
  schema_version: string;
  draft_type: DraftType;
  language: string;
  genre?: string;
  target_format?: TargetFormat;
};

export type ScriptChapter = {
  id: string;
  title: string;
  order: number;
  summary: string;
  key_events?: string[];
};

export type ScriptCharacter = {
  id: string;
  name: string;
  role: CharacterRole;
  description: string;
  motivation?: string;
  arc?: string;
};

export type ScriptLocation = {
  id: string;
  name: string;
  description: string;
};

export type ScriptPlotSummary = {
  logline: string;
  synopsis: string;
  central_conflict: string;
  themes?: string[];
};

export type ScriptBeat = {
  type: BeatType;
  content: string;
  speaker_id?: string;
  emotion?: string;
  source_ref?: string[];
};

export type ScriptScene = {
  id: string;
  title: string;
  chapter_source: string[];
  location_id: string;
  time_of_day: string;
  characters: string[];
  summary: string;
  dramatic_purpose: string;
  beats: ScriptBeat[];
};

export type AdaptationNote = {
  type: NoteType;
  content: string;
  related_scene_id?: string;
};

export type ScriptDraft = {
  metadata: ScriptMetadata;
  source: {
    chapter_count: number;
    chapters: ScriptChapter[];
    overall_summary?: string;
  };
  characters: ScriptCharacter[];
  locations: ScriptLocation[];
  plot_summary: ScriptPlotSummary;
  scenes: ScriptScene[];
  adaptation_notes?: AdaptationNote[];
};

export type PipelineStepName =
  | "summarize"
  | "extract_characters"
  | "extract_locations"
  | "plot_summary"
  | "split_scenes"
  | "adaptation_notes";

export type PipelineStepResult = {
  step: PipelineStepName;
  label: string;
  status: "completed" | "error";
  duration_ms: number;
  error?: string;
};

export type PipelineResult = {
  draft: ScriptDraft;
  steps: PipelineStepResult[];
};
