import type { ParsedChapter } from "@/lib/chapters/parseChapters";
import type {
  ScriptChapter,
  ScriptCharacter,
  ScriptLocation,
  ScriptPlotSummary,
  ScriptScene,
  AdaptationNote,
} from "./types";

export interface GenerationProvider {
  name: string;

  summarizeChapters(chapters: ParsedChapter[]): Promise<ScriptChapter[]>;

  extractCharacters(chapters: ParsedChapter[]): Promise<ScriptCharacter[]>;

  extractLocations(chapters: ParsedChapter[]): Promise<ScriptLocation[]>;

  generatePlotSummary(
    chapters: ParsedChapter[],
    characters: ScriptCharacter[],
  ): Promise<ScriptPlotSummary>;

  splitScenes(
    chapters: ParsedChapter[],
    characters: ScriptCharacter[],
    locations: ScriptLocation[],
  ): Promise<ScriptScene[]>;

  generateAdaptationNotes(
    chapters: ParsedChapter[],
    scenes: ScriptScene[],
  ): Promise<AdaptationNote[]>;
}
