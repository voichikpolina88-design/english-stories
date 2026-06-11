import { BookmarkPlus, Check, Volume2, X } from "lucide-react";
import { findVocabularyEntry, ipaForWord, type VocabularyEntry } from "../data/vocabulary";

export type WordCardData = {
  word: string;
  translation: string;
  ipa: string;
  sourceStories?: string[];
};

type WordCardProps = {
  word: WordCardData | VocabularyEntry;
  saved: boolean;
  labels: {
    addWord: string;
    saved: string;
    close?: string;
  };
  onSpeak: (text: string) => void;
  onToggleSave: (word: string) => void;
  onClose?: () => void;
};

export function WordCard({ word, saved, labels, onSpeak, onToggleSave, onClose }: WordCardProps) {
  return (
    <article className="smart-word-card">
      {onClose ? (
        <button className="word-card-close" type="button" aria-label={labels.close ?? "Close"} onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      ) : null}
      <div className="word-card-main">
        <span className="word-card-emoji">📚</span>
        <div>
          <h3>{word.word}</h3>
          <span>{word.ipa}</span>
          <p>{word.translation}</p>
        </div>
      </div>
      <div className="word-card-actions">
        <button className="round-button" type="button" aria-label="Play audio" onClick={() => onSpeak(word.word)}>
          <Volume2 size={18} aria-hidden="true" />
        </button>
        <button className={saved ? "save-word-button saved" : "save-word-button"} type="button" onClick={() => onToggleSave(word.word)}>
          {saved ? <Check size={17} aria-hidden="true" /> : <BookmarkPlus size={17} aria-hidden="true" />}
          {saved ? labels.saved : labels.addWord}
        </button>
      </div>
    </article>
  );
}

export function WordCardModal({
  word,
  saved,
  labels,
  onSpeak,
  onToggleSave,
  onClose,
}: WordCardProps & { onClose: () => void }) {
  return (
    <div className="word-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="word-modal" role="dialog" aria-modal="true" aria-label={word.word} onClick={(event) => event.stopPropagation()}>
        <WordCard word={word} saved={saved} labels={labels} onSpeak={onSpeak} onToggleSave={onToggleSave} onClose={onClose} />
      </div>
    </div>
  );
}

export function wordCardDataForText(text: string): WordCardData {
  const entry = findVocabularyEntry(text);
  if (entry) return entry;

  const cleanWord = text.replace(/[^a-zA-Z' -]+/g, "").trim();
  return {
    word: cleanWord,
    translation: "слово из истории",
    ipa: ipaForWord(cleanWord),
  };
}
