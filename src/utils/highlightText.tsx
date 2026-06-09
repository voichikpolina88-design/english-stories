import type { ReactNode } from "react";

export function highlightText(text: string, words: string[]): ReactNode[] {
  if (words.length === 0) {
    return [text];
  }

  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");

  return text.split(pattern).map((part, index) => {
    const isHighlighted = words.some((word) => word.toLowerCase() === part.toLowerCase());

    return isHighlighted ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
