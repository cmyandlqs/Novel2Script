"use client";

import {
  CheckCircle2,
  Clipboard,
  Download,
  FileUp,
  FileText,
  Loader2,
  Play,
  Users,
  Film,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { parseChapters } from "@/lib/chapters/parseChapters";
import type {
  PipelineResult,
  PipelineStepName,
  PipelineStepResult,
  ScriptDraft,
} from "@/lib/ai/types";
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

const generationStepList: { step: PipelineStepName; label: string }[] = [
  { step: "summarize", label: "章节摘要" },
  { step: "extract_characters", label: "人物抽取" },
  { step: "extract_locations", label: "地点抽取" },
  { step: "plot_summary", label: "剧情梗概" },
  { step: "split_scenes", label: "场景拆分" },
  { step: "adaptation_notes", label: "改编说明" },
];

type GenerationStepView = {
  step: PipelineStepName;
  label: string;
  status: "pending" | "running" | "completed" | "error";
  duration_ms?: number;
  error?: string;
};

type StreamCompletePayload = PipelineResult & {
  scriptYaml: string;
  validation: DraftValidationResult;
  qualityScore: QualityScore | null;
};

function createInitialGenerationSteps(): GenerationStepView[] {
  return generationStepList.map((step) => ({
    ...step,
    status: "pending",
  }));
}

export function ScriptWorkbench() {
  const [novelText, setNovelText] = useState(fallbackNovel);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(
    null,
  );
  const [editableDraft, setEditableDraft] = useState<ScriptDraft | null>(null);
  const [scriptYaml, setScriptYaml] = useState("");
  const [status, setStatus] = useState("就绪，点击生成初稿开始");
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] =
    useState<DraftValidationResult | null>(null);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStepView[]>(
    createInitialGenerationSteps,
  );
  const [hasEditedSinceValidation, setHasEditedSinceValidation] =
    useState(false);

  const chapterResult = useMemo(() => parseChapters(novelText), [novelText]);
  const chapters = chapterResult.chapters;
  const chapterReady = chapterResult.isValid;

  function syncDraftAndYaml(draft: ScriptDraft, markEdited = true) {
    setEditableDraft(draft);
    setScriptYaml(YAML.stringify(draft, { lineWidth: 0 }));
    if (markEdited) {
      setHasEditedSinceValidation(true);
      setStatus("已修改，YAML 已同步，建议重新校验");
    }
  }

  function updateGenerationStep(
    step: PipelineStepName,
    patch: Partial<GenerationStepView>,
  ) {
    setGenerationSteps((current) =>
      current.map((item) =>
        item.step === step ? { ...item, ...patch } : item,
      ),
    );
  }

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
      setEditableDraft(null);
      setValidationResult(null);
      setQualityScore(null);
      setHasEditedSinceValidation(false);
      setGenerationSteps(createInitialGenerationSteps());
      setStatus("已加载原创三章样例");
    } catch {
      setStatus("示例接口不可用，已保留本地兜底内容");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNovelFileUpload(file: File | null) {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "md", "markdown"].includes(extension ?? "")) {
      setStatus(
        "当前仅支持上传 .txt、.md、.markdown 文本文件；PDF 解析后续单独支持。",
      );
      return;
    }

    try {
      const text = await file.text();
      setNovelText(text);
      setPipelineResult(null);
      setEditableDraft(null);
      setScriptYaml("");
      setValidationResult(null);
      setQualityScore(null);
      setHasEditedSinceValidation(false);
      setGenerationSteps(createInitialGenerationSteps());
      setStatus(`已载入文件：${file.name}`);
    } catch {
      setStatus("文件读取失败，请确认文件内容是可读取文本。");
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
      setHasEditedSinceValidation(false);
    } catch {
      setValidationResult(null);
      setQualityScore(null);
    }
  }

  async function generateDraft() {
    if (!chapterReady) return;

    setIsLoading(true);
    setPipelineResult(null);
    setEditableDraft(null);
    setValidationResult(null);
    setQualityScore(null);
    setHasEditedSinceValidation(false);
    setGenerationSteps(createInitialGenerationSteps());
    setStatus("正在启动生成流程...");

    try {
      const response = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelText }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        setStatus(`生成失败：${errorData.error}`);
        return;
      }

      if (!response.body) {
        throw new Error("浏览器不支持流式响应。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (eventName: string, payload: unknown) => {
        if (eventName === "pipeline_start") {
          const data = payload as {
            total_steps: number;
            chapter_count: number;
          };
          setStatus(
            `生成流程已启动：共 ${data.total_steps} 步，输入 ${data.chapter_count} 个章节`,
          );
          return;
        }

        if (eventName === "step_start") {
          const data = payload as { step: PipelineStepName; label: string };
          updateGenerationStep(data.step, { status: "running" });
          setStatus(`正在执行：${data.label}`);
          return;
        }

        if (eventName === "step_done") {
          const data = payload as PipelineStepResult;
          updateGenerationStep(data.step, {
            status: data.status,
            duration_ms: data.duration_ms,
            error: data.error,
          });
          setStatus(
            data.status === "completed"
              ? `已完成：${data.label}`
              : `步骤出错：${data.label}`,
          );
          return;
        }

        if (eventName === "complete") {
          const data = payload as StreamCompletePayload;
          setPipelineResult({ draft: data.draft, steps: data.steps });
          setEditableDraft(data.draft);
          setScriptYaml(data.scriptYaml);
          setValidationResult(data.validation);
          setQualityScore(data.qualityScore);
          setHasEditedSinceValidation(false);
          setStatus("剧本初稿生成并校验完成");
          return;
        }

        if (eventName === "error") {
          const data = payload as { error: string };
          setStatus(`生成失败：${data.error}`);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const lines = rawEvent.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event: "));
          const dataLine = lines.find((line) => line.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const eventName = eventLine.slice("event: ".length);
          const payload = JSON.parse(dataLine.slice("data: ".length));
          handleEvent(eventName, payload);
        }
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `生成失败：${error.message}`
          : "网络错误，请检查开发服务器是否在运行。",
      );
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

  async function revalidate() {
    if (!scriptYaml) return;
    setIsLoading(true);
    setStatus("正在重新校验...");
    await runValidation(scriptYaml);
    setStatus("校验完成");
    setIsLoading(false);
  }

  // --- Edit handlers ---

  function updateCharacterField(
    id: string,
    field: "name" | "description",
    value: string,
  ) {
    if (!editableDraft) return;
    const draft = {
      ...editableDraft,
      characters: editableDraft.characters.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    };
    syncDraftAndYaml(draft);
  }

  function updateSceneField(
    id: string,
    field: "title" | "summary" | "time_of_day",
    value: string,
  ) {
    if (!editableDraft) return;
    const draft = {
      ...editableDraft,
      scenes: editableDraft.scenes.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    };
    syncDraftAndYaml(draft);
  }

  function updateBeatContent(
    sceneId: string,
    beatIndex: number,
    content: string,
  ) {
    if (!editableDraft) return;
    const draft = {
      ...editableDraft,
      scenes: editableDraft.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        const beats = s.beats.map((b, i) =>
          i === beatIndex ? { ...b, content } : b,
        );
        return { ...s, beats };
      }),
    };
    syncDraftAndYaml(draft);
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
            <p className="mt-1 text-sm text-[var(--muted)]">剧本结构工作台</p>
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
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-alt)]">
              <FileUp className="h-4 w-4" />
              上传文本
              <input
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                className="sr-only"
                onChange={(event) =>
                  void handleNovelFileUpload(event.target.files?.[0] ?? null)
                }
                type="file"
              />
            </label>
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
              当前识别到 {chapters.length} 个章节，可直接粘贴或上传文本
            </p>
          </div>
          <textarea
            aria-label="小说文本输入"
            className="h-[calc(100vh-13rem)] min-h-[28rem] w-full resize-none border-0 bg-transparent p-4 text-sm leading-6 text-[var(--foreground)] outline-none"
            onChange={(event) => setNovelText(event.target.value)}
            value={novelText}
          />
        </section>

        {/* Middle: Chapters + Pipeline + Editable Draft */}
        <section className="min-h-[calc(100vh-7rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold">章节解析与编辑</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              章节列表、Pipeline 步骤与可编辑剧本
            </p>
          </div>
          <div className="space-y-4 p-4">
            {/* Input Validation */}
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
                  ? chapters.length >= 3
                    ? "满足竞赛 Demo 3+ 章节要求"
                    : "可生成试用初稿"
                  : "请输入小说文本"}
              </div>
              <p className="mt-1 text-xs">
                {chapterReady
                  ? chapters.length >= 3
                    ? status
                    : `${status}；当前少于 3 章，适合试用，最终竞赛 Demo 建议使用 3 章以上。`
                  : chapterResult.errors[0]}
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
            {(isLoading || pipelineResult) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                    生成流程
                  </h3>
                  <span className="text-xs text-[var(--muted)]">
                    {
                      generationSteps.filter(
                        (step) => step.status === "completed",
                      ).length
                    }{" "}
                    / {generationSteps.length}
                  </span>
                </div>
                {generationSteps.map((step) => (
                  <div
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm"
                    key={step.step}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : step.status === "running" ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
                    ) : step.status === "error" ? (
                      <span className="inline-block h-4 w-4 shrink-0 rounded-full bg-red-400" />
                    ) : (
                      <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-[var(--border)] bg-white" />
                    )}
                    <span className="font-medium">{step.label}</span>
                    <span className="ml-auto text-xs text-[var(--muted)]">
                      {step.status === "pending"
                        ? "等待中"
                        : step.status === "running"
                          ? "进行中"
                          : `${step.duration_ms ?? 0}ms`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Editable Characters */}
            {editableDraft && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5" />
                  人物（可编辑）
                </h3>
                {editableDraft.characters.map((ch) => (
                  <article
                    className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2"
                    key={ch.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        aria-label="人物名称"
                        className="flex-1 rounded border border-[var(--border)] bg-white px-2 py-1 text-sm font-medium outline-none focus:border-[var(--accent)]"
                        onChange={(e) =>
                          updateCharacterField(ch.id, "name", e.target.value)
                        }
                        type="text"
                        value={ch.name}
                      />
                      <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs text-[var(--muted)]">
                        {roleLabel[ch.role] ?? ch.role}
                      </span>
                    </div>
                    <textarea
                      aria-label="人物描述"
                      className="w-full resize-none rounded border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                      onChange={(e) =>
                        updateCharacterField(
                          ch.id,
                          "description",
                          e.target.value,
                        )
                      }
                      rows={2}
                      value={ch.description}
                    />
                  </article>
                ))}
              </div>
            )}

            {/* Editable Scenes with Beats */}
            {editableDraft && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                  <Film className="h-3.5 w-3.5" />
                  场景（可编辑）
                </h3>
                {editableDraft.scenes.map((scene) => (
                  <article
                    className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2"
                    key={scene.id}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        aria-label="场景标题"
                        className="flex-1 rounded border border-[var(--border)] bg-white px-2 py-1 text-sm font-medium outline-none focus:border-[var(--accent)]"
                        onChange={(e) =>
                          updateSceneField(scene.id, "title", e.target.value)
                        }
                        type="text"
                        value={scene.title}
                      />
                      <input
                        aria-label="时间段"
                        className="w-20 shrink-0 rounded border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                        onChange={(e) =>
                          updateSceneField(
                            scene.id,
                            "time_of_day",
                            e.target.value,
                          )
                        }
                        type="text"
                        value={scene.time_of_day}
                      />
                    </div>
                    <textarea
                      aria-label="场景摘要"
                      className="w-full resize-none rounded border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                      onChange={(e) =>
                        updateSceneField(scene.id, "summary", e.target.value)
                      }
                      rows={2}
                      value={scene.summary}
                    />
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">
                        Beats
                      </p>
                      {scene.beats.map((beat, bi) => (
                        <div
                          className="flex items-start gap-1.5"
                          key={`${scene.id}-beat-${bi}`}
                        >
                          <span className="mt-1 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                            {beat.type === "dialogue"
                              ? "对白"
                              : beat.type === "action"
                                ? "动作"
                                : beat.type === "narration"
                                  ? "旁白"
                                  : "转场"}
                          </span>
                          <textarea
                            aria-label={`beat ${bi + 1}`}
                            className="flex-1 resize-none rounded border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                            onChange={(e) =>
                              updateBeatContent(scene.id, bi, e.target.value)
                            }
                            rows={beat.content.length > 30 ? 2 : 1}
                            value={beat.content}
                          />
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: YAML + Validation + Scoring */}
        <section className="min-h-[calc(100vh-7rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">YAML 剧本输出</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Schema v1.0.0</p>
            </div>
            <div className="flex gap-2">
              {editableDraft && (
                <button
                  aria-label="重新校验"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-2 text-xs hover:bg-[var(--surface-alt)]"
                  disabled={isLoading}
                  onClick={revalidate}
                  title="重新校验"
                  type="button"
                >
                  <RefreshCw className="h-4 w-4" />
                  重新校验
                </button>
              )}
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
            {hasEditedSinceValidation && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                已修改，YAML 已同步。请重新校验后再下载或复制最终版本。
              </div>
            )}
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
                    <span>
                      Schema: {validationResult.schemaValid ? "✓" : "✗"}
                    </span>
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
                        <span className="font-mono text-[10px]">
                          {item.path}
                        </span>
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
                          <span
                            className={
                              check.passed ? "text-emerald-500" : "text-red-400"
                            }
                          >
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
