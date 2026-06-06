import { describe, expect, it } from "vitest";
import { parseChapters, validateChapterInput } from "./parseChapters";

describe("parseChapters", () => {
  it("parses markdown Chinese chapter headings", () => {
    const result = parseChapters(`# 书名

## 第一章 雨中的包裹
第一章正文。

## 第二章 被删掉的城市
第二章正文。

## 第三章 钟楼里的名单
第三章正文。`);

    expect(result.chapters).toEqual([
      {
        id: "chapter_001",
        order: 1,
        title: "第一章 雨中的包裹",
        heading: "## 第一章 雨中的包裹",
        content: "第一章正文。",
        charCount: 6,
      },
      {
        id: "chapter_002",
        order: 2,
        title: "第二章 被删掉的城市",
        heading: "## 第二章 被删掉的城市",
        content: "第二章正文。",
        charCount: 6,
      },
      {
        id: "chapter_003",
        order: 3,
        title: "第三章 钟楼里的名单",
        heading: "## 第三章 钟楼里的名单",
        content: "第三章正文。",
        charCount: 6,
      },
    ]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("parses numbered Chinese headings without markdown", () => {
    const result = parseChapters(`第1章 起点
正文一。

第2章 转折
正文二。

第3章 追问
正文三。`);

    expect(result.chapters.map((chapter) => chapter.title)).toEqual([
      "第1章 起点",
      "第2章 转折",
      "第3章 追问",
    ]);
    expect(result.isValid).toBe(true);
  });

  it("parses English Chapter headings case-insensitively", () => {
    const result = parseChapters(`Chapter 1 Arrival
Body one.

chapter 2 Signal
Body two.

CHAPTER 3 Exit
Body three.`);

    expect(result.chapters.map((chapter) => chapter.title)).toEqual([
      "Chapter 1 Arrival",
      "chapter 2 Signal",
      "CHAPTER 3 Exit",
    ]);
    expect(result.isValid).toBe(true);
  });

  it("ignores preface text before the first recognized chapter", () => {
    const result = parseChapters(`这是前言，不应该进入第一章正文。

## 第一章 开端
正文一。

## 第二章 推进
正文二。

## 第三章 结尾
正文三。`);

    expect(result.chapters[0].content).toBe("正文一。");
    expect(result.chapters).toHaveLength(3);
  });

  it("returns validation error when fewer than three chapters are found", () => {
    const result = parseChapters(`## 第一章 开端
正文一。

## 第二章 推进
正文二。`);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      "当前仅识别到 2 个章节，至少需要 3 个章节。",
    ]);
  });
});

describe("validateChapterInput", () => {
  it("returns only the validation state for UI usage", () => {
    expect(validateChapterInput("")).toEqual({
      isValid: false,
      chapterCount: 0,
      errors: ["当前仅识别到 0 个章节，至少需要 3 个章节。"],
    });
  });
});
