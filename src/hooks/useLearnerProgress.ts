import { useEffect, useState } from "react";
import type { LearnerProgress, NativeLanguage } from "../types";

const STORAGE_KEY = "english-stories-progress";

const today = () => new Date().toISOString().slice(0, 10);

const defaultProgress: LearnerProgress = {
  selectedLanguage: "Russian",
  readingProgress: {},
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
    }));
  }

  function selectLanguage(language: NativeLanguage) {
    setProgress((current) => ({ ...current, selectedLanguage: language }));
  }

  return {
    progress,
    saveReadingProgress,
    selectLanguage,
  };
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
