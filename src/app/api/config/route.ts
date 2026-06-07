import { NextResponse } from "next/server";
import { defaultOpenAIBaseURL, defaultOpenAIModel } from "@/lib/ai/defaults";

export async function GET() {
  return NextResponse.json({
    hasServerApiKey: Boolean(process.env.OPENAI_API_KEY),
    baseURL: process.env.OPENAI_BASE_URL ?? defaultOpenAIBaseURL,
    model: process.env.OPENAI_MODEL ?? defaultOpenAIModel,
  });
}
