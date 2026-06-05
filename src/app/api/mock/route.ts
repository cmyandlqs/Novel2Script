import fs from "node:fs";
import path from "node:path";

function readExampleFile(fileName: string): string {
  return fs.readFileSync(path.join(process.cwd(), "examples", fileName), "utf8");
}

export async function GET() {
  return Response.json({
    novel: readExampleFile("sample-novel.md"),
    scriptYaml: readExampleFile("output-script.yaml"),
  });
}
