import { MockProvider } from "./mockProvider";
import { OpenAIProvider } from "./openaiProvider";
import type { GenerationProvider } from "./provider";

export type RuntimeApiConfig = {
  apiKey?: string;
  baseURL?: string;
  model?: string;
};

function normalizeBaseUrl(baseURL?: string): string | undefined {
  const value = baseURL?.trim();
  if (!value) return undefined;

  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Base URL 只支持 HTTP 或 HTTPS。");
  }

  return url.toString().replace(/\/$/, "");
}

export function createProvider(
  apiConfig?: RuntimeApiConfig,
): GenerationProvider {
  const runtimeApiKey = apiConfig?.apiKey?.trim();

  if (runtimeApiKey) {
    return new OpenAIProvider({
      apiKey: runtimeApiKey,
      baseURL: normalizeBaseUrl(apiConfig?.baseURL),
      model: apiConfig?.model?.trim() || undefined,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  return new MockProvider();
}
