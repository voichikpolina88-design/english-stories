import { ArrowLeft, Check, MoveRight, PartyPopper, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { emojiForWord, getTranslation } from "../data/translations";
import { getVocabularyEntryForText, ipaForWord } from "../data/vocabulary";
import type { Challenge, NativeLanguage, QuizQuestion, Story, VocabularyItem } from "../types";
import { ClickableText } from "./ClickableText";
import { ProgressBar } from "./ProgressBar";
import { WordCardModal, type WordCardData } from "./WordCard";

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
    words: string;
    addWord?: string;
    saved?: string;
    addStoryWords?: string;
  };
  initialProgress: number;
  isCompleted: boolean;
  savedWords: string[];
  streak: number;
  onBack: () => void;
  onNextLesson: () => void;
  onToggleSavedWord: (word: string) => void;
  onSaveStoryWords: (words: string[]) => void;
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

type ReadingMode = "story" | "chat";

type ChatMessage = {
  speaker: string;
  avatar: string;
  text: string;
};

type SpeechControls = {
  speakingText: string | null;
  toggle: (text: string) => void;
  cancel: () => void;
};

type LessonStep =
  | { type: "story"; content: string; title: string; index: number }
  | { type: "vocabulary"; challenge: RuntimeChallenge }
  | { type: "quiz"; quiz: RuntimeQuizQuestion[] }
  | { type: "complete" };

