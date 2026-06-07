export type ParsedChapter = {
  id: string;
  order: number;
  title: string;
  heading: string;
  content: string;
  charCount: number;
};

export type ParseChaptersResult = {
  chapters: ParsedChapter[];
  isValid: boolean;
  errors: string[];
};

export type ChapterInputValidation = {
  isValid: boolean;
  chapterCount: number;
  errors: string[];
};

const chapterHeadingPattern =
  /(?:^|\n)(\s*(?:#{1,3}\s*)?((?:第[一二三四五六七八九十百千万零〇两0-9]+章(?:\s+|[:：-]|$)|Chapter\s+\d+(?:\s+|[:：-]|$))[^\n\r]*))/gi;

export function parseChapters(input: string): ParseChaptersResult {
  const matches = Array.from(input.matchAll(chapterHeadingPattern));
  const trimmedInput = input.trim();

  if (matches.length === 0 && trimmedInput.length > 0) {
    const chapter: ParsedChapter = {
      id: formatChapterId(1),
      order: 1,
      title: "未命名章节",
      heading: "",
      content: trimmedInput,
      charCount: countCharacters(trimmedInput),
    };

    return {
      chapters: [chapter],
      isValid: true,
      errors: [],
    };
  }

  const chapters = matches.map((match, index): ParsedChapter => {
    const heading = (match[1] ?? "").trim();
    const title = (match[2] ?? heading.replace(/^#{1,3}\s*/, "")).trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? input.length;
    const content = input.slice(start, end).trim();

    return {
      id: formatChapterId(index + 1),
      order: index + 1,
      title,
      heading,
      content,
      charCount: countCharacters(content),
    };
  });

  const errors =
    chapters.length >= 1 ? [] : ["请先输入至少 1 个章节或一段小说文本。"];

  return {
    chapters,
    isValid: errors.length === 0,
    errors,
  };
}

export function validateChapterInput(input: string): ChapterInputValidation {
  const result = parseChapters(input);

  return {
    isValid: result.isValid,
    chapterCount: result.chapters.length,
    errors: result.errors,
  };
}

function formatChapterId(order: number): string {
  return `chapter_${String(order).padStart(3, "0")}`;
}

function countCharacters(content: string): number {
  return content.replace(/\s/g, "").length;
}
