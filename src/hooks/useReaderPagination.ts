import { useEffect, useMemo, useState } from "react";
import type { ReaderChapter, ReaderSentence, ReaderWord, ReadingSettings } from "../types";

export type ReaderPageWord = ReaderWord & {
  paragraphId: string;
  sentenceId: string;
  sentenceText: string;
  sentenceTranslation?: string;
  sentenceAudioSrc?: string;
  isSentenceEnd: boolean;
  absoluteIndex: number;
};

export type ReaderPage = {
  id: string;
  words: ReaderPageWord[];
  firstWordId: string;
  firstSentenceId: string;
};

type PaginationSize = {
  width: number;
  height: number;
  firstPageHeight: number;
};

const EMPTY_SIZE: PaginationSize = { width: 0, height: 0, firstPageHeight: 0 };

export function flattenChapterWords(chapter: ReaderChapter): ReaderPageWord[] {
  const words: ReaderPageWord[] = [];

  chapter.paragraphs.forEach((paragraph) => {
    paragraph.sentences.forEach((sentence) => {
      const sentenceWords = getSentenceWords(sentence);
      sentenceWords.forEach((word, sentenceWordIndex) => {
        words.push({
          ...word,
          paragraphId: paragraph.id,
          sentenceId: sentence.id,
          sentenceText: sentence.text,
          sentenceTranslation: sentence.translation,
          sentenceAudioSrc: sentence.audioSrc,
          isSentenceEnd: sentenceWordIndex === sentenceWords.length - 1,
          absoluteIndex: words.length,
        });
      });
    });
  });

  return words;
}

function getSentenceWords(sentence: ReaderSentence): ReaderWord[] {
  if (sentence.words?.length) return sentence.words;

  return sentence.text.split(/\s+/).filter(Boolean).map((word, index) => ({
    id: `${sentence.id}-w${index + 1}`,
    text: word,
  }));
}

export function useReaderPagination({
  chapter,
  settings,
  size,
  fontFamily,
}: {
  chapter: ReaderChapter;
  settings: ReadingSettings;
  size: PaginationSize;
  fontFamily: string;
}) {
  const words = useMemo(() => flattenChapterWords(chapter), [chapter]);
  const [pages, setPages] = useState<ReaderPage[]>([]);
  const [isPaginating, setIsPaginating] = useState(true);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0 || size.firstPageHeight <= 0 || words.length === 0) {
      setPages([]);
      setIsPaginating(true);
      return;
    }

    let cancelled = false;
    setIsPaginating(true);

    window.requestAnimationFrame(async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }

      if (cancelled) return;

      const nextPages = paginateChapterContent({
        chapter,
        fontFamily,
        firstPageHeight: Math.max(1, size.firstPageHeight),
        pageHeight: Math.max(1, size.height),
        pageWidth: size.width,
        settings,
        words,
      });

      if (!cancelled) {
        setPages(nextPages);
        setIsPaginating(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    chapter,
    fontFamily,
    settings.accentedReading,
    settings.fontFamily,
    settings.lineHeight,
    settings.showWordTranslation,
    settings.textAlign,
    settings.textSize,
    settings.textWidth,
    size.height,
    size.firstPageHeight,
    size.width,
    words,
  ]);

  return { flatWords: words, isPaginating, pages };
}

