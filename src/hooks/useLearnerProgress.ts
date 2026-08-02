import { useEffect, useState } from "react";
import { getReaderBook } from "../data/aliceReader";
import { comingSoonBookIds } from "../data/homeShelves";
import type { BookCompletion, ChapterCompletion, LastOpenedContent, LearnerProgress, NativeLanguage } from "../types";

const STORAGE_KEY = "english-stories-progress";

const today = () => new Date().toISOString().slice(0, 10);

const defaultProgress: LearnerProgress = {
  selectedLanguage: "Russian",
  readingProgress: {},
  chapterCompletions: {},
  bookCompletions: {},
  lastVisitDate: today(),
};

type CompleteChapterInput = {
  bookId: string;
  chapterId: string;
  chapterIds: string[];
  readingSeconds: number;
  savedWordsCount: number;
  readingProgress: number;
  completedAt?: string;
};

export function useLearnerProgress() {
  const [progress, setProgress] = useState<LearnerProgress>(() => {
    const saved = readProgressFromStorage();
    return normalizeLoadedProgress(saved);
  });

  useEffect(() => {
    writeProgressToStorage(progress);
  }, [progress]);

  function saveReadingProgress(itemId: string, value: number) {
    const normalizedValue = Math.min(100, Math.max(0, Math.round(value)));
    setProgress((current) => ({
      ...current,
      lastVisitDate: today(),
      readingProgress: {
        ...current.readingProgress,
        [itemId]: Math.max(current.readingProgress[itemId] ?? 0, normalizedValue),
      },
      lastOpenedContent:
        current.lastOpenedContent?.contentId === itemId
          ? {
              ...current.lastOpenedContent,
              readingProgress: Math.max(current.lastOpenedContent.readingProgress, normalizedValue),
              openedAt: new Date().toISOString(),
            }
          : current.lastOpenedContent,
    }));
  }

  function saveLastOpenedContent(nextContent: Omit<LastOpenedContent, "openedAt"> & { openedAt?: string }) {
    setProgress((current) => {
      const normalizedProgress = Math.min(100, Math.max(0, Math.round(nextContent.readingProgress)));

      return {
        ...current,
        lastVisitDate: today(),
        lastOpenedContent: {
          ...nextContent,
          openedAt: nextContent.openedAt ?? new Date().toISOString(),
          readingProgress: normalizedProgress,
        },
      };
    });
  }

  function saveChapterCompletion(nextCompletion: ChapterCompletion) {
    const key = getChapterCompletionKey(nextCompletion.bookId, nextCompletion.chapterId);
    setProgress((current) => {
      const existing = current.chapterCompletions?.[key];
      const completion: ChapterCompletion = {
        ...nextCompletion,
        completed: true,
        completedAt: existing?.completedAt ?? nextCompletion.completedAt ?? new Date().toISOString(),
        totalReadingSeconds: Math.max(existing?.totalReadingSeconds ?? 0, nextCompletion.totalReadingSeconds),
        savedWordsCount: nextCompletion.savedWordsCount,
      };

      return {
        ...current,
        lastVisitDate: today(),
        chapterCompletions: {
          ...(current.chapterCompletions ?? {}),
          [key]: completion,
        },
      };
    });
  }

  function completeChapterAndUpdateBook(input: CompleteChapterInput) {
    const completedAt = input.completedAt ?? new Date().toISOString();
    setProgress((current) => {
      const chapterKey = getChapterCompletionKey(input.bookId, input.chapterId);
      const existingChapter = current.chapterCompletions?.[chapterKey];
      const nextChapterCompletions = {
        ...(current.chapterCompletions ?? {}),
        [chapterKey]: {
          bookId: input.bookId,
          chapterId: input.chapterId,
          completed: true,
          completedAt: existingChapter?.completedAt ?? completedAt,
          totalReadingSeconds: Math.max(existingChapter?.totalReadingSeconds ?? 0, input.readingSeconds),
          savedWordsCount: input.savedWordsCount,
        },
      };
      const completedChapterIds = new Set(
        input.chapterIds.filter((chapterId) => nextChapterCompletions[getChapterCompletionKey(input.bookId, chapterId)]?.completed),
      );
      const isBookCompleted = input.chapterIds.length > 0 && input.chapterIds.every((chapterId) => completedChapterIds.has(chapterId));
      const existingBook = current.bookCompletions?.[input.bookId];
      const nextBookCompletion: BookCompletion | undefined = isBookCompleted
        ? {
            bookId: input.bookId,
            completed: true,
            completedAt: existingBook?.completedAt ?? completedAt,
            totalChapterCount: input.chapterIds.length,
          }
        : existingBook;
      const normalizedProgress = isBookCompleted ? 100 : Math.min(99, Math.max(0, Math.round(input.readingProgress)));

      return repairCompletedBookState({
        ...current,
        lastVisitDate: today(),
        readingProgress: {
          ...current.readingProgress,
          [input.bookId]: Math.max(current.readingProgress[input.bookId] ?? 0, normalizedProgress),
        },
        chapterCompletions: nextChapterCompletions,
        bookCompletions: nextBookCompletion
          ? {
              ...(current.bookCompletions ?? {}),
              [input.bookId]: nextBookCompletion,
            }
          : current.bookCompletions,
        lastOpenedContent:
          current.lastOpenedContent?.contentId === input.bookId
            ? {
                ...current.lastOpenedContent,
                chapterId: input.chapterId,
                readingProgress: Math.max(current.lastOpenedContent.readingProgress, normalizedProgress),
                openedAt: completedAt,
              }
            : current.lastOpenedContent,
      });
    });
  }

  function selectLanguage(language: NativeLanguage) {
    setProgress((current) => ({ ...current, selectedLanguage: language }));
  }

  function replaceProgress(nextProgress: Partial<LearnerProgress>) {
    setProgress(normalizeLoadedProgress(nextProgress));
  }

  return {
    progress,
    saveReadingProgress,
    saveLastOpenedContent,
    saveChapterCompletion,
    completeChapterAndUpdateBook,
    selectLanguage,
    replaceProgress,
  };
}

