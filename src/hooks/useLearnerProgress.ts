import { useEffect, useMemo, useState } from "react";
import type { LearnerProgress, NativeLanguage } from "../types";

const STORAGE_KEY = "english-stories-progress";

const today = () => new Date().toISOString().slice(0, 10);

const defaultProgress: LearnerProgress = {
  xp: 0,
  streak: 1,
  completedLessons: [],
  unlockedLessons: [],
  savedWords: [],
  favoriteWords: [],
  selectedLanguage: null,
  testScores: [],
  lessonProgress: {},
  lastVisitDate: today(),
};

export function useLearnerProgress() {
  const [progress, setProgress] = useState<LearnerProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return defaultProgress;
      }

      return { ...defaultProgress, ...JSON.parse(saved) };
    } catch {
      return defaultProgress;
    }
  });

  useEffect(() => {
    setProgress((current) => {
      if (current.lastVisitDate === today()) {
        return current;
      }

      return { ...current, streak: current.streak + 1, lastVisitDate: today() };
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const currentLevel = useMemo(() => {
    if (progress.xp >= 260) return "B1 Explorer";
    if (progress.xp >= 120) return "A2 Builder";
    return "A1 Starter";
  }, [progress.xp]);

  function saveLessonProgress(storyId: string, stepIndex: number) {
    setProgress((current) => ({
      ...current,
      lessonProgress: {
        ...current.lessonProgress,
        [storyId]: Math.max(current.lessonProgress[storyId] ?? 0, stepIndex),
      },
    }));
  }

  function completeLesson(storyId: string, xpReward: number, nextStoryId?: string) {
    setProgress((current) => {
      const alreadyCompleted = current.completedLessons.includes(storyId);
      const unlockedLessons = nextStoryId && !current.unlockedLessons.includes(nextStoryId)
        ? [...current.unlockedLessons, nextStoryId]
        : current.unlockedLessons;

      return {
        ...current,
        xp: alreadyCompleted ? current.xp : current.xp + xpReward,
        completedLessons: alreadyCompleted ? current.completedLessons : [...current.completedLessons, storyId],
        unlockedLessons,
        lessonProgress: {
          ...current.lessonProgress,
          [storyId]: 100,
        },
      };
    });
  }

  function selectLanguage(language: NativeLanguage) {
    setProgress((current) => ({ ...current, selectedLanguage: language }));
  }

  function toggleSavedWord(word: string) {
    setProgress((current) => {
      const isSaved = current.savedWords.includes(word);

      return {
        ...current,
        savedWords: isSaved ? current.savedWords.filter((item) => item !== word) : [...current.savedWords, word],
        favoriteWords: isSaved ? current.favoriteWords.filter((item) => item !== word) : current.favoriteWords,
      };
    });
  }

  function saveWords(words: string[]) {
    setProgress((current) => ({
      ...current,
      savedWords: Array.from(new Set([...current.savedWords, ...words])),
    }));
  }

  function toggleFavoriteWord(word: string) {
    setProgress((current) => {
      const isFavorite = current.favoriteWords.includes(word);
      const savedWords = current.savedWords.includes(word) ? current.savedWords : [...current.savedWords, word];

      return {
        ...current,
        savedWords,
        favoriteWords: isFavorite
          ? current.favoriteWords.filter((item) => item !== word)
          : [...current.favoriteWords, word],
      };
    });
  }

  function saveTestScore(score: number, total: number, type: string) {
    setProgress((current) => ({
      ...current,
      xp: current.xp + score * 3,
      testScores: [{ date: today(), score, total, type }, ...current.testScores].slice(0, 12),
    }));
  }

  return {
    progress,
    currentLevel,
    saveLessonProgress,
    completeLesson,
    selectLanguage,
    toggleSavedWord,
    saveWords,
    toggleFavoriteWord,
    saveTestScore,
  };
}
