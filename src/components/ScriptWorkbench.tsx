"use client";

import {
  BookOpen,
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  FileText,
  FileUp,
  Film,
  Loader2,
  Play,
  RefreshCw,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  { step: "summarize", label: "理解章节" },
  { step: "extract_characters", label: "梳理人物" },
  { step: "extract_locations", label: "整理地点" },
  { step: "plot_summary", label: "提炼主线" },
  { step: "split_scenes", label: "拆分场景" },
  { step: "adaptation_notes", label: "生成建议" },
];

const apiConfigStorageKey = "novel2script-api-config";
const apiKeySessionStorageKey = "novel2script-api-key";
const legacyApiConfigStorageKey = "noverl2script-api-config";
const legacyApiKeySessionStorageKey = "noverl2script-api-key";

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

type ApiConfigState = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type ServerApiConfig = {
  hasServerApiKey: boolean;
  baseURL: string;
  model: string;
};

function readStoredApiConfig(): ApiConfigState {
  if (typeof window === "undefined") {
    return { baseUrl: "", apiKey: "", model: "" };
  }

  try {
    const saved =
      window.localStorage.getItem(apiConfigStorageKey) ??
      window.localStorage.getItem(legacyApiConfigStorageKey);
    let sessionApiKey =
      window.sessionStorage.getItem(apiKeySessionStorageKey) ??
      window.sessionStorage.getItem(legacyApiKeySessionStorageKey) ??
      "";
    let baseUrl = "";
    let model = "";

    if (saved) {
      const parsed = JSON.parse(saved) as {
        baseUrl?: string;
        apiKey?: string;
        model?: string;
      };
      baseUrl = parsed.baseUrl ?? "";
      model = parsed.model ?? "";

      if (parsed.apiKey) {
        sessionApiKey = parsed.apiKey;
        window.sessionStorage.setItem(apiKeySessionStorageKey, parsed.apiKey);
        window.localStorage.setItem(
          apiConfigStorageKey,
          JSON.stringify({ baseUrl, model }),
        );
        window.localStorage.removeItem(legacyApiConfigStorageKey);
      }
    }

    if (sessionApiKey) {
      window.sessionStorage.setItem(apiKeySessionStorageKey, sessionApiKey);
      window.sessionStorage.removeItem(legacyApiKeySessionStorageKey);
    }

    return { baseUrl, apiKey: sessionApiKey, model };
  } catch {
    return { baseUrl: "", apiKey: "", model: "" };
  }
}

function createInitialGenerationSteps(): GenerationStepView[] {
  return generationStepList.map((step) => ({
    ...step,
    status: "pending",
  }));
}

function decodeNovelFile(buffer: ArrayBuffer): {
  text: string;
  encoding: string;
} {
  const decoders = [
    { label: "UTF-8", decoder: new TextDecoder("utf-8", { fatal: true }) },
    { label: "GB18030", decoder: new TextDecoder("gb18030", { fatal: true }) },
    { label: "GBK", decoder: new TextDecoder("gbk", { fatal: true }) },
  ];

  for (const { label, decoder } of decoders) {
    try {
      return { text: decoder.decode(buffer), encoding: label };
    } catch {
      // Try the next common Chinese text encoding.
    }
  }

  return {
    text: new TextDecoder("utf-8").decode(buffer),
    encoding: "UTF-8 fallback",
  };
}

function beatLabel(type: string): string {
  if (type === "dialogue") return "对白";
  if (type === "action") return "动作";
  if (type === "narration") return "旁白";
  return "转场";
}

