import { CheckCircle2, Flame, LockKeyhole, Star, Trophy, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { stories } from "../data/stories";
import type { LearnerProgress, Story } from "../types";
import { LessonCover } from "./LessonCover";
import { ProgressBar } from "./ProgressBar";

type HomeScreenProps = {
  progress: LearnerProgress;
  currentLevel: string;
  onStartLesson: (storyId: string) => void;
};

export function HomeScreen({ progress, currentLevel, onStartLesson }: HomeScreenProps) {
  const completedCount = progress.completedLessons.length;
  const totalProgress = Math.round((completedCount / stories.length) * 100);

  return (
    <main className="home-screen">
      <section className="profile-panel">
        <div className="profile-top">
          <div className="avatar-card">
            <span className="avatar-face">ES</span>
          </div>
          <div>
            <span className="small-label">Welcome back</span>
            <h1>Learn English Through Stories</h1>
            <p>Keep your cozy lesson streak going with one story card at a time.</p>
          </div>
        </div>

        <div className="stats-grid">
          <Stat icon={<Zap size={18} />} label="XP" value={progress.xp.toString()} />
          <Stat icon={<Star size={18} />} label="Level" value={currentLevel} />
          <Stat icon={<Flame size={18} />} label="Streak" value={`${progress.streak} days`} />
        </div>

        <ProgressBar value={totalProgress} label={`${completedCount}/${stories.length} lessons complete`} />
      </section>

      <section className="lesson-list-section" aria-labelledby="lessons-title">
        <div className="section-title-row">
          <div>
            <span className="small-label">Today&apos;s path</span>
            <h2 id="lessons-title">Story lessons</h2>
          </div>
          <span className="path-pill">
            <Trophy size={17} aria-hidden="true" />
            {totalProgress}%
          </span>
        </div>

        <div className="lesson-list">
          {stories.map((story, index) => (
            <LessonCard
              key={story.id}
              story={story}
              index={index}
              isCompleted={progress.completedLessons.includes(story.id)}
              progressValue={progress.lessonProgress[story.id] ?? 0}
              onStartLesson={onStartLesson}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function LessonCard({
  story,
  index,
  isCompleted,
  progressValue,
  onStartLesson,
}: {
  story: Story;
  index: number;
  isCompleted: boolean;
  progressValue: number;
  onStartLesson: (storyId: string) => void;
}) {
  return (
    <article className={isCompleted ? "lesson-card completed" : "lesson-card"}>
      <LessonCover title={story.title} color={story.color} accent={story.accent} compact />
      <div className="lesson-card-content">
        <div className="lesson-card-top">
          <span className="lesson-index">Lesson {index + 1}</span>
          <span className={`level-chip ${story.level.toLowerCase()}`}>{story.level}</span>
        </div>
        <h3>{story.title}</h3>
        <p>{story.description}</p>
        <ProgressBar value={progressValue} />
        <div className="lesson-card-footer">
          <span>{story.readingTime}</span>
          <button type="button" onClick={() => onStartLesson(story.id)}>
            {isCompleted ? (
              <>
                <CheckCircle2 size={17} aria-hidden="true" />
                Review
              </>
            ) : progressValue > 0 ? (
              "Continue"
            ) : (
              "Start"
            )}
          </button>
        </div>
      </div>
      {index > 0 && !isCompleted ? <LockKeyhole className="soft-lock" size={18} aria-hidden="true" /> : null}
    </article>
  );
}
