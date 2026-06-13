import type { NativeLanguage, VocabularyItem } from "../types";
import { stories } from "./stories";

const translations: Record<string, Record<NativeLanguage, string>> = {
  "wake up": { Russian: "просыпаться", English: "wake up" },
  breakfast: { Russian: "завтрак", English: "breakfast" },
  ready: { Russian: "готовый", English: "ready" },
  quiet: { Russian: "тихий", English: "quiet" },
  beach: { Russian: "пляж", English: "beach" },
  warm: { Russian: "теплый", English: "warm" },
  sandwich: { Russian: "сэндвич", English: "sandwich" },
  tired: { Russian: "уставший", English: "tired" },
  nervous: { Russian: "нервный", English: "nervous" },
  platform: { Russian: "платформа", English: "platform" },
  direction: { Russian: "направление", English: "direction" },
  alone: { Russian: "один", English: "alone" },
  suddenly: { Russian: "внезапно", English: "suddenly" },
  pocket: { Russian: "карман", English: "pocket" },
  search: { Russian: "искать", English: "search" },
  careful: { Russian: "осторожный", English: "careful" },
  colleague: { Russian: "коллега", English: "colleague" },
  schedule: { Russian: "расписание", English: "schedule" },
  responsibility: { Russian: "ответственность", English: "responsibility" },
  confident: { Russian: "уверенный", English: "confident" },
  meaningful: { Russian: "значимый", English: "meaningful" },
  memory: { Russian: "воспоминание", English: "memory" },
  prepare: { Russian: "готовить", English: "prepare" },
  tender: { Russian: "нежный", English: "tender" },
  dictionary: { Russian: "словарь", English: "dictionary" },
  ticket: { Russian: "билет", English: "ticket" },
  phone: { Russian: "телефон", English: "phone" },
  attention: { Russian: "внимание", English: "attention" },
};

const wordEmoji: Record<string, string> = {
  "wake up": "🌤️",
  breakfast: "☕",
  ready: "🎒",
  quiet: "🪟",
  beach: "🏖️",
  warm: "☀️",
  sandwich: "🥪",
  tired: "😴",
  nervous: "😳",
  platform: "🚉",
  direction: "➡️",
  alone: "🧍",
  suddenly: "✨",
  pocket: "🧥",
  search: "🔎",
  careful: "💗",
  colleague: "👥",
  schedule: "📅",
  responsibility: "🏷️",
  confident: "⭐",
  meaningful: "💝",
  memory: "📷",
  prepare: "📝",
  tender: "💌",
};

export type VocabularyWord = VocabularyItem & {
  storyId: string;
  storyTitle: string;
  level: string;
  emoji: string;
};

export function getTranslation(word: string, language: NativeLanguage) {
  if (language === "English") return translations[word]?.English ?? word;
  const storyWord = stories.reduce<VocabularyItem | undefined>(
    (found, story) => found ?? story.vocabulary.find((item) => item.word === word),
    undefined,
  );
  return translations[word]?.Russian ?? storyWord?.translation ?? word;
}

export function getAllVocabulary(): VocabularyWord[] {
  const words = stories.reduce<VocabularyWord[]>((items, story) => {
    story.vocabulary.forEach((item) => {
      items.push({
        ...item,
        storyId: story.id,
        storyTitle: story.title,
        level: story.level,
        emoji: wordEmoji[item.word] ?? item.pictureLabel ?? "💬",
      });
    });

    return items;
  }, []);

  return Array.from(new Map(words.map((item) => [item.word, item])).values());
}

export function getLearnedVocabulary(completedLessonIds: string[]) {
  return getAllVocabulary().filter((word) => completedLessonIds.includes(word.storyId));
}

export function emojiForWord(word: string) {
  return wordEmoji[word] ?? "💬";
}
