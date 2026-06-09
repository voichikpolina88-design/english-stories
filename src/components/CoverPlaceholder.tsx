import { BookOpen } from "lucide-react";

type CoverPlaceholderProps = {
  title: string;
  color: string;
  accent: string;
  large?: boolean;
};

export function CoverPlaceholder({ title, color, accent, large = false }: CoverPlaceholderProps) {
  return (
    <div
      className={large ? "cover-placeholder cover-placeholder-large" : "cover-placeholder"}
      style={{ background: color, color: accent }}
      aria-label={`${title} cover image placeholder`}
    >
      <div className="cover-symbol" style={{ backgroundColor: accent }}>
        <BookOpen size={large ? 40 : 28} aria-hidden="true" />
      </div>
      <span>{title}</span>
    </div>
  );
}
