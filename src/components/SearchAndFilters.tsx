import { Search } from "lucide-react";
import type { Level } from "../types";

type SearchAndFiltersProps = {
  query: string;
  selectedLevel: Level | "All";
  onQueryChange: (query: string) => void;
  onLevelChange: (level: Level | "All") => void;
};

const levels: Array<Level | "All"> = ["All", "A1", "A2", "B1"];

export function SearchAndFilters({
  query,
  selectedLevel,
  onQueryChange,
  onLevelChange,
}: SearchAndFiltersProps) {
  return (
    <div className="search-panel">
      <label className="search-box">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Search stories</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search stories, words, or levels"
        />
      </label>

      <div className="level-filter" aria-label="Filter stories by English level">
        {levels.map((level) => (
          <button
            key={level}
            className={selectedLevel === level ? "active" : ""}
            type="button"
            onClick={() => onLevelChange(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