function paginateChapterContent({
  chapter,
  fontFamily,
  firstPageHeight,
  pageHeight,
  pageWidth,
  settings,
  words,
}: {
  chapter: ReaderChapter;
  fontFamily: string;
  firstPageHeight: number;
  pageHeight: number;
  pageWidth: number;
  settings: ReadingSettings;
  words: ReaderPageWord[];
}): ReaderPage[] {
  const measureRoot = document.createElement("div");
  measureRoot.className = "reader-measure-root";
  Object.assign(measureRoot.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${pageWidth}px`,
    visibility: "hidden",
    pointerEvents: "none",
    contain: "layout style paint",
    fontFamily,
    fontSize: `${settings.textSize}px`,
    lineHeight: String(settings.lineHeight),
    textAlign: settings.textAlign,
  });

  const textRoot = document.createElement("div");
  textRoot.className = "structured-text reader-measure-text";
  measureRoot.appendChild(textRoot);

  chapter.paragraphs.forEach((paragraph) => {
    const paragraphNode = document.createElement("p");
    paragraphNode.className = paragraph.type === "poem" ? "reader-paragraph reader-poem" : "reader-paragraph";
    paragraph.sentences.forEach((sentence) => appendSentenceMeasure(sentence, paragraph.id, paragraphNode, settings));
    textRoot.appendChild(paragraphNode);
  });

  document.body.appendChild(measureRoot);

  const pages: ReaderPage[] = [];
  const measuredWords = words.map((word) => {
    const node = measureRoot.querySelector<HTMLElement>(`[data-measure-word-id="${word.id}"]`);
    return {
      top: node?.offsetTop ?? 0,
      bottom: node ? node.offsetTop + node.offsetHeight : 0,
    };
  });

  let pageStartWordIndex = 0;
  let pageTop = measuredWords[0]?.top ?? 0;

  measuredWords.forEach((measuredWord, index) => {
    const currentPageHeight = pages.length === 0 ? firstPageHeight : pageHeight;
    const wordBottom = measuredWord.bottom;
    const doesNotFit = index > pageStartWordIndex && wordBottom - pageTop > currentPageHeight;

    if (doesNotFit) {
      pages.push(createPage(words, pageStartWordIndex, index));
      pageStartWordIndex = index;
      pageTop = measuredWord.top;
    }
  });

  if (pageStartWordIndex < words.length) {
    pages.push(createPage(words, pageStartWordIndex, words.length));
  }

  measureRoot.remove();
  verifyPaginationIntegrity(words, pages);
  return pages.length > 0 ? pages : [createPage(words, 0, words.length)];
}

function appendSentenceMeasure(sentence: ReaderSentence, paragraphId: string, paragraphNode: HTMLElement, settings: ReadingSettings) {
  const sentenceNode = document.createElement("span");
  sentenceNode.className = "reader-sentence";
  getSentenceWords(sentence).forEach((word) => {
    const wordNode = document.createElement("span");
    wordNode.className = "reader-word";
    wordNode.dataset.measureWordId = word.id;
    wordNode.dataset.measureSentenceId = sentence.id;
    wordNode.dataset.measureParagraphId = paragraphId;

    appendMeasuredWordText(wordNode, word.text, settings.accentedReading);

    if (settings.showWordTranslation && word.translation) {
      const translationNode = document.createElement("small");
      translationNode.textContent = word.translation;
      wordNode.appendChild(translationNode);
    }

    sentenceNode.appendChild(wordNode);
    sentenceNode.appendChild(document.createTextNode(" "));
  });

  const audioPlaceholder = document.createElement("span");
  audioPlaceholder.className = "sentence-audio-button measure-audio-placeholder";
  sentenceNode.appendChild(audioPlaceholder);
  if (settings.showSentenceTranslation && sentence.translation) {
    const translationPlaceholder = document.createElement("span");
    translationPlaceholder.className = "sentence-translation-trigger measure-translation-placeholder";
    translationPlaceholder.textContent = "RU";
    sentenceNode.appendChild(translationPlaceholder);
  }
  paragraphNode.appendChild(sentenceNode);
}

function appendMeasuredWordText(parent: HTMLElement, text: string, accented: boolean) {
  if (!accented) {
    const textNode = document.createElement("span");
    textNode.textContent = text;
    parent.appendChild(textNode);
    return;
  }

  const parts = splitWordForAccent(text);
  if (!parts) {
    const textNode = document.createElement("span");
    textNode.textContent = text;
    parent.appendChild(textNode);
    return;
  }

  const wrapper = document.createElement("span");
  const accent = document.createElement("strong");
  accent.className = "word-accent";
  accent.textContent = parts.accent;
  const rest = document.createElement("span");
  rest.textContent = parts.rest;
  wrapper.appendChild(accent);
  wrapper.appendChild(rest);
  parent.appendChild(wrapper);
}

function splitWordForAccent(text: string): { accent: string; rest: string } | null {
  const match = text.match(/^([^A-Za-zА-Яа-яЁё]*)([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё’'-]*)(.*)$/);
  if (!match) return null;

  const [, prefix, core, suffix] = match;
  if (core.length <= 2) return null;

  const accentLength = Math.min(Math.max(2, Math.ceil(core.length * 0.38)), Math.max(2, core.length - 1));
  return {
    accent: `${prefix}${core.slice(0, accentLength)}`,
    rest: `${core.slice(accentLength)}${suffix}`,
  };
}

function createPage(words: ReaderPageWord[], startIndex: number, endIndex: number): ReaderPage {
  const pageWords = words.slice(startIndex, endIndex);
  const firstWord = pageWords[0] ?? words[0];

  return {
    id: firstWord ? `page-${firstWord.id}` : "page-empty",
    words: pageWords,
    firstWordId: firstWord?.id ?? "",
    firstSentenceId: firstWord?.sentenceId ?? "",
  };
}

function verifyPaginationIntegrity(words: ReaderPageWord[], pages: ReaderPage[]) {
  const isLocalDev = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocalDev) return;

  const originalText = normalizeReaderText(words.map((word) => word.text).join(" "));
  const paginatedWords = pages.flatMap((page) => page.words);
  const paginatedText = normalizeReaderText(paginatedWords.map((word) => word.text).join(" "));
  const originalIds = words.map((word) => word.id).join("|");
  const paginatedIds = paginatedWords.map((word) => word.id).join("|");

  if (originalText !== paginatedText || originalIds !== paginatedIds) {
    console.warn("[StoryLingo reader] Pagination integrity mismatch", {
      originalWords: words.length,
      paginatedWords: paginatedWords.length,
    });
  }
}

function normalizeReaderText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export const emptyPaginationSize = EMPTY_SIZE;
