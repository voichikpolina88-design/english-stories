import { Image, Sparkles } from "lucide-react";

type LessonCoverProps = {
  title: string;
  color: string;
  accent: string;
  compact?: boolean;
};

export function LessonCover({ title, color, accent, compact = false }: LessonCoverProps) {
  return (
    <div className={compact ? "lesson-cover compact" : "lesson-cover"} style={{ backgroundColor: color }}>
      <span className="cover-bubble" style={{ backgroundColor: accent }}>
        {compact ? <Image size={24} aria-hidden="true" /> : <Sparkles size={34} aria-hidden="true" />}
      </span>
      <span style={{ color: accent }}>{title}</span>
    </div>
  );
}
