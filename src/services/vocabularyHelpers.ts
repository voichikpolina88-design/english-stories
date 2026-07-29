import type { SavedVocabularyWord, VocabularyContext } from "../types";

export const INVALID_TRANSLATIONS = new Set([
  "",
  "перевод по контексту",
  "translation",
  "undefined",
  "null",
  "нет перевода",
  "перевод отсутствует",
]);

export function hasValidTranslation(value?: string, sourceWord?: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized || INVALID_TRANSLATIONS.has(normalized)) return false;
  if (sourceWord && normalized === sourceWord.trim().toLowerCase()) return false;
  return true;
}

export function hasValidTranscription(transcription: string | undefined, word: string) {
  if (!transcription) return false;
  const normalized = transcription.trim().toLowerCase();
  if (!normalized || normalized === "/undefined/") return false;
  const bare = normalized.replace(/^\/|\/$/g, "");
  if (!bare || bare === word.trim().toLowerCase()) return false;
  return /[ˈˌɑɒæʌəɜɪʊɔɛθðʃʒŋː]/i.test(normalized);
}

export function cleanVocabularyContextText(text?: string) {
  return (text ?? "")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

export function getVocabularyDisplayTranslation(word: SavedVocabularyWord) {
  const primary = hasValidTranslation(word.translation, word.word)
    ? cleanVocabularyContextText(word.translation)
    : "";
  const contextual = getContextualTranslationForSavedWord(word);
  const common = (word.commonTranslations ?? [])
    .map((item) => cleanVocabularyContextText(item))
    .filter((item) => hasValidTranslation(item, word.word) && item !== primary && item !== contextual);

  return {
    primary: primary || contextual || "",
    contextual: contextual && contextual !== primary ? contextual : "",
    common,
  };
}

export function getContextualTranslationForSavedWord(word: SavedVocabularyWord) {
  const direct = word.contextualTranslation;
  if (hasValidTranslation(direct, word.word)) return cleanVocabularyContextText(direct);

  const phrase = word.contexts.find((context) => hasValidTranslation(context.contextualPhraseTranslation, word.word))?.contextualPhraseTranslation;
  if (hasValidTranslation(phrase, word.word)) return cleanVocabularyContextText(phrase);

  return "";
}

export function getVocabularyAcceptedTranslations(word: SavedVocabularyWord) {
  const display = getVocabularyDisplayTranslation(word);
  const values = [
    display.primary,
    display.contextual,
    ...display.primary.split(/[,;/]+/),
    ...display.contextual.split(/[,;/]+/),
    ...(word.commonTranslations ?? []),
  ];

  return Array.from(new Set(values.map(cleanVocabularyContextText).filter((value) => hasValidTranslation(value, word.word))));
}

export function normalizeVocabularyAnswer(value: string) {
  return cleanVocabularyContextText(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.!?]+$/g, "")
    .trim();
}

export function getVocabularySourceLabel(context: VocabularyContext) {
  const bookTitle = context.bookId === "alice-in-wonderland" || context.bookTitle.includes("Alice")
    ? "Alice"
    : context.bookTitle;
  const chapterNumber = context.chapterId.match(/\d+/)?.[0];
  const chapterLabel = chapterNumber ? `Глава ${chapterNumber}` : context.chapterTitle;
  return `${bookTitle} · ${chapterLabel}`;
}
