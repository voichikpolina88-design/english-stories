import { useSyncExternalStore } from "react";
import type { SavedVocabularyWord, VocabularyContext } from "../types";

export const SAVED_VOCABULARY_STORAGE_KEY = "storylingo-reader-saved-words";
const SAVED_VOCABULARY_EVENT = "storylingo-saved-vocabulary-change";
const SCHEMA_VERSION = 2;
let vocabularyCache: SavedVocabularyStorage | null = null;

type SavedVocabularyStorage = {
  version: number;
  words: SavedVocabularyWord[];
};

type SaveVocabularyInput = {
  lexicalEntryId: string;
  word: string;
  lemma: string;
  translation: string;
  transcription?: string;
  partOfSpeech?: string;
  context: VocabularyContext;
};

export function useSavedVocabulary() {
  const savedWords = useSyncExternalStore(subscribeSavedVocabulary, readSavedVocabularySnapshot, readSavedVocabularySnapshot);

  return {
    savedWords,
    addWord: addSavedVocabularyWord,
    removeWord: removeSavedVocabularyWord,
    toggleWord: toggleSavedVocabularyWord,
    isWordSaved,
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

  const words = existing
    ? storage.words.map((item) =>
        item.lexicalEntryId === input.lexicalEntryId
          ? {
              ...item,
              contexts: mergeContexts(item.contexts, nextContext),
            }
          : item,
      )
    : [
        ...storage.words,
        {
          id: input.lexicalEntryId,
          lexicalEntryId: input.lexicalEntryId,
          word: input.word,
          lemma: input.lemma,
          translation: input.translation,
          transcription: input.transcription,
          partOfSpeech: input.partOfSpeech,
          contexts: [nextContext],
          createdAt: new Date().toISOString(),
        },
      ];

  writeSavedVocabularyStorage({ version: SCHEMA_VERSION, words });
}

export function removeSavedVocabularyWord(lexicalEntryId: string) {
  const storage = readSavedVocabularyStorage();
  writeSavedVocabularyStorage({
    version: SCHEMA_VERSION,
    words: storage.words.filter((item) => item.lexicalEntryId !== lexicalEntryId),
  });
}

export function toggleSavedVocabularyWord(input: SaveVocabularyInput) {
  if (isWordSaved(input.lexicalEntryId)) {
    removeSavedVocabularyWord(input.lexicalEntryId);
    return false;
  }

  addSavedVocabularyWord(input);
  return true;
}

export function isWordSaved(lexicalEntryId: string) {
  return readSavedVocabularySnapshot().some((item) => item.lexicalEntryId === lexicalEntryId);
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
      const storage = { version: SCHEMA_VERSION, words };
      window.localStorage.setItem(SAVED_VOCABULARY_STORAGE_KEY, JSON.stringify(storage));
      vocabularyCache = storage;
      return storage;
    }

    if (parsed && Array.isArray(parsed.words)) {
      vocabularyCache = {
        version: Number(parsed.version) || SCHEMA_VERSION,
        words: parsed.words
          .map((item: unknown) => migrateLegacyWord(item))
          .filter((item: SavedVocabularyWord | null): item is SavedVocabularyWord => Boolean(item)),
      };
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
    return {
      id: lexicalEntryId,
      lexicalEntryId,
      word: item.word,
      lemma: item.lemma || item.word,
      translation: item.translation,
      transcription: item.transcription,
      partOfSpeech: item.partOfSpeech,
      contexts: item.contexts.map(normalizeContext),
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }

  return {
    id: lexicalEntryId,
    lexicalEntryId,
    word: item.word,
    lemma: item.lemma || item.word,
    translation: item.translation,
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
  };
}

function normalizeContext(context: VocabularyContext): VocabularyContext {
  return {
    sentenceId: context.sentenceId,
    sentenceText: context.sentenceText,
    sentenceTranslation: context.sentenceTranslation,
    bookId: context.bookId,
    bookTitle: context.bookTitle,
    chapterId: context.chapterId,
    chapterTitle: context.chapterTitle,
    contextualPhrase: context.contextualPhrase,
    contextualPhraseTranslation: context.contextualPhraseTranslation,
  };
}

function mergeContexts(contexts: VocabularyContext[], nextContext: VocabularyContext) {
  if (contexts.some((context) => context.sentenceId === nextContext.sentenceId && context.bookId === nextContext.bookId)) {
    return contexts;
  }

  return [...contexts, nextContext];
}