function ApiConfigPanel({
  initialBaseUrl,
  initialApiKey,
  initialModel,
  serverConfig,
  onSave,
  onClose,
}: {
  initialBaseUrl: string;
  initialApiKey: string;
  initialModel: string;
  serverConfig: ServerApiConfig | null;
  onSave: (baseUrl: string, apiKey: string, model: string) => void;
  onClose: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [model, setModel] = useState(initialModel);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="mx-4 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">大模型 API 配置</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              可在这里临时覆盖服务端配置；留空则使用服务端 .env 或 Mock 模式。
            </p>
          </div>
          <button
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-alt)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-md border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
            {serverConfig?.hasServerApiKey
              ? `服务端 .env 已配置，将默认使用 ${serverConfig.model}。`
              : "服务端 .env 未配置；如不填写 API Key，将使用 Mock 模式。"}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              API Key
              <span className="ml-1 text-xs text-[var(--muted)]">
                {serverConfig?.hasServerApiKey ? "可选" : "必填"}
              </span>
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                serverConfig?.hasServerApiKey
                  ? "留空使用服务端 .env 中的 API Key"
                  : "sk-..."
              }
              type="password"
              value={apiKey}
            />
            <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
              API Key 仅保存在当前浏览器会话中，关闭标签页后需要重新填写。
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Base URL
              <span className="ml-1 text-xs text-[var(--muted)]">选填</span>
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={serverConfig?.baseURL ?? "https://api.openai.com/v1"}
              type="url"
              value={baseUrl}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Model
              <span className="ml-1 text-xs text-[var(--muted)]">选填</span>
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              onChange={(e) => setModel(e.target.value)}
              placeholder={serverConfig?.model ?? "deepseek-v4-flash"}
              type="text"
              value={model}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm hover:bg-[var(--surface-alt)]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
            onClick={() => onSave(baseUrl, apiKey, model)}
            type="button"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScriptWorkbench() {
  const [novelText, setNovelText] = useState(fallbackNovel);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(
    null,
  );
  const [editableDraft, setEditableDraft] = useState<ScriptDraft | null>(null);
  const [scriptYaml, setScriptYaml] = useState("");
  const [status, setStatus] = useState("导入小说后生成剧本初稿");
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] =
    useState<DraftValidationResult | null>(null);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStepView[]>(
    createInitialGenerationSteps,
  );
  const [hasEditedSinceValidation, setHasEditedSinceValidation] =
    useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfig, setApiConfig] = useState(readStoredApiConfig);
  const [serverApiConfig, setServerApiConfig] =
    useState<ServerApiConfig | null>(null);
  const apiBaseUrl = apiConfig.baseUrl;
  const apiKey = apiConfig.apiKey;
  const apiModel = apiConfig.model;

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ServerApiConfig | null) => {
        if (!cancelled && data) {
          setServerApiConfig(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerApiConfig(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadApiConfig = useCallback(() => {
    setApiConfig(readStoredApiConfig());
  }, []);

  const saveApiConfig = useCallback(
    (baseUrl: string, key: string, model: string) => {
      setApiConfig({ baseUrl, apiKey: key, model });
      localStorage.setItem(
        apiConfigStorageKey,
        JSON.stringify({ baseUrl, model }),
      );
      if (key.trim()) {
        sessionStorage.setItem(apiKeySessionStorageKey, key);
        sessionStorage.removeItem(legacyApiKeySessionStorageKey);
      } else {
        sessionStorage.removeItem(apiKeySessionStorageKey);
        sessionStorage.removeItem(legacyApiKeySessionStorageKey);
      }
      localStorage.removeItem(legacyApiConfigStorageKey);
    },
    [],
  );

  const hasApiConfig = apiKey.length > 0;
  const hasServerApiConfig = Boolean(serverApiConfig?.hasServerApiKey);

  const chapterResult = useMemo(() => parseChapters(novelText), [novelText]);
  const chapters = chapterResult.chapters;
  const chapterReady = chapterResult.isValid;

  const characterNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const character of editableDraft?.characters ?? []) {
      names.set(character.id, character.name);
    }
    return names;
  }, [editableDraft]);

  function syncDraftAndYaml(draft: ScriptDraft, markEdited = true) {
    setEditableDraft(draft);
    setScriptYaml(YAML.stringify(draft, { lineWidth: 0 }));
    if (markEdited) {
      setHasEditedSinceValidation(true);
      setStatus("修改已同步到当前剧本");
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
    setStatus("正在载入样例...");

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
      setStatus("样例已载入，可以生成剧本");
    } catch {
      setStatus("示例不可用，已保留本地默认内容");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNovelFileUpload(file: File | null) {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "md", "markdown"].includes(extension ?? "")) {
      setStatus("当前支持上传 .txt、.md、.markdown 文本文件");
      return;
    }

    try {
      const { text, encoding } = decodeNovelFile(await file.arrayBuffer());
      setNovelText(text);
      setPipelineResult(null);
      setEditableDraft(null);
      setScriptYaml("");
      setValidationResult(null);
      setQualityScore(null);
      setHasEditedSinceValidation(false);
      setGenerationSteps(createInitialGenerationSteps());
      setStatus(`已导入 ${file.name}（${encoding}）`);
    } catch {
      setStatus("文件读取失败，请确认文件内容是可读取文本");
    }
  }

  async function runValidation(yaml: string): Promise<boolean> {
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yamlText: yaml }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        console.error(data?.error ?? "结构检查接口返回失败");
        setValidationResult(null);
        setQualityScore(null);
        setHasEditedSinceValidation(true);
        return false;
      }
      const data = (await response.json()) as {
        validation: DraftValidationResult;
        qualityScore: QualityScore | null;
      };
      setValidationResult(data.validation);
      setQualityScore(data.qualityScore);
      setHasEditedSinceValidation(false);
      return true;
    } catch {
      console.error("结构检查请求失败");
      setValidationResult(null);
      setQualityScore(null);
      setHasEditedSinceValidation(true);
      return false;
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
    setStatus("正在准备生成...");

    try {
      const response = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelText,
          apiConfig: hasApiConfig
            ? {
                apiKey,
                baseURL: apiBaseUrl || undefined,
                model: apiModel || undefined,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        setStatus(`生成失败：${errorData.error}`);
        return;
      }

      if (!response.body) {
        throw new Error("浏览器不支持流式响应");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (eventName: string, payload: unknown) => {
        if (eventName === "pipeline_start") {
          const data = payload as { chapter_count: number };
          setStatus(`正在改编 ${data.chapter_count} 个章节`);
          return;
        }

        if (eventName === "step_start") {
          const data = payload as { step: PipelineStepName; label: string };
          updateGenerationStep(data.step, { status: "running" });
          setStatus(data.label);
          return;
        }

        if (eventName === "step_done") {
          const data = payload as PipelineStepResult;
          updateGenerationStep(data.step, {
            status: data.status,
            duration_ms: data.duration_ms,
            error: data.error,
          });
          setStatus(data.status === "completed" ? data.label : "生成中断");
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
          setStatus("剧本已生成，可继续编辑或导出");
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
          : "网络错误，请检查开发服务器是否在运行",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyYaml() {
    await navigator.clipboard.writeText(scriptYaml);
    setStatus("YAML 已复制");
  }

  function downloadYaml() {
    const blob = new Blob([scriptYaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "script-draft.yaml";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("已下载当前 YAML");
  }

  async function revalidate() {
    if (!scriptYaml) return;
    setIsLoading(true);
    setStatus("正在检查当前结构...");
    try {
      const ok = await runValidation(scriptYaml);
      setStatus(ok ? "结构检查完成" : "检查失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }

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
    unknown: "角色",
  };

  const completedSteps = generationSteps.filter(
    (step) => step.status === "completed",
  ).length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              <h1 className="text-xl font-semibold">Novel2Script</h1>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              AI 小说剧本改编工作台
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--surface-alt)]"
              onClick={loadExample}
              type="button"
            >
              <FileText className="h-4 w-4" />
              样例
            </button>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--surface-alt)]">
              <FileUp className="h-4 w-4" />
              导入文本
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
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-[var(--surface-alt)] ${
                hasApiConfig || hasServerApiConfig
                  ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
              onClick={() => {
                loadApiConfig();
                setShowApiConfig(true);
              }}
              title="大模型 API 配置"
              type="button"
            >
              <Settings2 className="h-4 w-4" />
              {hasApiConfig
                ? "模型已配置"
                : hasServerApiConfig
                  ? "服务端模型"
                  : "模型设置"}
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!chapterReady || isLoading}
              onClick={generateDraft}
              type="button"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              生成剧本
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <div className="mb-5 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[var(--foreground)]">
              <BookOpen className="h-4 w-4" />
              已解析 {chapters.length} 个章节
            </span>
            <span>{status}</span>
          </div>
          {(isLoading || pipelineResult) && (
            <div className="flex flex-wrap gap-2">
              {generationSteps.map((step) => (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                    step.status === "completed"
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : step.status === "running"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : step.status === "error"
                          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                          : "bg-[var(--surface-alt)] text-[var(--muted)]"
                  }`}
                  key={step.step}
                >
                  {step.status === "running" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : step.status === "completed" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : null}
                  {step.label}
                </span>
              ))}
              <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs">
                {completedSteps}/{generationSteps.length}
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(620px,1.15fr)]">
          <section className="min-h-[calc(100vh-13rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-base font-semibold">原文</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                粘贴小说内容，或导入文本文件。系统会自动识别章节。
              </p>
            </div>
            <textarea
              aria-label="小说文本输入"
              className="h-[calc(100vh-20rem)] min-h-[34rem] w-full resize-none border-0 bg-transparent px-5 py-4 text-[15px] leading-7 text-[var(--foreground)] outline-none"
              onChange={(event) => setNovelText(event.target.value)}
              value={novelText}
            />
          </section>

          <section className="min-h-[calc(100vh-13rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold">剧本工作台</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  编辑人物、场景和对白，导出当前剧本。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm hover:bg-[var(--surface-alt)]"
                  onClick={() => setShowAdvanced((value) => !value)}
                  type="button"
                >
                  <Settings2 className="h-4 w-4" />
                  高级信息
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm hover:bg-[var(--surface-alt)]"
                  disabled={!scriptYaml}
                  onClick={downloadYaml}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  导出 YAML
                </button>
              </div>
            </div>

            <div className="space-y-6 px-5 py-5">
              {hasEditedSinceValidation && (
                <div className="rounded-md border border-[var(--warning-soft)] bg-[var(--warning-bg)] px-3 py-2 text-sm text-[var(--warning)]">
                  修改已同步。导出前可以在高级信息里重新检查结构。
                </div>
              )}

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <BookOpen className="h-4 w-4" />
                  章节
                </h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {chapters.map((chapter) => (
                    <article
                      className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2"
                      key={`${chapter.order}-${chapter.title}`}
                    >
                      <h4 className="text-sm font-medium">{chapter.title}</h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {chapter.charCount} 字
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              {!editableDraft && (
                <section className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--paper)] px-6 py-10 text-center">
                  <Film className="mx-auto h-8 w-8 text-[var(--muted)]" />
                  <h3 className="mt-3 text-base font-semibold">
                    生成后在这里编辑剧本
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                    人物、场景和对白会以可读的剧本结构展示。YAML
                    与检查信息保留在高级信息中。
                  </p>
                </section>
              )}

              {editableDraft && (
                <>
                  <section className="rounded-lg bg-[var(--paper)] px-4 py-4">
                    <h3 className="text-sm font-semibold">故事主线</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                      {editableDraft.plot_summary.synopsis ||
                        editableDraft.plot_summary.logline}
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4" />
                      人物
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {editableDraft.characters.map((character) => (
                        <article
                          className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-3"
                          key={character.id}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              aria-label="人物名称"
                              className="min-w-0 flex-1 rounded-md border border-transparent bg-white px-2 py-1 text-sm font-medium outline-none focus:border-[var(--accent)]"
                              onChange={(event) =>
                                updateCharacterField(
                                  character.id,
                                  "name",
                                  event.target.value,
                                )
                              }
                              type="text"
                              value={character.name}
                            />
                            <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--muted)]">
                              {roleLabel[character.role] ?? character.role}
                            </span>
                          </div>
                          <textarea
                            aria-label="人物描述"
                            className="mt-2 w-full resize-none rounded-md border border-transparent bg-white px-2 py-1 text-xs leading-5 outline-none focus:border-[var(--accent)]"
                            onChange={(event) =>
                              updateCharacterField(
                                character.id,
                                "description",
                                event.target.value,
                              )
                            }
                            rows={2}
                            value={character.description}
                          />
                        </article>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Film className="h-4 w-4" />
                      场景
                    </h3>
                    <div className="space-y-4">
                      {editableDraft.scenes.map((scene, sceneIndex) => (
                        <article
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4"
                          key={scene.id}
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs text-[var(--muted)]">
                              场景 {sceneIndex + 1}
                            </span>
                            <input
                              aria-label="场景标题"
                              className="min-w-0 flex-1 rounded-md border border-transparent bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--accent)]"
                              onChange={(event) =>
                                updateSceneField(
                                  scene.id,
                                  "title",
                                  event.target.value,
                                )
                              }
                              type="text"
                              value={scene.title}
                            />
                            <input
                              aria-label="时间段"
                              className="w-24 rounded-md border border-transparent bg-[var(--surface-alt)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
                              onChange={(event) =>
                                updateSceneField(
                                  scene.id,
                                  "time_of_day",
                                  event.target.value,
                                )
                              }
                              type="text"
                              value={scene.time_of_day}
                            />
                          </div>
                          <textarea
                            aria-label="场景摘要"
                            className="mt-3 w-full resize-none rounded-md border border-transparent bg-[var(--surface-alt)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--accent)]"
                            onChange={(event) =>
                              updateSceneField(
                                scene.id,
                                "summary",
                                event.target.value,
                              )
                            }
                            rows={2}
                            value={scene.summary}
                          />
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {scene.characters.map((characterId) => (
                              <span
                                className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]"
                                key={characterId}
                              >
                                {characterNames.get(characterId) ?? characterId}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4 space-y-2">
                            {scene.beats.map((beat, beatIndex) => (
                              <div
                                className="grid gap-2 md:grid-cols-[4rem_1fr]"
                                key={`${scene.id}-beat-${beatIndex}`}
                              >
                                <span className="pt-2 text-xs text-[var(--muted)]">
                                  {beatLabel(beat.type)}
                                </span>
                                <textarea
                                  aria-label={`beat ${beatIndex + 1}`}
                                  className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--accent)]"
                                  onChange={(event) =>
                                    updateBeatContent(
                                      scene.id,
                                      beatIndex,
                                      event.target.value,
                                    )
                                  }
                                  rows={beat.content.length > 34 ? 2 : 1}
                                  value={beat.content}
                                />
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {showAdvanced && (
                <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Code2 className="h-4 w-4" />
                        高级信息
                      </h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        用于导出、结构检查和内部验收。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-[var(--surface-alt)] ${
                          hasApiConfig
                            ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                        onClick={() => {
                          loadApiConfig();
                          setShowApiConfig(true);
                        }}
                        title="大模型 API 配置"
                        type="button"
                      >
                        <Settings2 className="h-4 w-4" />
                        {hasApiConfig ? "已配置" : "设置"}
                      </button>
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs hover:bg-[var(--paper)]"
                        disabled={isLoading || !scriptYaml}
                        onClick={revalidate}
                        type="button"
                      >
                        <RefreshCw className="h-4 w-4" />
                        检查结构
                      </button>
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs hover:bg-[var(--paper)]"
                        disabled={!scriptYaml}
                        onClick={copyYaml}
                        type="button"
                      >
                        <Clipboard className="h-4 w-4" />
                        复制 YAML
                      </button>
                    </div>
                  </div>

                  {validationResult && (
                    <div className="rounded-md bg-[var(--surface)] px-3 py-2 text-sm">
                      <span className="font-medium">
                        {validationResult.valid
                          ? "结构完整，可导出"
                          : `发现 ${validationResult.items.length} 个结构问题`}
                      </span>
                      {validationResult.items.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                          {validationResult.items.map((item, index) => (
                            <li key={`${item.path}-${index}`}>
                              <span className="font-mono">{item.path}</span>
                              <span className="ml-2">{item.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {qualityScore && (
                    <div className="rounded-md bg-[var(--surface)] px-3 py-2 text-sm">
                      内部评分：{qualityScore.totalScore} /{" "}
                      {qualityScore.totalMax}
                    </div>
                  )}

                  <pre className="max-h-72 overflow-auto rounded-md bg-[var(--paper)] px-3 py-3 text-xs leading-5 text-[var(--foreground)]">
                    <code>{scriptYaml}</code>
                  </pre>
                </section>
              )}
            </div>
          </section>
        </div>
      </section>

      {showApiConfig && (
        <ApiConfigPanel
          initialBaseUrl={apiBaseUrl}
          initialApiKey={apiKey}
          initialModel={apiModel}
          serverConfig={serverApiConfig}
          onSave={(baseUrl, key, model) => {
            saveApiConfig(baseUrl, key, model);
            setShowApiConfig(false);
          }}
          onClose={() => setShowApiConfig(false)}
        />
      )}
    </main>
  );
}
