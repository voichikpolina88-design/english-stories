export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
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
  illustration?: string;
  text: string[];
  highlights: string[];
  vocabulary: VocabularyItem[];
  sections: string[];
  challenges: Challenge[];
  quiz: QuizQuestion[];
};

export type LearnerProgress = {
  selectedLanguage: NativeLanguage | null;
  readingProgress: Record<string, number>;
  lastOpenedContent?: LastOpenedContent | null;
  lastVisitDate: string;
};

export type LastOpenedContent = {
  contentId: string;
  contentType: "book" | "story";
  chapterId?: string;
  openedAt: string;
  readingProgress: number;
  scrollPosition?: number;
  lastPosition?: number;
};

export type ReadingGoal = {
  dailyGoalMinutes: number;
  updatedAt: string;
};

export type ReadingSession = {
  id: string;
  contentType: "book" | "story";
  contentId: string;
  chapterId?: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  dateKey: string;
  completed: boolean;
};

export type ReadingTimerState = {
  isRunning: boolean;
  startedAt: number | null;
  accumulatedSeconds: number;
  contentId: string | null;
  chapterId?: string | null;
};

export type ReadingStats = {
  todaySeconds: number;
  last7DaysSeconds: number;
  last30DaysSeconds: number;
  sessionCount: number;
  averageSessionSeconds: number;
  completedGoalDays: number;
  currentReadingStreak: number;
  bestReadingStreak: number;
};

export type ReaderWord = {
  id: string;
  text: string;
  normalized?: string;
  lemma?: string;
  translation?: string;
  contextualTranslation?: string;
  commonTranslations?: string[];
  phrase?: string;
  phraseTranslation?: string;
  transcription?: string;
  partOfSpeech?: string;
  audioSrc?: string;
  sentenceId?: string;
  paragraphId?: string;
  chapterId?: string;
  lexicalEntryId?: string;
  isProperNoun?: boolean;
  isPunctuation?: boolean;
};

export type ReaderSentence = {
  id: string;
  text: string;
  words?: ReaderWord[];
  translation?: string;
  audioSrc?: string;
};

export type ReaderParagraph = {
  id: string;
  type?: "narrative" | "paragraph" | "dialogue" | "thought" | "poem";
  lines?: string[];
  sentences: ReaderSentence[];
};

export type ReaderChapter = {
  id: string;
  number: number;
  title: string;
  paragraphs: ReaderParagraph[];
};

export type ReaderBook = {
  id: string;
  title: string;
  author: string;
  originalPublicationYear?: number;
  language?: string;
  contentType?: "book" | "story";
  isComplete?: boolean;
  chapterCount?: number;
  wordCount?: number;
  estimatedReadingMinutes?: number;
  source?: string;
  chapters: ReaderChapter[];
};

export type ReadingTheme = "light" | "cream" | "sepia" | "dark";
export type ReadingFont = "Literata" | "Georgia" | "Merriweather" | "Source Serif 4" | "Inter" | "Atkinson Hyperlegible";
export type ReadingTextAlign = "left" | "justify";

export type ReadingSettings = {
  theme: ReadingTheme;
  textSize: number;
  lineHeight: number;
  fontFamily: ReadingFont;
  textWidth: number;
  textAlign: ReadingTextAlign;
  accentedReading: boolean;
  showSentenceTranslation: boolean;
  showWordTranslation: boolean;
};

export type ReaderPosition = {
  chapterId: string;
  paragraphId?: string;
  sentenceId: string;
  wordId?: string;
  wordIndex: number;
  progressRatio: number;
  updatedAt: string;
};
