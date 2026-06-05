export type ChapterPreview = {
  title: string;
  order: number;
  charCount: number;
};

const chapterHeadingPattern =
  /(?:^|\n)\s*(?:#{1,3}\s*)?((?:第[一二三四五六七八九十百千万0-9]+章|Chapter\s+\d+)[^\n]*)/gi;

export function previewChapters(input: string): ChapterPreview[] {
  const matches = Array.from(input.matchAll(chapterHeadingPattern));

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? input.length;
    const body = input.slice(start, end).trim();

    return {
      title: match[1].trim(),
      order: index + 1,
      charCount: body.length,
    };
  });
}
