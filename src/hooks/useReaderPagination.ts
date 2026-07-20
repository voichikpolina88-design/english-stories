import { useEffect, useMemo, useState } from "react";
import type { ReaderChapter, ReaderSentence, ReaderWord, ReadingSettings } from "../types";

export type ReaderPageWord = ReaderWord & {
  paragraphId: string;
  sentenceId: string;
  sentenceTranslation?: string;
  sentenceAudioSrc?: string;
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
};

const EMPTY_SIZE: PaginationSize = { width: 0, height: 0 };

export function flattenChapterWords(chapter: ReaderChapter): ReaderPageWord[] {
  const words: ReaderPageWord[] = [];

  chapter.paragraphs.forEach((paragraph) => {
    paragraph.sentences.forEach((sentence) => {
      getSentenceWords(sentence).forEach((word) => {
        words.push({
          ...word,
          paragraphId: paragraph.id,
          sentenceId: sentence.id,
          sentenceTranslation: sentence.translation,
          sentenceAudioSrc: sentence.audioSrc,
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
    if (size.width <= 0 || size.height <= 0 || words.length === 0) {
      setPages([]);
      setIsPaginating(true);
      return;
    }

    let cancelled = false;
    setIsPaginating(true);

    window.requestAnimationFrame(() => {
      const nextPages = paginateChapterContent({
        chapter,
        fontFamily,
        pageHeight: Math.max(1, size.height - 40),
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
  }, [chapter, fontFamily, settings.fontFamily, settings.lineHeight, settings.showWordTranslation, settings.textSize, settings.textWidth, size.height, size.width, words]);

  return { flatWords: words, isPaginating, pages };
}

function paginateChapterContent({
  chapter,
  fontFamily,
  pageHeight,
  pageWidth,
  settings,
  words,
}: {
  chapter: ReaderChapter;
  fontFamily: string;
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
  let pageStartWordIndex = 0;
  let pageTop = 0;

  words.forEach((word, index) => {
    const node = measureRoot.querySelector<HTMLElement>(`[data-measure-word-id="${word.id}"]`);
    if (!node) return;

    const wordBottom = node.offsetTop + node.offsetHeight;
    const doesNotFit = index > pageStartWordIndex && wordBottom - pageTop > pageHeight;

    if (doesNotFit) {
      pages.push(createPage(words, pageStartWordIndex, index));
      pageStartWordIndex = index;
      pageTop = node.offsetTop;
    }
  });

  if (pageStartWordIndex < words.length) {
    pages.push(createPage(words, pageStartWordIndex, words.length));
  }

  measureRoot.remove();
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

    const textNode = document.createElement("span");
    textNode.textContent = word.text;
    wordNode.appendChild(textNode);

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
  paragraphNode.appendChild(sentenceNode);
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

export const emptyPaginationSize = EMPTY_SIZE;
