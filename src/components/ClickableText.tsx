import { wordCardDataForText, type WordCardData } from "./WordCard";

type ClickableTextProps = {
  text: string;
  onWordClick: (word: WordCardData) => void;
};

const wordPattern = /[A-Za-z][A-Za-z'-]*/g;

export function ClickableText({ text, onWordClick }: ClickableTextProps) {
  const parts = tokenizeText(text);

  return (
    <>
      {parts.map((part, index) =>
        part.clickable ? (
          <button
            className="inline-word-button"
            key={`${part.text}-${index}`}
            type="button"
            onClick={() => {
              const word = wordCardDataForText(part.lookupText ?? part.text);
              if (word) onWordClick(word);
            }}
          >
            {part.text}
          </button>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

function tokenizeText(text: string) {
  const matches = Array.from(text.matchAll(wordPattern));
  const parts: Array<{ text: string; clickable: boolean; lookupText?: string }> = [];
  let cursor = 0;

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const word = match[0];
    const start = match.index ?? cursor;

    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), clickable: false });
    }

    const nextMatch = matches[index + 1];
    const phrase = nextMatch ? `${word} ${nextMatch[0]}` : "";
    if (phrase && wordCardDataForText(phrase)) {
      const phraseEnd = (nextMatch.index ?? start) + nextMatch[0].length;
      parts.push({ text: text.slice(start, phraseEnd), clickable: true, lookupText: phrase });
      cursor = phraseEnd;
      index += 1;
      continue;
    }

    parts.push({ text: word, clickable: Boolean(wordCardDataForText(word)), lookupText: word });
    cursor = start + word.length;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), clickable: false });
  }

  return parts;
}