export function getChapterCompletionKey(bookId: string, chapterId: string) {
  return `${bookId}:${chapterId}`;
}

function migrateLessonProgress(saved: Partial<LearnerProgress> & { lessonProgress?: Record<string, number> } | null) {
  return saved?.lessonProgress ?? {};
}

function readProgressFromStorage(): (Partial<LearnerProgress> & { lessonProgress?: Record<string, number> }) | null {
  try {
    if (!window.localStorage) return null;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function normalizeLoadedProgress(saved: (Partial<LearnerProgress> & { lessonProgress?: Record<string, number> }) | null | undefined): LearnerProgress {
  return normalizeProgressForAvailability(repairCompletedBookState({
    ...defaultProgress,
    ...saved,
    selectedLanguage: saved?.selectedLanguage ?? defaultProgress.selectedLanguage,
    readingProgress: {
      ...migrateLessonProgress(saved ?? null),
      ...(saved?.readingProgress ?? {}),
    },
    chapterCompletions: saved?.chapterCompletions ?? {},
    bookCompletions: saved?.bookCompletions ?? {},
    lastOpenedContent: saved?.lastOpenedContent ?? null,
    lastVisitDate: saved?.lastVisitDate ?? today(),
  }));
}

function repairCompletedBookState(progress: LearnerProgress): LearnerProgress {
  const chapterCompletions = progress.chapterCompletions ?? {};
  const bookCompletions = { ...(progress.bookCompletions ?? {}) };
  const readingProgress = { ...progress.readingProgress };

  [getReaderBook("alice-in-wonderland")].forEach((book) => {
    if (!book) return;
    const isCompleted = book.chapters.every((chapter) => chapterCompletions[getChapterCompletionKey(book.id, chapter.id)]?.completed);
    if (!isCompleted) return;

    const existing = bookCompletions[book.id];
    bookCompletions[book.id] = {
      bookId: book.id,
      completed: true,
      completedAt: existing?.completedAt ?? getLatestChapterCompletionAt(book.id, book.chapters.map((chapter) => chapter.id), chapterCompletions),
      totalChapterCount: book.chapters.length,
    };
    readingProgress[book.id] = 100;
  });

  return {
    ...progress,
    readingProgress,
    chapterCompletions,
    bookCompletions,
  };
}

function normalizeProgressForAvailability(progress: LearnerProgress): LearnerProgress {
  const readingProgress = { ...progress.readingProgress };
  const chapterCompletions = { ...(progress.chapterCompletions ?? {}) };
  const bookCompletions = { ...(progress.bookCompletions ?? {}) };

  comingSoonBookIds.forEach((bookId) => {
    delete readingProgress[bookId];
    delete bookCompletions[bookId];

    Object.keys(chapterCompletions).forEach((key) => {
      if (key.startsWith(`${bookId}:`)) {
        delete chapterCompletions[key];
      }
    });
  });

  const lastOpenedContent = progress.lastOpenedContent && comingSoonBookIds.has(progress.lastOpenedContent.contentId)
    ? null
    : progress.lastOpenedContent;

  return {
    ...progress,
    readingProgress,
    chapterCompletions,
    bookCompletions,
    lastOpenedContent,
  };
}

function getLatestChapterCompletionAt(bookId: string, chapterIds: string[], completions: Record<string, ChapterCompletion>) {
  return chapterIds
    .map((chapterId) => completions[getChapterCompletionKey(bookId, chapterId)]?.completedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? new Date().toISOString();
}

function writeProgressToStorage(progress: LearnerProgress) {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Some iOS Safari/WebView contexts block localStorage. The app should still run.
  }
}
