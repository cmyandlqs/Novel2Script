import { NextResponse } from "next/server";
import { parseChapters } from "@/lib/chapters/parseChapters";
import { runPipeline } from "@/lib/ai/pipeline";
import { createProvider, type RuntimeApiConfig } from "@/lib/ai/createProvider";

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

  const { novelText, title, apiConfig } = body as {
    novelText?: string;
    title?: string;
    apiConfig?: RuntimeApiConfig;
  };

  if (!novelText || typeof novelText !== "string") {
    return NextResponse.json({ error: "缺少小说文本输入。" }, { status: 400 });
  }

  const parseResult = parseChapters(novelText);
  if (!parseResult.isValid) {
    return NextResponse.json({ error: parseResult.errors[0] }, { status: 400 });
  }

  try {
    const provider = createProvider(apiConfig);
    const safeTitle = (title ?? "未命名作品").slice(0, 200);
    const result = await runPipeline(provider, parseResult.chapters, safeTitle);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "生成过程发生未知错误。",
      },
      { status: 500 },
    );
  }
}
