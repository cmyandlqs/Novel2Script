import { NextResponse } from "next/server";
import YAML from "yaml";
import { parseChapters } from "@/lib/chapters/parseChapters";
import { runPipeline } from "@/lib/ai/pipeline";
import { createProvider, type RuntimeApiConfig } from "@/lib/ai/createProvider";
import { validateDraft } from "@/lib/validation/validateDraft";
import { scoreDraft } from "@/lib/validation/scoreDraft";

function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      try {
        const provider = createProvider(apiConfig);
        const safeTitle = (title ?? "未命名作品").slice(0, 200);
        send("pipeline_start", {
          total_steps: 6,
          provider: provider.name,
          chapter_count: parseResult.chapters.length,
        });

        const result = await runPipeline(
          provider,
          parseResult.chapters,
          safeTitle,
          {
            onStepStart(step) {
              send("step_start", step);
            },
            onStepDone(step) {
              send("step_done", step);
            },
          },
        );

        const scriptYaml = YAML.stringify(result.draft, { lineWidth: 0 });
        const validation = validateDraft(scriptYaml);
        const qualityScore = validation.schemaValid
          ? scoreDraft(result.draft, validation)
          : null;

        send("complete", {
          ...result,
          scriptYaml,
          validation,
          qualityScore,
        });
      } catch (error) {
        send("error", {
          error:
            error instanceof Error ? error.message : "生成过程发生未知错误。",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
