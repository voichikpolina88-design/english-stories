import { useSyncExternalStore } from "react";
import { aliceInWonderlandBook } from "../data/aliceInWonderland";
import type { SavedVocabularyWord, VocabularyContext, VocabularyProgress } from "../types";
import {
  cleanVocabularyContextText,
  getVocabularyDisplayTranslation,
  hasValidTranscription,
  hasValidTranslation,
} from "./vocabularyHelpers";

export const SAVED_VOCABULARY_STORAGE_KEY = "storylingo-reader-saved-words";
const SAVED_VOCABULARY_EVENT = "storylingo-saved-vocabulary-change";
const SCHEMA_VERSION = 3;
let vocabularyCache: SavedVocabularyStorage | null = null;
const trainingSessionCorrectWords = new Map<string, Set<string>>();

type SavedVocabularyStorage = {
  version: number;
  words: SavedVocabularyWord[];
};

type SaveVocabularyInput = {
  lexicalEntryId: string;
  word: string;
  lemma: string;
  translation: string;
  contextualTranslation?: string;
  commonTranslations?: string[];
  transcription?: string;
  partOfSpeech?: string;
  context: VocabularyContext;
};

export function useSavedVocabulary() {
  const savedWords = useSyncExternalStore(subscribeSavedVocabulary, readSavedVocabularySnapshot, readSavedVocabularySnapshot);

  return {
    savedWords,
    addWord: addSavedVocabularyWord,
    restoreWord: restoreSavedVocabularyWord,
    removeWord: removeSavedVocabularyWord,
    toggleWord: toggleSavedVocabularyWord,
    isWordSaved,
    startTrainingSession,
    recordAnswer: recordTrainingAnswer,
    finishTrainingSession,
    getWordsWithErrors,
    clearResolvedErrors,
  };
}

export function readSavedVocabularySnapshot(): SavedVocabularyWord[] {
  if (!vocabularyCache) vocabularyCache = readSavedVocabularyStorage();
  return vocabularyCache.words;
}

export function addSavedVocabularyWord(input: SaveVocabularyInput) {
  const storage = readSavedVocabularyStorage();
  const existing = storage.words.find((item) => item.lexicalEntryId === input.lexicalEntryId);
  const nextContext = normalizeContext(input.context);
  const repairedInputWord = repairSavedVocabularyWord({
    id: input.lexicalEntryId,
    lexicalEntryId: input.lexicalEntryId,
    word: input.word,
    lemma: input.lemma,
    translation: input.translation,
    contextualTranslation: input.contextualTranslation,
    commonTranslations: input.commonTranslations,
    transcription: input.transcription,
    partOfSpeech: input.partOfSpeech,
    contexts: [nextContext],
    createdAt: new Date().toISOString(),
    progress: createDefaultVocabularyProgress(),
  });
  if (!existing && repairedInputWord.isInvalid) return false;

  const words = existing
    ? storage.words.map((item) =>
        item.lexicalEntryId === input.lexicalEntryId
          ? repairSavedVocabularyWord({
              ...item,
              word: input.word,
              lemma: input.lemma,
              translation: hasValidTranslation(input.translation, input.word) ? input.translation : item.translation,
              contextualTranslation: hasValidTranslation(input.contextualTranslation, input.word) ? input.contextualTranslation : item.contextualTranslation,
              commonTranslations: input.commonTranslations ?? item.commonTranslations,
              transcription: hasValidTranscription(input.transcription, input.word) ? input.transcription : item.transcription,
              partOfSpeech: input.partOfSpeech || item.partOfSpeech,
              contexts: mergeContexts(item.contexts, nextContext),
              isInvalid: false,
            })
          : item,
      )
    : [
        ...storage.words,
        repairedInputWord,
      ];

  writeSavedVocabularyStorage({ version: SCHEMA_VERSION, words });
  return true;
}

export function removeSavedVocabularyWord(lexicalEntryId: string) {
  const storage = readSavedVocabularyStorage();
  writeSavedVocabularyStorage({
    version: SCHEMA_VERSION,
    words: storage.words.filter((item) => item.lexicalEntryId !== lexicalEntryId),
  });
}

export function restoreSavedVocabularyWord(word: SavedVocabularyWord) {
  const storage = readSavedVocabularyStorage();
  if (storage.words.some((item) => item.lexicalEntryId === word.lexicalEntryId)) return;
  writeSavedVocabularyStorage({
    version: SCHEMA_VERSION,
    words: [...storage.words, repairSavedVocabularyWord(word)],
  });
}

export function toggleSavedVocabularyWord(input: SaveVocabularyInput) {
  if (isWordSaved(input.lexicalEntryId)) {
    removeSavedVocabularyWord(input.lexicalEntryId);
    return false;
  }

  return addSavedVocabularyWord(input);
}

