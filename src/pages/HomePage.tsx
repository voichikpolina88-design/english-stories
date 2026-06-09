import { Sparkles } from "lucide-react";
import type { Level, Story } from "../types";
import { SearchAndFilters } from "../components/SearchAndFilters";
import { StoryCard } from "../components/StoryCard";

type HomePageProps = {
  stories: Story[];
  query: string;
  selectedLevel: Level | "All";
  onQueryChange: (query: string) => void;
  onLevelChange: (level: Level | "All") => void;
  onRead: (storyId: string) => void;
};

export function HomePage({
  stories,
  query,
  selectedLevel,
  onQueryChange,
  onLevelChange,
  onRead,
}: HomePageProps) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-content">
          <span className="eyebrow">
            <Sparkles size={17} aria-hidden="true" />
            Short stories for steady English practice
          </span>
          <h1>Learn English Through Stories</h1>
          <p>
            Read friendly stories, notice useful words, and check your understanding with quick quizzes.
          </p>
        </div>
        <SearchAndFilters
          query={query}
          selectedLevel={selectedLevel}
          onQueryChange={onQueryChange}
          onLevelChange={onLevelChange}
        />
      </section>

      <section className="stories-section" aria-labelledby="stories-title">
        <div className="section-heading">
          <span>{stories.length} stories</span>
          <h2 id="stories-title">Stories</h2>
        </div>

        {stories.length > 0 ? (
          <div className="story-grid">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} onRead={onRead} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No stories found. Try another search or level.</div>
        )}
      </section>
    </main>
  );
}
