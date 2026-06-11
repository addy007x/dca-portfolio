import type { Chapter } from "./types";

const headingPattern = /^(บทที่\s*\d+[^\n]*|ตอนที่\s*\d+[^\n]*|บทนำ[^\n]*|บทส่งท้าย[^\n]*|chapter\s+\d+[^\n]*|prologue[^\n]*|epilogue[^\n]*)$/gim;

export function cleanManuscript(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitIntoChapters(value: string): Chapter[] {
  const text = cleanManuscript(value);
  if (!text) return [];
  const matches = [...text.matchAll(headingPattern)];
  if (matches.length) {
    const chapters: Chapter[] = [];
    if ((matches[0].index || 0) > 0) {
      const preface = text.slice(0, matches[0].index).trim();
      if (preface) chapters.push(makeChapter("บทนำ", preface, 0));
    }
    matches.forEach((match, index) => {
      const start = (match.index || 0) + match[0].length;
      const end = matches[index + 1]?.index ?? text.length;
      chapters.push(makeChapter(match[0].trim(), text.slice(start, end).trim(), chapters.length));
    });
    return chapters.filter(chapter => chapter.text.length > 0);
  }

  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const chapters: Chapter[] = [];
  let buffer: string[] = [];
  let count = 0;
  for (const paragraph of paragraphs) {
    buffer.push(paragraph);
    count += paragraph.length;
    if (count >= 2400) {
      chapters.push(makeChapter(`ตอนที่ ${chapters.length + 1}`, buffer.join("\n\n"), chapters.length));
      buffer = [];
      count = 0;
    }
  }
  if (buffer.length) chapters.push(makeChapter(`ตอนที่ ${chapters.length + 1}`, buffer.join("\n\n"), chapters.length));
  return chapters;
}

function makeChapter(title: string, text: string, index: number): Chapter {
  return { id: `chapter-${index + 1}`, title, text, selected: index === 0 };
}

export function sentenceGroups(text: string, maxChars = 48) {
  const sentences = cleanManuscript(text)
    .split(/(?<=[.!?。！？]|[ๆฯ])\s+|\n+/)
    .map(item => item.trim())
    .filter(Boolean);
  const groups: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      groups.push(sentence);
      continue;
    }
    const words = sentence.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        groups.push(line);
        line = word;
      } else line = next;
    }
    if (line) groups.push(line);
  }
  return groups;
}
