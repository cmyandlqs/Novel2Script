import OpenAI from "openai";
import type { ParsedChapter } from "@/lib/chapters/parseChapters";
import type { GenerationProvider } from "./provider";
import type {
  ScriptChapter,
  ScriptCharacter,
  ScriptLocation,
  ScriptPlotSummary,
  ScriptScene,
  AdaptationNote,
} from "./types";
import {
  buildAdaptationNotesPrompt,
  buildChapterSummaryPrompt,
  buildCharacterExtractionPrompt,
  buildLocationExtractionPrompt,
  buildPlotSummaryPrompt,
  buildSceneSplitPrompt,
} from "./prompts";

export class OpenAIProvider implements GenerationProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY 环境变量未设置。");
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL ?? "https://opencode.ai/zen/go/v1",
    });
    this.model = process.env.OPENAI_MODEL ?? "deepseek-v4-flash";
  }

  private async callLlm(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<unknown> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("模型返回了空响应。");
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new Error("模型返回的内容不是合法 JSON。");
    }
  }

  async summarizeChapters(chapters: ParsedChapter[]): Promise<ScriptChapter[]> {
    const prompt = buildChapterSummaryPrompt(chapters);
    const data = await this.callLlm(prompt.system, prompt.user);

    const result = data as { chapters: ScriptChapter[] };
    return result.chapters;
  }

  async extractCharacters(
    chapters: ParsedChapter[],
  ): Promise<ScriptCharacter[]> {
    const prompt = buildCharacterExtractionPrompt(chapters);
    const data = await this.callLlm(prompt.system, prompt.user);

    const result = data as { characters: ScriptCharacter[] };
    return result.characters;
  }

  async extractLocations(chapters: ParsedChapter[]): Promise<ScriptLocation[]> {
    const prompt = buildLocationExtractionPrompt(chapters);
    const data = await this.callLlm(prompt.system, prompt.user);

    const result = data as { locations: ScriptLocation[] };
    return result.locations;
  }

  async generatePlotSummary(
    chapters: ParsedChapter[],
    characters: ScriptCharacter[],
  ): Promise<ScriptPlotSummary> {
    const prompt = buildPlotSummaryPrompt(chapters, characters);
    const data = await this.callLlm(prompt.system, prompt.user);

    return data as ScriptPlotSummary;
  }

  async splitScenes(
    chapters: ParsedChapter[],
    characters: ScriptCharacter[],
    locations: ScriptLocation[],
  ): Promise<ScriptScene[]> {
    const prompt = buildSceneSplitPrompt(chapters, characters, locations);
    const data = await this.callLlm(prompt.system, prompt.user);

    const result = data as { scenes: ScriptScene[] };
    return result.scenes;
  }

  async generateAdaptationNotes(
    chapters: ParsedChapter[],
    scenes: ScriptScene[],
  ): Promise<AdaptationNote[]> {
    const prompt = buildAdaptationNotesPrompt(chapters, scenes);
    const data = await this.callLlm(prompt.system, prompt.user);

    const result = data as { notes: AdaptationNote[] };
    return result.notes;
  }
}
