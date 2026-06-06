"use client";

import {
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Loader2,
  Play,
  Users,
  Film,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { parseChapters } from "@/lib/chapters/parseChapters";
import type { PipelineResult } from "@/lib/ai/types";
import type { DraftValidationResult } from "@/lib/validation/validateDraft";
import type { QualityScore } from "@/lib/validation/scoreDraft";
import YAML from "yaml";

const fallbackNovel = `# 《雨夜档案》

## 第一章 雨中的包裹

林舟在旧城区的档案馆值夜班。暴雨从傍晚一直下到深夜，街灯在积水里晃成一片模糊的橘色。

## 第二章 被删掉的城市

第二天清晨，林舟打开硬盘，里面只有一个名为"南桥计划"的文件夹。

## 第三章 钟楼里的名单

林舟和许澄按照照片上的路牌，在雨后的城市边缘找到一座废弃钟楼。`;

export function ScriptWorkbench() {
  const [novelText, setNovelText] = useState(fallbackNovel);
  const [pipelineResult, setPipelineResult] =
    useState<PipelineResult | null>(null);
  const [scriptYaml, setScriptYaml] = useState("");
  const [status, setStatus] = useState("就绪，点击生成初稿开始");
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] =
    useState<DraftValidationResult | null>(null);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  const chapterResult = useMemo(() => parseChapters(novelText), [novelText]);
  const chapters = chapterResult.chapters;
  const chapterReady = chapterResult.isValid;

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
      setPipelineResult(null);
      setValidationResult(null);
      setQualityScore(null);
      setStatus("已加载原创三章样例");
    } catch {
      setStatus("示例接口不可用，已保留本地兜底内容");
    } finally {
      setIsLoading(false);
    }
  }

  async function runValidation(yaml: string) {
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yamlText: yaml }),
      });
      const data = (await response.json()) as {
        validation: DraftValidationResult;
        qualityScore: QualityScore | null;
      };
      setValidationResult(data.validation);
      setQualityScore(data.qualityScore);
    } catch {
      setValidationResult(null);
      setQualityScore(null);
    }
  }

  async function generateDraft() {
    if (!chapterReady) return;

    setIsLoading(true);
    setPipelineResult(null);
    setValidationResult(null);
    setQualityScore(null);
    setStatus("正在生成剧本初稿...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelText }),
      });

      const data = (await response.json()) as
        | PipelineResult
        | { error: string };

      if (!response.ok) {
        const errorData = data as { error: string };
        setStatus(`生成失败：${errorData.error}`);
        return;
      }

      const result = data as PipelineResult;
      setPipelineResult(result);
      const yaml = YAML.stringify(result.draft, { lineWidth: 0 });
      setScriptYaml(yaml);

      const hasError = result.steps.some((s) => s.status === "error");
      if (hasError) {
        setStatus("部分步骤出错，请查看下方步骤详情");
      } else {
        setStatus("剧本初稿生成完成，正在校验...");
      }

      await runValidation(yaml);
      setStatus("剧本初稿生成并校验完成");
    } catch {
      setStatus("网络错误，请检查开发服务器是否在运行。");
    } finally {
      setIsLoading(false);
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

  const roleLabel: Record<string, string> = {
    protagonist: "主角",
    antagonist: "反派",
    supporting: "配角",
    minor: "次要角色",
    unknown: "未知",
  };

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
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              载入样例
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!chapterReady || isLoading}
              onClick={generateDraft}
              type="button"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              生成初稿
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)_minmax(340px,1fr)]">
        {/* Left: Novel Input */}
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

        {/* Middle: Chapters + Pipeline Results */}
        <section className="min-h-[calc(100vh-7rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold">章节解析与生成状态</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              章节列表、Pipeline 步骤与中间产物
            </p>
          </div>
          <div className="space-y-4 p-4">
            {/* Validation Status */}
            <div
              className={`rounded-md border px-3 py-3 text-sm ${
                chapterReady
                  ? "border-emerald-200 bg-emerald-50 text-[var(--success)]"
                  : "border-amber-200 bg-amber-50 text-[var(--warning)]"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {chapterReady
                  ? "满足 3+ 章节输入要求"
                  : "至少需要 3 个章节"}
              </div>
              <p className="mt-1 text-xs">
                {chapterReady ? status : chapterResult.errors[0]}
              </p>
            </div>

            {/* Chapter List */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                章节
              </h3>
              {chapters.map((chapter) => (
                <article
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2"
                  key={`${chapter.order}-${chapter.title}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium">{chapter.title}</h4>
                    <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs text-[var(--muted)]">
                      {chapter.charCount} 字
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {/* Pipeline Steps */}
            {pipelineResult && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  Pipeline 步骤
                </h3>
                {pipelineResult.steps.map((step) => (
                  <div
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm"
                    key={step.step}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <span className="inline-block h-4 w-4 shrink-0 rounded-full bg-red-400" />
                    )}
                    <span className="font-medium">{step.label}</span>
                    <span className="ml-auto text-xs text-[var(--muted)]">
                      {step.duration_ms}ms
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Characters */}
            {pipelineResult?.draft.characters && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5" />
                  人物
                </h3>
                {pipelineResult.draft.characters.map((ch) => (
                  <article
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2"
                    key={ch.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{ch.name}</span>
                      <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs text-[var(--muted)]">
                        {roleLabel[ch.role] ?? ch.role}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {ch.description}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {/* Scenes */}
            {pipelineResult?.draft.scenes && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  <Film className="h-3.5 w-3.5" />
                  场景
                </h3>
                {pipelineResult.draft.scenes.map((scene) => (
                  <article
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2"
                    key={scene.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {scene.title}
                      </span>
                      <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs text-[var(--muted)]">
                        {scene.time_of_day}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {scene.summary}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {scene.beats.length} 个 beat
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: YAML Output + Validation + Scoring */}
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
          <div className="p-4">
            <pre className="h-64 min-h-[10rem] overflow-auto text-xs leading-5 text-[var(--foreground)]">
              <code>{scriptYaml}</code>
            </pre>

            {/* Validation Results */}
            {validationResult && (
              <div className="mt-4 space-y-3">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  校验结果
                </h3>
                <div
                  className={`rounded-md border px-3 py-2 text-sm ${
                    validationResult.valid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {validationResult.valid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full bg-red-400" />
                    )}
                    {validationResult.valid
                      ? "全部校验通过"
                      : `发现 ${validationResult.items.length} 个问题`}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs">
                    <span>YAML: {validationResult.yamlValid ? "✓" : "✗"}</span>
                    <span>Schema: {validationResult.schemaValid ? "✓" : "✗"}</span>
                  </div>
                </div>
                {validationResult.items.length > 0 && (
                  <ul className="space-y-1 text-xs text-[var(--muted)]">
                    {validationResult.items.map((item, i) => (
                      <li
                        className={`rounded border px-2 py-1.5 ${
                          item.severity === "error"
                            ? "border-red-200 bg-red-50"
                            : "border-amber-200 bg-amber-50"
                        }`}
                        key={i}
                      >
                        <span className="font-mono text-[10px]">{item.path}</span>
                        <span className="ml-2">{item.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Quality Score */}
            {qualityScore && (
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  质量评分
                </h3>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2">
                  <div className="flex items-baseline gap-2 text-lg font-semibold">
                    <span>{qualityScore.totalScore}</span>
                    <span className="text-sm font-normal text-[var(--muted)]">
                      / {qualityScore.totalMax}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{
                        width: `${(qualityScore.totalScore / qualityScore.totalMax) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                {qualityScore.dimensions.map((dim) => (
                  <div
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2"
                    key={dim.name}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{dim.name}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {dim.score} / {dim.maxScore}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dim.checks.map((check) => (
                        <div
                          className="flex items-center gap-1.5 text-xs text-[var(--muted)]"
                          key={check.label}
                        >
                          <span className={check.passed ? "text-emerald-500" : "text-red-400"}>
                            {check.passed ? "✓" : "✗"}
                          </span>
                          {check.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
