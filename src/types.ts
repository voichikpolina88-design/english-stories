export type Level = "A1" | "A2" | "B1";
export type NativeLanguage = "Russian" | "English";

export type VocabularyItem = {
  word: string;
  translation: string;
  example: string;
  pictureLabel?: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

export type Challenge =
  | {
      id: string;
      type: "match";
      prompt: string;
      word: string;
      options: string[];
      answer: string;
    }
  | {
      id: string;
      type: "translation";
      prompt: string;
      word: string;
      options: string[];
      answer: string;
    }
  | {
      id: string;
      type: "fill";
      prompt: string;
      sentence: string;
      options: string[];
      answer: string;
    }
  | {
      id: string;
      type: "picture";
      prompt: string;
      word: string;
      options: string[];
      answer: string;
    }
  | {
      id: string;
      type: "trueFalse";
      prompt: string;
      statement: string;
      answer: "True" | "False";
    };

export type Story = {
  id: string;
  title: string;
  level: Level;
  readingTime: string;
  description: string;
  xpReward: number;
  color: string;
  accent: string;
  text: string[];
  highlights: string[];
  vocabulary: VocabularyItem[];
  sections: string[];
  challenges: Challenge[];
  quiz: QuizQuestion[];
};

export type LearnerProgress = {
  xp: number;
  streak: number;
  completedLessons: string[];
  unlockedLessons: string[];
  savedWords: string[];
  favoriteWords: string[];
  selectedLanguage: NativeLanguage | null;
  testScores: Array<{ date: string; score: number; total: number; type: string }>;
  lessonProgress: Record<string, number>;
  lastVisitDate: string;
};
