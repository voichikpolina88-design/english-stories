import { ArrowLeft, Check, Image, MoveRight, PartyPopper, Volume2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { emojiForWord, getTranslation } from "../data/translations";
import type { Challenge, NativeLanguage, QuizQuestion, Story, VocabularyItem } from "../types";
import { ProgressBar } from "./ProgressBar";

type LessonScreenProps = {
  story: Story;
  language: NativeLanguage;
  ui: {
    home: string;
    check: string;
    next: string;
    continueLearning: string;
    correct: string;
    answer: string;
    finalQuiz: string;
    submit: string;
    reward: string;
    xp: string;
    lessonComplete: string;
    nextLesson: string;
    backHome: string;
    storyCard: string;
    chooseAnswer: string;
    trueLabel: string;
    falseLabel: string;
  };
  initialProgress: number;
  isCompleted: boolean;
  streak: number;
  onBack: () => void;
  onNextLesson: () => void;
  onStepChange: (storyId: string, progressValue: number) => void;
  onComplete: (storyId: string, xpReward: number) => void;
};

type RuntimeQuizQuestion = QuizQuestion & {
  shuffledOptions: string[];
};

type RuntimeChallenge = Challenge & {
  shuffledOptions: string[];
  localizedAnswer: string;
};

type LessonStep =
  | { type: "story"; content: string; title: string; index: number }
  | { type: "vocabulary"; challenge: RuntimeChallenge }
  | { type: "quiz"; quiz: RuntimeQuizQuestion[] }
  | { type: "complete" };

export function LessonScreen({
  story,
  language,
  ui,
  initialProgress,
  isCompleted,
  onBack,
  onNextLesson,
  onStepChange,
  onComplete,
}: LessonScreenProps) {
  const steps = useMemo(() => buildLessonSteps(story, language), [story, language]);
  const safeInitialStep = initialProgress >= 100 ? 0 : Math.min(Math.round((initialProgress / 100) * (steps.length - 1)), steps.length - 1);
  const [stepIndex, setStepIndex] = useState(safeInitialStep);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredKeys, setAnsweredKeys] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const step = steps[stepIndex];
  const progressValue = Math.round(((stepIndex + 1) / steps.length) * 100);

  function moveNext() {
    const nextStep = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(nextStep);
    setSelectedAnswer(null);
    setFeedback(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    onStepChange(story.id, Math.round(((nextStep + 1) / steps.length) * 100));

    if (steps[nextStep].type === "complete" && !isCompleted) {
      onComplete(story.id, story.xpReward);
    }
  }

  function checkChallenge(challenge: RuntimeChallenge) {
    if (!selectedAnswer) return;
    const isCorrect = selectedAnswer === challenge.localizedAnswer;
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect && !answeredKeys.includes(challenge.id)) {
      setCorrectAnswers((current) => current + 1);
      setAnsweredKeys((current) => [...current, challenge.id]);
    }
  }

  function submitQuiz(quiz: RuntimeQuizQuestion[]) {
    const score = quiz.reduce((total, question, index) => total + (quizAnswers[index] === question.answer ? 1 : 0), 0);
    const key = `${story.id}-quiz`;
    setQuizSubmitted(true);

    if (!answeredKeys.includes(key)) {
      setCorrectAnswers((current) => current + score);
      setAnsweredKeys((current) => [...current, key]);
    }
  }

  return (
    <main className="lesson-screen premium-lesson">
      <div className="lesson-player-top">
        <button className="icon-text-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          {ui.home}
        </button>
        <div className="lesson-progress-area">
          <ProgressBar value={progressValue} label={`${stepIndex + 1}/${steps.length}`} />
        </div>
        <span className="heart-pill">{story.xpReward} XP</span>
      </div>

      <section className="lesson-card-stage">
        {step.type === "story" ? (
          <StoryCard story={story} title={step.title} content={step.content} index={step.index} onNext={moveNext} ui={ui} />
        ) : null}

        {step.type === "vocabulary" ? (
          <VocabularyChallenge
            challenge={step.challenge}
            selectedAnswer={selectedAnswer}
            feedback={feedback}
            ui={ui}
            onSelect={setSelectedAnswer}
            onCheck={() => checkChallenge(step.challenge)}
            onNext={moveNext}
          />
        ) : null}

        {step.type === "quiz" ? (
          <QuizCard
            quiz={step.quiz}
            ui={ui}
            quizAnswers={quizAnswers}
            quizSubmitted={quizSubmitted}
            onAnswer={(index, answer) => setQuizAnswers((current) => ({ ...current, [index]: answer }))}
            onSubmit={() => submitQuiz(step.quiz)}
            onNext={moveNext}
          />
        ) : null}

        {step.type === "complete" ? (
          <CompleteCard
            story={story}
            ui={ui}
            correctAnswers={correctAnswers}
            totalAnswers={2 + story.quiz.length}
            onBack={onBack}
            onNextLesson={onNextLesson}
          />
        ) : null}
      </section>
    </main>
  );
}

