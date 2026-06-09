import { ArrowLeft, Clock } from "lucide-react";
import { CoverPlaceholder } from "../components/CoverPlaceholder";
import { LevelBadge } from "../components/LevelBadge";
import { Quiz } from "../components/Quiz";
import type { Story } from "../types";
import { highlightText } from "../utils/highlightText";

type StoryPageProps = {
  story: Story;
  selectedAnswers: Record<number, string>;
  isSubmitted: boolean;
  onBack: () => void;
  onAnswer: (questionIndex: number, answer: string) => void;
  onSubmit: () => void;
  onResetQuiz: () => void;
};

export function StoryPage({
  story,
  selectedAnswers,
  isSubmitted,
  onBack,
  onAnswer,
  onSubmit,
  onResetQuiz,
}: StoryPageProps) {
  return (
    <main className="story-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        Back to stories
      </button>

      <article className="story-reader">
        <header className="story-reader-header">
          <div>
            <div className="story-meta-row">
              <LevelBadge level={story.level} />
              <span className="reading-time">
                <Clock size={15} aria-hidden="true" />
                {story.readingTime}
              </span>
            </div>
            <h1>{story.title}</h1>
          </div>
        </header>

        <CoverPlaceholder title={story.title} color={story.color} accent={story.accent} large />

        <div className="story-text">
          {story.text.map((paragraph) => (
            <p key={paragraph}>{highlightText(paragraph, story.highlights)}</p>
          ))}
        </div>
      </article>

      <section className="vocabulary-section" aria-labelledby="vocabulary-title">
        <div className="section-heading">
          <span>Useful words</span>
          <h2 id="vocabulary-title">Vocabulary</h2>
        </div>
        <div className="vocabulary-grid">
          {story.vocabulary.map((item) => (
            <article className="vocabulary-card" key={item.word}>
              <div>
                <h3>{item.word}</h3>
                <span>{item.translation}</span>
              </div>
              <p>{item.example}</p>
            </article>
          ))}
        </div>
      </section>

      <Quiz
        questions={story.quiz}
        selectedAnswers={selectedAnswers}
        isSubmitted={isSubmitted}
        onAnswer={onAnswer}
        onSubmit={onSubmit}
        onReset={onResetQuiz}
      />
    </main>
  );
}
