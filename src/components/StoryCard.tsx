import { Clock, MoveRight } from "lucide-react";
import type { Story } from "../types";
import { CoverPlaceholder } from "./CoverPlaceholder";
import { LevelBadge } from "./LevelBadge";

type StoryCardProps = {
  story: Story;
  onRead: (storyId: string) => void;
};

export function StoryCard({ story, onRead }: StoryCardProps) {
  return (
    <article className="story-card">
      <CoverPlaceholder title={story.title} color={story.color} accent={story.accent} />
      <div className="story-card-body">
        <div className="story-meta-row">
          <LevelBadge level={story.level} />
          <span className="reading-time">
            <Clock size={15} aria-hidden="true" />
            {story.readingTime}
          </span>
        </div>
        <h3>{story.title}</h3>
        <p>{story.description}</p>
        <button className="read-button" type="button" onClick={() => onRead(story.id)}>
          Read
          <MoveRight size={17} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