function buildLessonSteps(story: Story, language: NativeLanguage): LessonStep[] {
  const storyCards = story.sections.slice(0, 4);
  const challengeOne = makeRuntimeChallenge(story.challenges[0], story.vocabulary, language);
  const challengeTwo = makeRuntimeChallenge(story.challenges[1] ?? story.challenges[0], story.vocabulary, language);

  return [
    { type: "story", title: "1", content: storyCards[0] ?? story.sections[0], index: 0 },
    { type: "story", title: "2", content: storyCards[1] ?? story.sections[1] ?? story.sections[0], index: 1 },
    { type: "vocabulary", challenge: challengeOne },
    { type: "story", title: "3", content: storyCards[2] ?? story.sections[2] ?? story.sections[0], index: 2 },
    { type: "vocabulary", challenge: challengeTwo },
    { type: "story", title: "4", content: storyCards[3] ?? story.sections[3] ?? story.sections[0], index: 3 },
    { type: "quiz", quiz: story.quiz.map((question) => ({ ...question, shuffledOptions: shuffleUnique([question.answer, ...question.options]) })) },
    { type: "complete" },
  ];
}

function StoryCard({
  story,
  title,
  content,
  index,
  ui,
  onNext,
}: {
  story: Story;
  title: string;
  content: string;
  index: number;
  ui: LessonScreenProps["ui"];
  onNext: () => void;
}) {
  const character = characterForStory(story.id);
  const blocks = splitReadable(content);

  return (
    <article className="learning-card story-step-card polished-card">
      <div className="story-scene-header">
        <div className="character-chip">
          <span>{character.avatar}</span>
          <div>
            <strong>{character.name}</strong>
            <small>{ui.storyCard} {title}</small>
          </div>
        </div>
        <button className="round-button" type="button" aria-label="Audio">
          <Volume2 size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="cozy-illustration" style={{ backgroundColor: story.color }}>
        <span>{sceneForStory(story.id, index)}</span>
      </div>

      <div className="story-bubbles">
        {blocks.map((block) => (
          <p key={block}>{block}</p>
        ))}
      </div>

      <button className="primary-button full" type="button" onClick={onNext}>
        {ui.continueLearning}
        <MoveRight size={18} aria-hidden="true" />
      </button>
    </article>
  );
}

