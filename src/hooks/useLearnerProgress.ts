import { useEffect, useState } from "react";
import type { ChapterCompletion, LastOpenedContent, LearnerProgress, NativeLanguage } from "../types";

const STORAGE_KEY = "english-stories-progress";

const today = () => new Date().toISOString().slice(0, 10);

const defaultProgress: LearnerProgress = {
  selectedLanguage: "Russian",
  readingProgress: {},
  chapterCompletions: {},
  lastVisitDate: today(),
};

export function useLearnerProgress() {
  const [progress, setProgress] = useState<LearnerProgress>(() => {
    const saved = readProgressFromStorage();
    return {
      ...defaultProgress,
      ...saved,
      selectedLanguage: saved?.selectedLanguage ?? defaultProgress.selectedLanguage,
      readingProgress: {
        ...migrateLessonProgress(saved),
        ...(saved?.readingProgress ?? {}),
      },
      chapterCompletions: saved?.chapterCompletions ?? {},
      lastOpenedContent: saved?.lastOpenedContent ?? null,
      lastVisitDate: saved?.lastVisitDate ?? today(),
    };
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

  function selectLanguage(language: NativeLanguage) {
    setProgress((current) => ({ ...current, selectedLanguage: language }));
  }

  return {
    progress,
    saveReadingProgress,
    saveLastOpenedContent,
    saveChapterCompletion,
    selectLanguage,
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

function writeProgressToStorage(progress: LearnerProgress) {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Some iOS Safari/WebView contexts block localStorage. The app should still run.
  }
}