export function isWordSaved(lexicalEntryId: string) {
  return readSavedVocabularySnapshot().some((item) => item.lexicalEntryId === lexicalEntryId);
}

export function startTrainingSession() {
  const sessionId = `vocab-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  trainingSessionCorrectWords.set(sessionId, new Set());
  return sessionId;
}

export function recordTrainingAnswer(lexicalEntryId: string, isCorrect: boolean, sessionId: string) {
  const storage = readSavedVocabularyStorage();
  const reviewedAt = new Date().toISOString();
  const words = storage.words.map((word) => {
    if (word.lexicalEntryId !== lexicalEntryId) return word;

    const progress = normalizeProgress(word.progress);
    const sessionCorrectWords = trainingSessionCorrectWords.get(sessionId) ?? new Set<string>();
    const alreadyCorrectInSession = sessionCorrectWords.has(lexicalEntryId);
    if (isCorrect) sessionCorrectWords.add(lexicalEntryId);
    trainingSessionCorrectWords.set(sessionId, sessionCorrectWords);
    const sessionsCorrect = isCorrect && !alreadyCorrectInSession
      ? progress.sessionsCorrect + 1
      : progress.sessionsCorrect;
    const unresolvedIncorrectCount = isCorrect
      ? Math.max(0, (progress.unresolvedIncorrectCount ?? 0) - 1)
      : (progress.unresolvedIncorrectCount ?? 0) + 1;
    const nextProgress: VocabularyProgress = {
      correctCount: progress.correctCount + (isCorrect ? 1 : 0),
      incorrectCount: progress.incorrectCount + (isCorrect ? 0 : 1),
      sessionsCorrect,
      lastReviewedAt: reviewedAt,
      status: sessionsCorrect >= 3 ? "learned" : "learning",
      unresolvedIncorrectCount,
    };

    return {
      ...word,
      progress: nextProgress,
    };
  });

  writeSavedVocabularyStorage({ version: SCHEMA_VERSION, words });
}

export function finishTrainingSession(sessionId: string) {
  trainingSessionCorrectWords.delete(sessionId);
}

export function getWordsWithErrors() {
  return readSavedVocabularySnapshot().filter((word) => (normalizeProgress(word.progress).unresolvedIncorrectCount ?? 0) > 0);
}

export function clearResolvedErrors() {
  const storage = readSavedVocabularyStorage();
  const words = storage.words.map((word) => ({
    ...word,
    progress: {
      ...normalizeProgress(word.progress),
      unresolvedIncorrectCount: 0,
    },
  }));
  writeSavedVocabularyStorage({ version: SCHEMA_VERSION, words });
}

function subscribeSavedVocabulary(callback: () => void) {
  const handleStorage = () => {
    vocabularyCache = null;
    callback();
  };

  window.addEventListener(SAVED_VOCABULARY_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SAVED_VOCABULARY_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function readSavedVocabularyStorage(): SavedVocabularyStorage {
  if (vocabularyCache) return vocabularyCache;

  try {
    const raw = window.localStorage.getItem(SAVED_VOCABULARY_STORAGE_KEY);
    if (!raw) return { version: SCHEMA_VERSION, words: [] };

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const words = parsed
        .map((item: unknown) => migrateLegacyWord(item))
        .filter((item: SavedVocabularyWord | null): item is SavedVocabularyWord => Boolean(item));
      const storage = { version: SCHEMA_VERSION, words: dedupeSavedVocabularyWords(words) };
      window.localStorage.setItem(SAVED_VOCABULARY_STORAGE_KEY, JSON.stringify(storage));
      vocabularyCache = storage;
      return storage;
    }

    if (parsed && Array.isArray(parsed.words)) {
      const storage = {
        version: Number(parsed.version) || SCHEMA_VERSION,
        words: dedupeSavedVocabularyWords(parsed.words
          .map((item: unknown) => migrateLegacyWord(item))
          .filter((item: SavedVocabularyWord | null): item is SavedVocabularyWord => Boolean(item))),
      };
      storage.version = SCHEMA_VERSION;
      window.localStorage.setItem(SAVED_VOCABULARY_STORAGE_KEY, JSON.stringify(storage));
      vocabularyCache = storage;
      return vocabularyCache;
    }
  } catch (error) {
    if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      console.warn("[StoryLingo vocabulary] Failed to read saved vocabulary", error);
    }
  }

  return { version: SCHEMA_VERSION, words: [] };
}

function writeSavedVocabularyStorage(storage: SavedVocabularyStorage) {
  vocabularyCache = storage;
  window.localStorage.setItem(SAVED_VOCABULARY_STORAGE_KEY, JSON.stringify(storage));
  window.dispatchEvent(new CustomEvent(SAVED_VOCABULARY_EVENT));
}

function migrateLegacyWord(value: unknown): SavedVocabularyWord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SavedVocabularyWord> & {
    chapterTitle?: string;
    chapterId?: string;
    bookId?: string;
    bookTitle?: string;
    sentenceId?: string;
    sentenceText?: string;
    sentenceTranslation?: string;
    phrase?: string;
    phraseTranslation?: string;
  };

  const lexicalEntryId = item.lexicalEntryId || item.id;
  if (!lexicalEntryId || !item.word || !item.translation) return null;

  if (Array.isArray(item.contexts)) {
    return repairSavedVocabularyWord({
      id: lexicalEntryId,
      lexicalEntryId,
      word: item.word,
      lemma: item.lemma || item.word,
      translation: item.translation,
      contextualTranslation: item.contextualTranslation,
      commonTranslations: item.commonTranslations,
      transcription: item.transcription,
      partOfSpeech: item.partOfSpeech,
      contexts: item.contexts.map(normalizeContext),
      createdAt: item.createdAt || new Date().toISOString(),
      progress: normalizeProgress(item.progress),
      isInvalid: item.isInvalid,
    });
  }

  return repairSavedVocabularyWord({
    id: lexicalEntryId,
    lexicalEntryId,
    word: item.word,
    lemma: item.lemma || item.word,
    translation: item.translation,
    contextualTranslation: item.contextualTranslation,
    commonTranslations: item.commonTranslations,
    transcription: item.transcription,
    partOfSpeech: item.partOfSpeech,
    contexts: [
      normalizeContext({
        sentenceId: item.sentenceId || "unknown-sentence",
        sentenceText: item.sentenceText || "",
        sentenceTranslation: item.sentenceTranslation,
        bookId: item.bookId || "alice-in-wonderland",
        bookTitle: item.bookTitle || "Alice’s Adventures in Wonderland",
        chapterId: item.chapterId || "chapter-1",
        chapterTitle: item.chapterTitle || "Down the Rabbit-Hole",
        contextualPhrase: item.phrase,
        contextualPhraseTranslation: item.phraseTranslation,
      }),
    ],
    createdAt: item.createdAt || new Date().toISOString(),
    progress: normalizeProgress(item.progress),
    isInvalid: item.isInvalid,
  });
}

function createDefaultVocabularyProgress(): VocabularyProgress {
  return {
    correctCount: 0,
    incorrectCount: 0,
    sessionsCorrect: 0,
    status: "new",
    unresolvedIncorrectCount: 0,
  };
}

function normalizeProgress(progress: Partial<VocabularyProgress> | undefined): VocabularyProgress {
  const correctCount = Math.max(0, Number(progress?.correctCount) || 0);
  const incorrectCount = Math.max(0, Number(progress?.incorrectCount) || 0);
  const sessionsCorrect = Math.max(0, Number(progress?.sessionsCorrect) || 0);
  return {
    correctCount,
    incorrectCount,
    sessionsCorrect,
    lastReviewedAt: progress?.lastReviewedAt,
    status: progress?.status === "learned" || progress?.status === "learning" || progress?.status === "new"
      ? progress.status
      : sessionsCorrect >= 3
        ? "learned"
        : correctCount || incorrectCount
          ? "learning"
          : "new",
    unresolvedIncorrectCount: Math.max(0, Number(progress?.unresolvedIncorrectCount) || 0),
  };
}

function repairSavedVocabularyWord(word: SavedVocabularyWord): SavedVocabularyWord {
  const occurrence = findVocabularyOccurrence(word);
  const contexts = word.contexts.map((context) => repairVocabularyContext(context));
  const repaired: SavedVocabularyWord = {
    ...word,
    word: word.word || occurrence?.normalized || word.lemma,
    lemma: occurrence?.lemma || word.lemma || word.word,
    translation: hasValidTranslation(occurrence?.translation, occurrence?.normalized || word.word)
      ? occurrence?.translation ?? word.translation
      : hasValidTranslation(word.translation, word.word)
        ? word.translation
        : "",
    contextualTranslation: hasValidTranslation(occurrence?.contextualTranslation, occurrence?.normalized || word.word)
      ? occurrence?.contextualTranslation
      : hasValidTranslation(word.contextualTranslation, word.word)
        ? word.contextualTranslation
        : undefined,
    commonTranslations: occurrence?.commonTranslations ?? word.commonTranslations,
    transcription: hasValidTranscription(occurrence?.transcription, occurrence?.normalized || word.word)
      ? occurrence?.transcription
      : hasValidTranscription(word.transcription, word.word)
        ? word.transcription
        : undefined,
    partOfSpeech: occurrence?.partOfSpeech || word.partOfSpeech,
    contexts,
    progress: normalizeProgress(word.progress),
  };

  const displayTranslation = getVocabularyDisplayTranslation(repaired);
  return {
    ...repaired,
    isInvalid: !hasValidTranslation(displayTranslation.primary, repaired.word),
  };
}

function dedupeSavedVocabularyWords(words: SavedVocabularyWord[]) {
  const byId = new Map<string, SavedVocabularyWord>();
  words.forEach((word) => {
    const existing = byId.get(word.lexicalEntryId);
    if (!existing) {
      byId.set(word.lexicalEntryId, word);
      return;
    }

    byId.set(word.lexicalEntryId, {
      ...existing,
      contexts: [...existing.contexts, ...word.contexts.filter((context) => (
        !existing.contexts.some((existingContext) => existingContext.sentenceId === context.sentenceId && existingContext.bookId === context.bookId)
      ))],
      progress: {
        ...existing.progress,
        correctCount: Math.max(existing.progress.correctCount, word.progress.correctCount),
        incorrectCount: Math.max(existing.progress.incorrectCount, word.progress.incorrectCount),
        sessionsCorrect: Math.max(existing.progress.sessionsCorrect, word.progress.sessionsCorrect),
        unresolvedIncorrectCount: Math.max(existing.progress.unresolvedIncorrectCount ?? 0, word.progress.unresolvedIncorrectCount ?? 0),
        status: existing.progress.status === "learned" || word.progress.status === "learned"
          ? "learned"
          : existing.progress.status === "learning" || word.progress.status === "learning"
            ? "learning"
            : "new",
      },
    });
  });

  return Array.from(byId.values());
}

function repairVocabularyContext(context: VocabularyContext): VocabularyContext {
  const source = findSentenceById(context.sentenceId);
  return normalizeContext({
    ...context,
    sentenceText: cleanVocabularyContextText(source?.text || context.sentenceText),
    sentenceTranslation: cleanVocabularyContextText(source?.translation || context.sentenceTranslation),
    chapterId: context.chapterId,
    chapterTitle: getChapterTitle(context.chapterId) || context.chapterTitle,
    contextualPhrase: cleanVocabularyContextText(context.contextualPhrase),
    contextualPhraseTranslation: cleanVocabularyContextText(context.contextualPhraseTranslation),
  });
}

function findVocabularyOccurrence(word: SavedVocabularyWord) {
  const normalizedWord = normalizeVocabularyToken(word.word);
  const normalizedLemma = normalizeVocabularyToken(word.lemma);
  const contextSentenceIds = new Set(word.contexts.map((context) => context.sentenceId));
  const contextMatches = getAliceWordOccurrences().filter((occurrence) => contextSentenceIds.has(occurrence.sentenceId || ""));
  const candidates = contextMatches.length ? contextMatches : getAliceWordOccurrences();

  return candidates.find((occurrence) => (
    (word.lexicalEntryId && occurrence.lexicalEntryId === word.lexicalEntryId) ||
    occurrence.normalized === normalizedWord ||
    occurrence.lemma?.toLowerCase() === normalizedLemma
  ));
}

function getAliceWordOccurrences() {
  return aliceInWonderlandBook.chapters.flatMap((chapter) =>
    chapter.paragraphs.flatMap((paragraph) =>
      paragraph.sentences.flatMap((sentence) => sentence.words ?? []),
    ),
  );
}

function findSentenceById(sentenceId: string) {
  for (const chapter of aliceInWonderlandBook.chapters) {
    for (const paragraph of chapter.paragraphs) {
      const sentence = paragraph.sentences.find((item) => item.id === sentenceId);
      if (sentence) return sentence;
    }
  }

  return null;
}

function getChapterTitle(chapterId: string) {
  return aliceInWonderlandBook.chapters.find((chapter) => chapter.id === chapterId)?.title;
}

function normalizeVocabularyToken(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z’'-]+/g, "");
}

function normalizeContext(context: VocabularyContext): VocabularyContext {
  return {
    sentenceId: context.sentenceId,
    sentenceText: cleanVocabularyContextText(context.sentenceText),
    sentenceTranslation: cleanVocabularyContextText(context.sentenceTranslation),
    bookId: context.bookId,
    bookTitle: context.bookTitle,
    chapterId: context.chapterId,
    chapterTitle: context.chapterTitle,
    contextualPhrase: cleanVocabularyContextText(context.contextualPhrase),
    contextualPhraseTranslation: cleanVocabularyContextText(context.contextualPhraseTranslation),
  };
}

function mergeContexts(contexts: VocabularyContext[], nextContext: VocabularyContext) {
  if (contexts.some((context) => context.sentenceId === nextContext.sentenceId && context.bookId === nextContext.bookId)) {
    return contexts;
  }

  return [...contexts, nextContext];
}