function VocabularyChallenge({
  challenge,
  selectedAnswer,
  feedback,
  ui,
  onSelect,
  onCheck,
  onNext,
}: {
  challenge: RuntimeChallenge;
  selectedAnswer: string | null;
  feedback: "correct" | "wrong" | null;
  ui: LessonScreenProps["ui"];
  onSelect: (answer: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  return (
    <article className="learning-card challenge-card polished-card">
      <span className="eyebrow">{ui.check}</span>
      <h1>{ui.chooseAnswer}</h1>
      <p className="prompt-box">{challengePromptText(challenge)}</p>

      <div className={challenge.type === "picture" ? "picture-options" : "choice-list"}>
        {challenge.shuffledOptions.map((option) => (
          <button
            key={option}
            className={selectedAnswer === option ? "choice-button selected" : "choice-button"}
            type="button"
            onClick={() => onSelect(option)}
            disabled={feedback !== null}
          >
            {challenge.type === "picture" ? (
              <span className="picture-tile">
                <Image size={24} aria-hidden="true" />
                {option}
              </span>
            ) : (
              option
            )}
          </button>
        ))}
      </div>

      {feedback ? (
        <div className={feedback === "correct" ? "feedback correct" : "feedback wrong"}>
          {feedback === "correct" ? <Check size={20} aria-hidden="true" /> : <X size={20} aria-hidden="true" />}
          {feedback === "correct" ? ui.correct : `${ui.answer}: ${challenge.localizedAnswer}`}
        </div>
      ) : null}

      <button className="primary-button full" type="button" disabled={!selectedAnswer} onClick={feedback ? onNext : onCheck}>
        {feedback ? ui.next : ui.check}
      </button>
    </article>
  );
}

function QuizCard({
  quiz,
  ui,
  quizAnswers,
  quizSubmitted,
  onAnswer,
  onSubmit,
  onNext,
}: {
  quiz: RuntimeQuizQuestion[];
  ui: LessonScreenProps["ui"];
  quizAnswers: Record<number, string>;
  quizSubmitted: boolean;
  onAnswer: (index: number, answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}) {
  const answeredCount = Object.keys(quizAnswers).length;
  const score = quiz.reduce((total, question, index) => total + (quizAnswers[index] === question.answer ? 1 : 0), 0);

  return (
    <article className="learning-card quiz-card polished-card">
      <span className="eyebrow">{ui.finalQuiz}</span>
      <h1>{ui.finalQuiz} ✨</h1>
      <div className="quiz-list">
        {quiz.map((question, index) => (
          <div className="quiz-item" key={question.question}>
            <h2>{question.question}</h2>
            <div className="choice-list">
              {question.shuffledOptions.map((option) => (
                <button
                  key={option}
                  className={quizAnswers[index] === option ? "choice-button selected" : "choice-button"}
                  type="button"
                  onClick={() => onAnswer(index, option)}
                  disabled={quizSubmitted}
                >
                  {option}
                </button>
              ))}
            </div>
            {quizSubmitted ? (
              <div className={quizAnswers[index] === question.answer ? "mini-result correct" : "mini-result wrong"}>
                {quizAnswers[index] === question.answer ? ui.correct : `${ui.answer}: ${question.answer}`}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {quizSubmitted ? <div className="feedback correct">{score}/{quiz.length}</div> : null}
      <button className="primary-button full" type="button" disabled={answeredCount < quiz.length} onClick={quizSubmitted ? onNext : onSubmit}>
        {quizSubmitted ? ui.reward : ui.submit}
      </button>
    </article>
  );
}

function CompleteCard({
  story,
  ui,
  onBack,
  onNextLesson,
}: {
  story: Story;
  ui: LessonScreenProps["ui"];
  correctAnswers: number;
  totalAnswers: number;
  onBack: () => void;
  onNextLesson: () => void;
}) {
  return (
    <article className="learning-card complete-card polished-card">
      <span className="celebration-mark">
        <PartyPopper size={44} aria-hidden="true" />
      </span>
      <h1>{ui.lessonComplete}</h1>
      <div className="reward-grid mvp-reward-grid">
        <div>
          <span>{ui.xp}</span>
          <strong>{story.xpReward}</strong>
        </div>
      </div>
      <div className="completion-actions">
        <button className="primary-button full" type="button" onClick={onNextLesson}>
          {ui.nextLesson}
        </button>
        <button className="ghost-action" type="button" onClick={onBack}>
          {ui.backHome}
        </button>
      </div>
    </article>
  );
}

function makeRuntimeChallenge(challenge: Challenge, words: VocabularyItem[], language: NativeLanguage): RuntimeChallenge {
  const localizedAnswer = localizedAnswerForChallenge(challenge, language);
  const shuffledOptions = shuffleUnique([localizedAnswer, ...localizedOptionsForChallenge(challenge, words, language)]);
  return { ...challenge, localizedAnswer, shuffledOptions };
}

function localizedOptionsForChallenge(challenge: Challenge, words: VocabularyItem[], language: NativeLanguage) {
  if (challenge.type === "trueFalse") {
    const labels = trueFalseLabels(language);
    return [labels.trueLabel, labels.falseLabel].filter((option) => option !== localizedAnswerForChallenge(challenge, language));
  }
  if (challenge.type === "picture" || challenge.type === "fill") return challenge.options.filter((option) => option !== challenge.answer);
  if (challenge.type === "translation" || challenge.type === "match") {
    return words
      .map((word) => getTranslation(word.word, language))
      .filter((translation) => translation !== getTranslation(challenge.word, language));
  }
  return [];
}

function localizedAnswerForChallenge(challenge: Challenge, language: NativeLanguage) {
  if (challenge.type === "translation" || challenge.type === "match") return getTranslation(challenge.word, language);
  if (challenge.type === "trueFalse") {
    const labels = trueFalseLabels(language);
    return challenge.answer === "True" ? labels.trueLabel : labels.falseLabel;
  }
  return challenge.answer;
}

function trueFalseLabels(language: NativeLanguage) {
  return language === "Russian"
    ? { trueLabel: "Правда", falseLabel: "Ложь" }
    : { trueLabel: "True", falseLabel: "False" };
}

function challengePromptText(challenge: Challenge) {
  if (challenge.type === "fill") return challenge.sentence.replace("____", "_____");
  if (challenge.type === "trueFalse") return challenge.statement;
  return `${emojiForWord(challenge.word)} ${challenge.word}`;
}

function shuffleUnique(values: string[]) {
  const uniqueValues = Array.from(new Set(values)).filter(Boolean);
  for (let index = uniqueValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [uniqueValues[index], uniqueValues[swapIndex]] = [uniqueValues[swapIndex], uniqueValues[index]];
  }
  return uniqueValues;
}

function splitReadable(content: string) {
  const sentences = content.match(/[^.!?]+[.!?"]+/g) ?? [content];
  const first = sentences.slice(0, 2).join(" ").trim();
  const second = sentences.slice(2, 4).join(" ").trim();
  return [first, second].filter(Boolean);
}

function characterForStory(storyId: string) {
  const characters: Record<string, { name: string; avatar: string }> = {
    "morning-routine": { name: "Emma", avatar: "👩‍🎓" },
    "beach-day": { name: "Leo & Sara", avatar: "🏖️" },
    "my-first-trip": { name: "Nikita", avatar: "🧑‍🚆" },
    "lost-phone": { name: "Mira", avatar: "👩‍💻" },
    "new-job": { name: "Oleg", avatar: "🧑‍💼" },
    "surprise-gift": { name: "Lena", avatar: "👩‍🎨" },
  };
  return characters[storyId] ?? { name: "Story friend", avatar: "😊" };
}

function sceneForStory(storyId: string, index: number) {
  const scenes: Record<string, string[]> = {
    "morning-routine": ["🛏️", "🪞", "☕", "🎒"],
    "beach-day": ["🏖️", "🌊", "🥪", "🚌"],
    "my-first-trip": ["🎒", "🚉", "🚆", "🏙️"],
    "lost-phone": ["☕", "📱", "🔎", "🚌"],
    "new-job": ["🏢", "👥", "💻", "📝"],
    "surprise-gift": ["📷", "📔", "🎀", "🎁"],
  };
  return scenes[storyId]?.[index] ?? "📚";
}