function useSpeech(): SpeechControls {
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  useEffect(() => {
    const finish = () => setSpeakingText(null);
    return () => {
      window.speechSynthesis?.cancel();
      finish();
    };
  }, []);

  function cancel() {
    window.speechSynthesis?.cancel();
    setSpeakingText(null);
  }

  function toggle(text: string) {
    if (!("speechSynthesis" in window)) return;
    const normalizedText = text.trim();
    if (!normalizedText) return;

    if (speakingText === normalizedText && window.speechSynthesis.speaking) {
      cancel();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingText(null);
    utterance.onerror = () => setSpeakingText(null);
    setSpeakingText(normalizedText);
    window.speechSynthesis.speak(utterance);
  }

  return { speakingText, toggle, cancel };
}

export function LessonScreen({
  story,
  language,
  ui,
  initialProgress,
  isCompleted,
  savedWords,
  onBack,
  onNextLesson,
  onToggleSavedWord,
  onSaveStoryWords,
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
  const [readingMode, setReadingMode] = useState<ReadingMode>("story");
  const [activeWord, setActiveWord] = useState<WordCardData | null>(null);
  const speech = useSpeech();

  const step = steps[stepIndex];
  const progressValue = Math.round(((stepIndex + 1) / steps.length) * 100);
  const progressLabel = `${language === "Russian" ? "Прогресс истории" : "Story Progress"} · ${progressValue}%`;

  function moveNext() {
    const nextStep = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(nextStep);
    setSelectedAnswer(null);
    setFeedback(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    speech.cancel();
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
          <ProgressBar value={progressValue} label={progressLabel} />
        </div>
        <span className="heart-pill">{story.xpReward} XP</span>
      </div>

      <div className="reading-mode-switch" role="group" aria-label="Reading mode">
        <button
          className={readingMode === "story" ? "active" : ""}
          type="button"
          onClick={() => setReadingMode("story")}
        >
          📖 Story Mode
        </button>
        <button
          className={readingMode === "chat" ? "active" : ""}
          type="button"
          onClick={() => setReadingMode("chat")}
        >
          💬 Chat Mode
        </button>
      </div>

      <section className="lesson-card-stage">
        {step.type === "story" ? (
          readingMode === "chat" ? (
            <ChatStoryCard
              story={story}
              title={step.title}
              content={step.content}
              index={step.index}
              speech={speech}
              onWordClick={setActiveWord}
              onNext={moveNext}
              ui={ui}
            />
          ) : (
            <StoryCard
              story={story}
              title={step.title}
              content={step.content}
              index={step.index}
              speech={speech}
              onWordClick={setActiveWord}
              onNext={moveNext}
              ui={ui}
            />
          )
        ) : null}

        {step.type === "vocabulary" ? (
          <VocabularyChallenge
            challenge={step.challenge}
            selectedAnswer={selectedAnswer}
            feedback={feedback}
            ui={ui}
            speech={speech}
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
            language={language}
            speech={speech}
            onSaveStoryWords={onSaveStoryWords}
          />
        ) : null}
      </section>
      {activeWord ? (
        <WordCardModal
          word={activeWord}
          saved={savedWords.includes(activeWord.word)}
          labels={{ addWord: ui.addWord ?? "Добавить в мои слова", saved: ui.saved ?? "Сохранено", close: "Close" }}
          onSpeak={speech.toggle}
          onToggleSave={onToggleSavedWord}
          onClose={() => setActiveWord(null)}
        />
      ) : null}
    </main>
  );
}

function buildLessonSteps(story: Story, language: NativeLanguage): LessonStep[] {
  const storyCards = story.sections.slice(0, 4);
  const challengeOne = makeRuntimeChallenge(story.challenges[0], story.vocabulary, language);
  const secondTranslationChallenge = story.challenges.find((challenge) => challenge.type === "match");
  const challengeTwo = makeRuntimeChallenge(secondTranslationChallenge ?? story.challenges[0], story.vocabulary, language);

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
  speech,
  onWordClick,
  onNext,
}: {
  story: Story;
  title: string;
  content: string;
  index: number;
  ui: LessonScreenProps["ui"];
  speech: SpeechControls;
  onWordClick: (word: WordCardData) => void;
  onNext: () => void;
}) {
  const character = characterForStory(story.id);
  const sentences = splitIntoSentences(content);
  const isCardSpeaking = speech.speakingText === content.trim();

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
        <button className={isCardSpeaking ? "round-button active" : "round-button"} type="button" aria-label="Audio" onClick={() => speech.toggle(content)}>
          <Volume2 size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="cozy-illustration" style={{ backgroundColor: story.color }}>
        <span className="scene-emoji">{sceneForStory(story, index)}</span>
      </div>

      <div className="story-bubbles">
        {sentences.map((sentence) => (
          <p className="sentence-row" key={sentence}>
            <AudioButton text={sentence} speech={speech} />
            <span><ClickableText text={sentence} onWordClick={onWordClick} /></span>
          </p>
        ))}
      </div>

      <button className="primary-button full" type="button" onClick={onNext}>
        {ui.continueLearning}
        <MoveRight size={18} aria-hidden="true" />
      </button>
    </article>
  );
}

function ChatStoryCard({
  story,
  title,
  content,
  index,
  ui,
  speech,
  onWordClick,
  onNext,
}: {
  story: Story;
  title: string;
  content: string;
  index: number;
  ui: LessonScreenProps["ui"];
  speech: SpeechControls;
  onWordClick: (word: WordCardData) => void;
  onNext: () => void;
}) {
  const messages = chatMessagesForStory(story, index, content);
  const chatCharacters = chatCharactersForStory(story.id);
  const cardText = messages.map((message) => message.text).join(" ");
  const isCardSpeaking = speech.speakingText === cardText.trim();

  return (
    <article className="learning-card chat-story-card polished-card">
      <div className="story-scene-header">
        <div className="character-chip">
          <span>💬</span>
          <div>
            <strong>{story.title}</strong>
            <small>{ui.storyCard} {title}</small>
          </div>
        </div>
        <button className={isCardSpeaking ? "round-button active" : "round-button"} type="button" aria-label="Audio" onClick={() => speech.toggle(cardText)}>
          <Volume2 size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="chat-phone">
        <div className="chat-phone-top">
          <span>{chatCharacters[0].avatar}</span>
          <div>
            <strong>{chatCharacters.map((character) => character.name).join(" & ")}</strong>
            <small>online</small>
          </div>
        </div>
        <div className="chat-thread">
          {messages.map((message, messageIndex) => (
            <div className="chat-moment" key={`${message.speaker}-${message.text}`}>
              <div className={messageIndex % 2 === 0 ? "chat-row" : "chat-row right"}>
                <span className="chat-avatar">{message.avatar}</span>
                <div className="chat-message">
                  <strong>{message.speaker}</strong>
                  <p className="sentence-row">
                    <AudioButton text={message.text} speech={speech} />
                    <span><ClickableText text={message.text} onWordClick={onWordClick} /></span>
                  </p>
                </div>
              </div>
              {messageIndex === 0 ? (
                <div className="chat-inline-illustration" style={{ backgroundColor: story.color }}>
                  <span>{sceneForStory(story, index)}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
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
  speech,
  onSelect,
  onCheck,
  onNext,
}: {
  challenge: RuntimeChallenge;
  selectedAnswer: string | null;
  feedback: "correct" | "wrong" | null;
  ui: LessonScreenProps["ui"];
  speech: SpeechControls;
  onSelect: (answer: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  const vocabularyWord = "word" in challenge ? challenge.word : "";

  return (
    <article className="learning-card challenge-card polished-card">
      <span className="eyebrow">{ui.check}</span>
      <h1>{ui.chooseAnswer}</h1>
      {vocabularyWord ? (
        <div className="pronunciation-card">
          <AudioButton text={vocabularyWord} speech={speech} />
          <div>
            <strong>{vocabularyWord}</strong>
            <span>{ipaForWord(vocabularyWord)}</span>
          </div>
        </div>
      ) : null}
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
                <strong>{option}</strong>
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
  language,
  speech,
  onSaveStoryWords,
}: {
  story: Story;
  ui: LessonScreenProps["ui"];
  correctAnswers: number;
  totalAnswers: number;
  onBack: () => void;
  onNextLesson: () => void;
  language: NativeLanguage;
  speech: SpeechControls;
  onSaveStoryWords: (words: string[]) => void;
}) {
  return (
    <article className="learning-card complete-card polished-card">
      <span className="celebration-mark">
        <PartyPopper size={44} aria-hidden="true" />
      </span>
      <h1>{ui.lessonComplete}</h1>
      <p>{language === "Russian" ? "История пройдена. Отличная работа!" : "Story completed. Beautiful work!"}</p>
      <div className="reward-grid mvp-reward-grid">
        <div>
          <span>{language === "Russian" ? "XP получено" : "XP earned"}</span>
          <strong>{story.xpReward}</strong>
        </div>
        <div>
          <span>{language === "Russian" ? "Новые слова" : "Words learned"}</span>
          <strong>{story.vocabulary.length} {ui.words}</strong>
        </div>
      </div>
      <div className="lesson-word-list">
        {story.vocabulary.map((item) => (
          <div className="lesson-word-row" key={item.word}>
            <AudioButton text={item.word} speech={speech} />
            <strong>{item.word}</strong>
            <span>{getVocabularyEntryForText(item.word)?.translation ?? item.translation}</span>
          </div>
        ))}
      </div>
      <button className="ghost-action story-words-action" type="button" onClick={() => onSaveStoryWords(story.vocabulary.map((item) => item.word))}>
        📚 {ui.addStoryWords ?? "Добавить все слова истории"}
      </button>
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

function AudioButton({ text, speech }: { text: string; speech: SpeechControls }) {
  const normalizedText = text.trim();
  const isActive = speech.speakingText === normalizedText;

  return (
    <button
      className={isActive ? "audio-button active" : "audio-button"}
      type="button"
      aria-label={isActive ? "Pause audio" : "Play audio"}
      onClick={(event) => {
        event.stopPropagation();
        speech.toggle(normalizedText);
      }}
    >
      <Volume2 size={15} aria-hidden="true" />
    </button>
  );
}

function chatMessagesForStory(story: Story, index: number, content: string): ChatMessage[] {
  const characters = chatCharactersForStory(story.id);

  if (story.id === "best-friend") {
    const scenes: ChatMessage[][] = [
    [
      { speaker: "Leo", avatar: "🙂", text: "Hi! This is my best friend, Tom." },
      { speaker: "Tom", avatar: "😄", text: "Hello! I live next door to Leo." },
      { speaker: "Leo", avatar: "🙂", text: "We go to the same school every day." },
    ],
    [
      { speaker: "Tom", avatar: "😄", text: "After school, we meet in the park." },
      { speaker: "Leo", avatar: "🙂", text: "We ride bikes, play games, and share cookies." },
      { speaker: "Tom", avatar: "😄", text: "Leo always brings good snacks in his bag." },
    ],
    [
      { speaker: "Leo", avatar: "🙂", text: "Tom helps me with English words." },
      { speaker: "Tom", avatar: "😄", text: "And Leo helps me with math." },
      { speaker: "Leo", avatar: "🙂", text: "We laugh when we make small mistakes." },
    ],
    [
      { speaker: "Tom", avatar: "😄", text: "A good friend listens." },
      { speaker: "Leo", avatar: "🙂", text: "A good friend helps, laughs, and shares." },
      { speaker: "Tom", avatar: "😄", text: "That is why simple days feel better together." },
    ],
    ];

    return scenes[index] ?? scenes[0];
  }

  return splitIntoSentences(content).map((sentence, sentenceIndex) => {
    const character = characters[sentenceIndex % characters.length];
    return {
      speaker: character.name,
      avatar: character.avatar,
      text: sentence,
    };
  });
}

function chatCharactersForStory(storyId: string) {
  const characters: Record<string, Array<{ name: string; avatar: string }>> = {
    "morning-routine": [{ name: "Emma", avatar: "🙂" }, { name: "Max", avatar: "😴" }],
    "beach-day": [{ name: "Leo", avatar: "🙂" }, { name: "Sara", avatar: "😊" }],
    supermarket: [{ name: "Mila", avatar: "🙂" }, { name: "Cashier", avatar: "🧑‍💼" }],
    "my-family": [{ name: "Emma", avatar: "🙂" }, { name: "Family", avatar: "👨‍👩‍👧‍👦" }],
    "best-friend": [{ name: "Leo", avatar: "🙂" }, { name: "Tom", avatar: "😄" }],
    "at-school": [{ name: "Sara", avatar: "🙂" }, { name: "Teacher", avatar: "👩‍🏫" }],
    "my-room": [{ name: "Nina", avatar: "🙂" }, { name: "Room", avatar: "🛋️" }],
    "rainy-day": [{ name: "Max", avatar: "🙂" }, { name: "Mom", avatar: "👩" }],
    "weekend-plans": [{ name: "Emma", avatar: "🙂" }, { name: "Friend", avatar: "😊" }],
    "new-bicycle": [{ name: "Leo", avatar: "🙂" }, { name: "Dad", avatar: "👨" }],
    "my-first-trip": [{ name: "Nikita", avatar: "🙂" }, { name: "Traveler", avatar: "🚆" }],
    "lost-phone": [{ name: "Mira", avatar: "😟" }, { name: "Waiter", avatar: "☕" }],
    "learning-to-drive": [{ name: "Oleg", avatar: "🙂" }, { name: "Instructor", avatar: "🧑‍🏫" }],
    "busy-day": [{ name: "Sara", avatar: "🙂" }, { name: "Mom", avatar: "👩" }],
    "new-hobby": [{ name: "Mira", avatar: "🙂" }, { name: "Friend", avatar: "🎨" }],
    "birthday-surprise-a2": [{ name: "Sara", avatar: "😊" }, { name: "Friends", avatar: "🎂" }],
    airport: [{ name: "Nikita", avatar: "🙂" }, { name: "Airport", avatar: "✈️" }],
    "moving-city": [{ name: "Lena", avatar: "🙂" }, { name: "Neighbor", avatar: "👋" }],
    "weekend-hiking": [{ name: "Leo", avatar: "🙂" }, { name: "Sara", avatar: "😊" }],
    "missing-keys": [{ name: "Mira", avatar: "😟" }, { name: "Brother", avatar: "🙂" }],
    "new-job": [{ name: "Oleg", avatar: "🙂" }, { name: "Marina", avatar: "🧑‍💼" }],
    "surprise-gift": [{ name: "Lena", avatar: "🙂" }, { name: "Grandmother", avatar: "👵" }],
    "first-day-university": [{ name: "Nikita", avatar: "🙂" }, { name: "Roommate", avatar: "🎓" }],
    "difficult-decision": [{ name: "Sara", avatar: "🤔" }, { name: "Mom", avatar: "👩" }],
    "unexpected-message": [{ name: "Mira", avatar: "😟" }, { name: "Friend", avatar: "💬" }],
    "lost-abroad": [{ name: "Leo", avatar: "😟" }, { name: "Local woman", avatar: "👩" }],
  };

  return characters[storyId] ?? [{ name: "Learner", avatar: "🙂" }, { name: "Friend", avatar: "😊" }];
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

function splitIntoSentences(content: string) {
  return (content.match(/[^.!?]+[.!?"]*/g) ?? [content])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
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

function sceneForStory(story: Story, index: number) {
  const scenes: Record<string, string[]> = {
    "morning-routine": ["🛏️", "🪞", "☕", "🎒"],
    "beach-day": ["🏖️", "🌊", "🥪", "🚌"],
    "my-first-trip": ["🎒", "🚉", "🚆", "🏙️"],
    "lost-phone": ["☕", "📱", "🔎", "🚌"],
    "new-job": ["🏢", "👥", "💻", "📝"],
    "surprise-gift": ["📷", "📔", "🎀", "🎁"],
  };
  return scenes[story.id]?.[index] ?? story.illustration ?? "📚";
}
