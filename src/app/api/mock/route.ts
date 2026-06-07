import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

function readExampleFile(fileName: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), "examples", fileName),
    "utf8",
  );
}

export async function GET() {
  try {
    return NextResponse.json({
      novel: readExampleFile("sample-novel.md"),
      scriptYaml: readExampleFile("output-script.yaml"),
    });
  } catch {
    return NextResponse.json(
      { error: "示例文件不可用，请直接粘贴或上传小说文本。" },
      { status: 500 },
    );
  }
}
