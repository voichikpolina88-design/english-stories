import type { Level } from "../types";

type LevelBadgeProps = {
  level: Level;
};

export function LevelBadge({ level }: LevelBadgeProps) {
  return <span className={`level-badge level-${level.toLowerCase()}`}>{level}</span>;
}
