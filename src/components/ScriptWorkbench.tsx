"use client";

import {
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Loader2,
  Play,
} from "lucide-react";
import { useMemo, useState } from "react";
import { previewChapters } from "@/lib/chapterPreview";

const fallbackNovel = `# 《雨夜档案》

## 第一章 雨中的包裹

林舟在旧城区的档案馆值夜班。暴雨从傍晚一直下到深夜，街灯在积水里晃成一片模糊的橘色。

## 第二章 被删掉的城市

第二天清晨，林舟打开硬盘，里面只有一个名为“南桥计划”的文件夹。

## 第三章 钟楼里的名单

林舟和许澄按照照片上的路牌，在雨后的城市边缘找到一座废弃钟楼。`;

const fallbackYaml = `metadata:
  title: "雨夜档案"
  schema_version: "1.0.0"
  draft_type: "screenplay_draft"
  language: "zh-CN"

source:
  chapter_count: 3
  chapters:
    - id: "chapter_001"
      title: "雨中的包裹"
      order: 1
      summary: "林舟收到神秘硬盘。"
    - id: "chapter_002"
      title: "被删掉的城市"
      order: 2
      summary: "南桥区记录被抹除。"
    - id: "chapter_003"
      title: "钟楼里的名单"
      order: 3
      summary: "林舟发现自己在名单上。"

characters:
  - id: "character_001"
    name: "林舟"
    role: "protagonist"
    description: "档案馆夜班管理员。"

locations:
  - id: "location_001"
    name: "旧城区档案馆"
    description: "保存城市旧档案的建筑。"

plot_summary:
  logline: "档案管理员发现一整个城区正从城市记忆中被抹除。"
  synopsis: "林舟追查神秘硬盘和南桥区失踪档案。"
  central_conflict: "保留真相与抹除记忆之间的冲突。"

scenes:
  - id: "scene_001"
    title: "午夜投递箱"
    chapter_source: ["chapter_001"]
    location_id: "location_001"
    time_of_day: "深夜"
    characters: ["character_001"]
    summary: "林舟收到神秘硬盘。"
    dramatic_purpose: "把主角卷入谜团。"
    beats:
      - type: "action"
        content: "投递箱突然发出金属碰撞声。"`;

export function ScriptWorkbench() {
  const [novelText, setNovelText] = useState(fallbackNovel);
  const [scriptYaml, setScriptYaml] = useState(fallbackYaml);
  const [status, setStatus] = useState("初稿已就绪");
  const [isLoading, setIsLoading] = useState(false);

  const chapters = useMemo(() => previewChapters(novelText), [novelText]);
  const chapterReady = chapters.length >= 3;

  async function loadExample() {
    setIsLoading(true);
    setStatus("正在加载示例...");

    try {
      const response = await fetch("/api/mock");
      if (!response.ok) {
        throw new Error("示例接口返回失败");
      }
      const data = (await response.json()) as {
        novel: string;
        scriptYaml: string;
      };
      setNovelText(data.novel);
      setScriptYaml(data.scriptYaml);
      setStatus("已加载原创三章样例和 Schema 示例输出");
    } catch {
      setStatus("示例接口不可用，已保留本地兜底内容");
    } finally {
      setIsLoading(false);
    }
  }

  function generateMock() {
    setStatus(chapterReady ? "已生成 YAML 剧本初稿" : "至少需要 3 个章节后才能生成");
    if (chapterReady) {
      setScriptYaml(fallbackYaml);
    }
  }

  async function copyYaml() {
    await navigator.clipboard.writeText(scriptYaml);
    setStatus("YAML 已复制到剪贴板");
  }

  function downloadYaml() {
    const blob = new Blob([scriptYaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "script-draft.yaml";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("YAML 已下载");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Noverl2Script
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              剧本结构工作台
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-alt)]"
              onClick={loadExample}
              type="button"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              载入样例
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!chapterReady}
              onClick={generateMock}
              type="button"
            >
              <Play className="h-4 w-4" />
              生成初稿
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)_minmax(340px,1fr)]">
        <section className="min-h-[calc(100vh-7rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold">小说输入</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              当前识别到 {chapters.length} 个章节
            </p>
          </div>
          <textarea
            aria-label="小说文本输入"
            className="h-[calc(100vh-13rem)] min-h-[28rem] w-full resize-none border-0 bg-transparent p-4 text-sm leading-6 text-[var(--foreground)] outline-none"
            onChange={(event) => setNovelText(event.target.value)}
            value={novelText}
          />
        </section>

        <section className="min-h-[calc(100vh-7rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold">章节解析与状态</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              章节列表与输入状态
            </p>
          </div>
          <div className="space-y-4 p-4">
            <div
              className={`rounded-md border px-3 py-3 text-sm ${
                chapterReady
                  ? "border-emerald-200 bg-emerald-50 text-[var(--success)]"
                  : "border-amber-200 bg-amber-50 text-[var(--warning)]"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {chapterReady ? "满足 3+ 章节输入要求" : "至少需要 3 个章节"}
              </div>
              <p className="mt-1 text-xs">
                {status}
              </p>
            </div>

            <div className="space-y-2">
              {chapters.map((chapter) => (
                <article
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-3"
                  key={`${chapter.order}-${chapter.title}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">{chapter.title}</h3>
                    <span className="shrink-0 rounded bg-white px-2 py-1 text-xs text-[var(--muted)]">
                      {chapter.charCount} 字
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    第 {chapter.order} 个章节
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="min-h-[calc(100vh-7rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">YAML 剧本输出</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Schema v1.0.0
              </p>
            </div>
            <div className="flex gap-2">
              <button
                aria-label="复制 YAML"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--surface-alt)]"
                onClick={copyYaml}
                title="复制 YAML"
                type="button"
              >
                <Clipboard className="h-4 w-4" />
              </button>
              <button
                aria-label="下载 YAML"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--surface-alt)]"
                onClick={downloadYaml}
                title="下载 YAML"
                type="button"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <pre className="h-[calc(100vh-13rem)] min-h-[28rem] overflow-auto p-4 text-xs leading-5 text-[var(--foreground)]">
            <code>{scriptYaml}</code>
          </pre>
        </section>
      </section>
    </main>
  );
}
