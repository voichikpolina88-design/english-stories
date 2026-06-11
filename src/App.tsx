import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Home,
  Languages,
  LockKeyhole,
  Settings,
  Sparkles,
  Star,
  Trophy,
  Volume2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { LessonScreen } from "./components/LessonScreen";
import { ProgressBar } from "./components/ProgressBar";
import { WordCard } from "./components/WordCard";
import { getStoryById, stories } from "./data/stories";
import { getAllVocabulary as getVocabularyDatabase, type VocabularyEntry } from "./data/vocabulary";
import { useLearnerProgress } from "./hooks/useLearnerProgress";
import type { NativeLanguage, Story } from "./types";

type Page = "home" | "learn" | "words" | "stats" | "settings";

const languages: NativeLanguage[] = ["Russian", "English"];

const copy = {
  Russian: {
    appName: "English Stories",
    cozy: "уютное обучение",
    chooseLanguage: "Выберите родной язык",
    chooseHelp: "Интерфейс и переводы будут использовать этот язык.",
    home: "Главная",
    learn: "Учиться",
    wordsPage: "Слова",
    stats: "Статистика",
    settings: "Настройки",
    learner: "Ежедневный ученик",
    welcome: "Готовы к маленькому английскому приключению?",
    welcomeText: "Проходите короткие карточки и открывайте уроки по порядку.",
    continueLearning: "Продолжить",
    start: "Начать",
    review: "Повторить",
    locked: "Закрыто",
    xp: "XP",
    streak: "Серия",
    level: "Уровень",
    progress: "Прогресс",
    lessonPath: "Путь уроков",
    completed: "уроков завершено",
    check: "Проверить",
    next: "Дальше",
    finalQuiz: "Финальный квиз",
    submit: "Ответить",
    reward: "К награде",
    totalXp: "Всего XP",
    completedLessons: "Завершенные уроки",
    languageSettings: "Язык интерфейса",
    changeLanguage: "Можно изменить родной язык в любой момент.",
    correct: "Верно! +3 XP",
    answer: "Ответ",
    path: "путь",
    lessonComplete: "🎉 Урок завершен",
    nextLesson: "Следующий урок",
    backHome: "На главную",
    storyCard: "Карточка",
    chooseAnswer: "Выберите ответ",
    trueLabel: "Правда",
    falseLabel: "Ложь",
    words: "слов",
    myWords: "Мои слова",
    allWords: "Все слова",
    trainMyWords: "Тренировать мои слова",
    addWord: "Добавить в мои слова",
    saved: "Сохранено",
    addStoryWords: "Добавить все слова истории",
    chooseTranslation: "Выбери перевод",
    chooseEnglish: "Выбери английское слово",
    audioTest: "Аудио-тест",
    listenAndChoose: "Послушай и выбери слово",
    noSavedWords: "Сохраняйте слова в историях, чтобы тренировать их здесь.",
    nextQuestion: "Следующий вопрос",
    finishTraining: "Завершить",
    trainingResult: "Результат тренировки",
  },
  English: {
    appName: "English Stories",
    cozy: "cozy learning",
    chooseLanguage: "Choose your native language",
    chooseHelp: "Interface text and translations will use this language.",
    home: "Home",
    learn: "Learn",
    wordsPage: "Words",
    stats: "Statistics",
    settings: "Settings",
    learner: "Daily learner",
    welcome: "Ready for a tiny English adventure?",
    welcomeText: "Move through short cards and unlock lessons in order.",
    continueLearning: "Continue",
    start: "Start",
    review: "Review",
    locked: "Locked",
    xp: "XP",
    streak: "Streak",
    level: "Level",
    progress: "Progress",
    lessonPath: "Lesson path",
    completed: "lessons complete",
    check: "Check",
    next: "Next",
    finalQuiz: "Final quiz",
    submit: "Submit",
    reward: "See reward",
    totalXp: "Total XP",
    completedLessons: "Completed lessons",
    languageSettings: "Interface language",
    changeLanguage: "You can change your native language any time.",
    correct: "Correct! +3 XP",
    answer: "Answer",
    path: "path",
    lessonComplete: "🎉 Lesson Complete",
    nextLesson: "Next Lesson",
    backHome: "Back to Home",
    storyCard: "Story",
    chooseAnswer: "Choose the answer",
    trueLabel: "True",
    falseLabel: "False",
    words: "words",
    myWords: "My Words",
    allWords: "All Words",
    trainMyWords: "Train my words",
    addWord: "Add to my words",
    saved: "Saved",
    addStoryWords: "Add all story words",
    chooseTranslation: "Choose translation",
    chooseEnglish: "Choose English word",
    audioTest: "Audio test",
    listenAndChoose: "Listen and choose the word",
    noSavedWords: "Save words inside stories to practice them here.",
    nextQuestion: "Next question",
    finishTraining: "Finish",
    trainingResult: "Training result",
  },
};

type Copy = typeof copy.English;

function App() {
  const [page, setPage] = useState<Page>("home");
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const {
    progress,
    currentLevel,
    saveLessonProgress,
    completeLesson,
    selectLanguage,
    toggleSavedWord,
    saveWords,
    saveTestScore,
  } = useLearnerProgress();

  const language = progress.selectedLanguage ?? "Russian";
  const t = copy[language];
  const activeStory = activeStoryId ? getStoryById(activeStoryId) : undefined;
  const totalProgress = Math.round((progress.completedLessons.length / stories.length) * 100);
  const currentLevelLabel = translateLevel(currentLevel, language);

  function isLessonUnlocked(index: number) {
    return (
      index === 0 ||
      progress.unlockedLessons.includes(stories[index].id) ||
      progress.completedLessons.includes(stories[index - 1].id)
    );
  }

  function openLesson(storyId: string) {
    const index = stories.findIndex((story) => story.id === storyId);
    if (index < 0 || !isLessonUnlocked(index)) return;
    setActiveStoryId(storyId);
    setPage("learn");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setActiveStoryId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!progress.selectedLanguage) {
    return <Onboarding t={copy.English} onSelect={selectLanguage} />;
  }

  return (
    <div className="premium-shell">
      <Sidebar page={page} t={t} onNavigate={navigate} />
      <div className="app-main">
        <TopBar progress={progress} currentLevel={currentLevelLabel} language={language} t={t} />
        {activeStory ? (
          <LessonScreen
            key={activeStory.id}
            story={activeStory}
            language={language}
            ui={t}
            initialProgress={progress.lessonProgress[activeStory.id] ?? 0}
            isCompleted={progress.completedLessons.includes(activeStory.id)}
            savedWords={progress.savedWords}
            streak={progress.streak}
            onBack={() => setActiveStoryId(null)}
            onToggleSavedWord={toggleSavedWord}
            onSaveStoryWords={saveWords}
            onStepChange={saveLessonProgress}
            onComplete={(storyId, xpReward) => {
              const storyIndex = stories.findIndex((story) => story.id === storyId);
              completeLesson(storyId, xpReward, stories[storyIndex + 1]?.id);
            }}
            onNextLesson={() => {
              const storyIndex = stories.findIndex((story) => story.id === activeStory.id);
              const nextStory = stories[storyIndex + 1];
              if (nextStory) {
                setActiveStoryId(nextStory.id);
                setPage("learn");
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                navigate("learn");
              }
            }}
          />
        ) : (
          <>
            {page === "home" ? (
              <HomePage
                t={t}
                progress={progress}
                currentLevel={currentLevelLabel}
                totalProgress={totalProgress}
                onStartLesson={openLesson}
                onNavigate={navigate}
                isLessonUnlocked={isLessonUnlocked}
              />
            ) : null}
            {page === "learn" ? (
              <LearnPage t={t} progress={progress} onStartLesson={openLesson} isLessonUnlocked={isLessonUnlocked} />
            ) : null}
            {page === "words" ? (
              <WordsPage
                t={t}
                savedWords={progress.savedWords}
                onToggleSavedWord={toggleSavedWord}
                onSaveTestScore={saveTestScore}
              />
            ) : null}
            {page === "stats" ? (
              <StatisticsPage t={t} progress={progress} currentLevel={currentLevelLabel} totalProgress={totalProgress} />
            ) : null}
            {page === "settings" ? (
              <SettingsPage t={t} selectedLanguage={language} onSelectLanguage={selectLanguage} />
            ) : null}
          </>
        )}
      </div>
      <MobileNav page={page} t={t} onNavigate={navigate} />
    </div>
  );
}

function Onboarding({ t, onSelect }: { t: Copy; onSelect: (language: NativeLanguage) => void }) {
  return (
    <main className="onboarding-screen">
      <section className="onboarding-card">
        <span className="mascot-large">🌸</span>
        <span className="eyebrow">English Stories</span>
        <h1>{t.chooseLanguage}</h1>
        <p>{t.chooseHelp}</p>
        <div className="language-grid">
          {languages.map((language) => (
            <button key={language} type="button" onClick={() => onSelect(language)}>
              <Languages size={20} aria-hidden="true" />
              {language}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function Sidebar({ page, t, onNavigate }: { page: Page; t: Copy; onNavigate: (page: Page) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">✨</span>
        <div>
          <strong>{t.appName}</strong>
          <span>{t.cozy}</span>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems(t).map((item) => (
          <button key={item.page} className={page === item.page ? "active" : ""} type="button" onClick={() => onNavigate(item.page)}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav({ page, t, onNavigate }: { page: Page; t: Copy; onNavigate: (page: Page) => void }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navItems(t).map((item) => (
        <button key={item.page} className={page === item.page ? "active" : ""} type="button" onClick={() => onNavigate(item.page)}>
          {item.icon}
          <span>{item.short}</span>
        </button>
      ))}
    </nav>
  );
}

function TopBar({
  progress,
  currentLevel,
  language,
  t,
}: {
  progress: ReturnType<typeof useLearnerProgress>["progress"];
  currentLevel: string;
  language: NativeLanguage;
  t: Copy;
}) {
  return (
    <header className="top-bar">
      <div className="user-chip">
        <span className="avatar">😊</span>
        <div>
          <strong>{t.learner}</strong>
          <span>{currentLevel} · {language}</span>
        </div>
      </div>
      <div className="top-stats">
        <span><Sparkles size={17} />{progress.xp} XP</span>
        <span><Flame size={17} />{progress.streak}</span>
      </div>
    </header>
  );
}

function HomePage({
  t,
  progress,
  currentLevel,
  totalProgress,
  onStartLesson,
  onNavigate,
  isLessonUnlocked,
}: {
  t: Copy;
  progress: ReturnType<typeof useLearnerProgress>["progress"];
  currentLevel: string;
  totalProgress: number;
  onStartLesson: (storyId: string) => void;
  onNavigate: (page: Page) => void;
  isLessonUnlocked: (index: number) => boolean;
}) {
  const nextStory = stories.find((story, index) => isLessonUnlocked(index) && !progress.completedLessons.includes(story.id)) ?? stories[0];

  return (
    <main className="page-stack compact-home">
      <section className="hero-dashboard">
        <div>
          <span className="eyebrow">{t.cozy}</span>
          <h1>{t.welcome} 🌷</h1>
          <p>{t.welcomeText}</p>
          <button className="primary-button" type="button" onClick={() => onStartLesson(nextStory.id)}>
            {t.continueLearning}
          </button>
        </div>
        <div className="progress-orb" style={{ "--value": `${totalProgress}%` } as React.CSSProperties}>
          <span>{totalProgress}%</span>
          <small>{t.path}</small>
        </div>
      </section>

      <div className="dashboard-grid">
        <MetricCard icon={<Sparkles />} label={t.xp} value={progress.xp.toString()} />
        <MetricCard icon={<Flame />} label={t.streak} value={`${progress.streak}`} />
        <MetricCard icon={<Star />} label={t.level} value={currentLevel} />
      </div>

      <section className="content-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">{t.continueLearning}</span>
            <h2>{nextStory.title}</h2>
          </div>
          <span className="soft-pill">{nextStory.xpReward} XP</span>
        </div>
        <LessonPathCard
          t={t}
          story={nextStory}
          index={stories.findIndex((story) => story.id === nextStory.id)}
          progressValue={progress.lessonProgress[nextStory.id] ?? 0}
          completed={progress.completedLessons.includes(nextStory.id)}
          unlocked
          onStartLesson={onStartLesson}
        />
      </section>

      <section className="content-card home-path-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">{t.lessonPath}</span>
            <h2>{t.lessonPath}</h2>
          </div>
          <button className="text-button" type="button" onClick={() => onNavigate("learn")}>{t.learn}</button>
        </div>
        <div className="mini-path">
          {stories.slice(0, 4).map((story, index) => (
            <button
              key={story.id}
              type="button"
              className={isLessonUnlocked(index) ? "path-node" : "path-node locked"}
              disabled={!isLessonUnlocked(index)}
              onClick={() => onStartLesson(story.id)}
            >
              <span>{progress.completedLessons.includes(story.id) ? "✓" : isLessonUnlocked(index) ? index + 1 : <LockKeyhole size={15} />}</span>
              <strong>{story.title}</strong>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function LearnPage({
  t,
  progress,
  onStartLesson,
  isLessonUnlocked,
}: {
  t: Copy;
  progress: ReturnType<typeof useLearnerProgress>["progress"];
  onStartLesson: (storyId: string) => void;
  isLessonUnlocked: (index: number) => boolean;
}) {
  return (
    <main className="page-stack">
      <PageTitle label={t.learn} title={t.lessonPath} text={t.welcomeText} />
      <div className="lesson-path-list">
        {stories.map((story, index) => (
          <LessonPathCard
            key={story.id}
            t={t}
            story={story}
            index={index}
            progressValue={progress.lessonProgress[story.id] ?? 0}
            completed={progress.completedLessons.includes(story.id)}
            unlocked={isLessonUnlocked(index)}
            onStartLesson={onStartLesson}
          />
        ))}
      </div>
    </main>
  );
}

type VocabularyQuestion = {
  type: "translation" | "english" | "audio";
  prompt: string;
  answer: string;
  options: string[];
  word: VocabularyEntry;
};

function WordsPage({
  t,
  savedWords,
  onToggleSavedWord,
  onSaveTestScore,
}: {
  t: Copy;
  savedWords: string[];
  onToggleSavedWord: (word: string) => void;
  onSaveTestScore: (score: number, total: number, type: string) => void;
}) {
  const allWords = useMemo(() => getVocabularyDatabase(), []);
  const savedVocabulary = allWords.filter((word) => savedWords.includes(word.word));
  const [training, setTraining] = useState<VocabularyQuestion[] | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const speech = useVocabularySpeech();

  const currentQuestion = training?.[questionIndex];

  function startTraining() {
    const questions = buildVocabularyTraining(savedVocabulary, allWords);
    setTraining(questions);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setFinished(false);
  }

  function answerQuestion(answer: string) {
    if (!currentQuestion || selectedAnswer) return;
    setSelectedAnswer(answer);
    if (answer === currentQuestion.answer) {
      setScore((current) => current + 1);
    }
  }

  function moveTrainingNext() {
    if (!training) return;
    if (questionIndex >= training.length - 1) {
      setFinished(true);
      onSaveTestScore(score, training.length, "vocabulary");
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedAnswer(null);
  }

  return (
    <main className="page-stack words-page">
      <PageTitle label={t.wordsPage} title={t.wordsPage} text={t.noSavedWords} />

      <section className="content-card words-hero-card">
        <div>
          <span className="eyebrow">⭐ {t.myWords}</span>
          <h2>{savedVocabulary.length} {t.words}</h2>
          <p>{savedVocabulary.length ? t.trainMyWords : t.noSavedWords}</p>
        </div>
        <button className="primary-button" type="button" disabled={!savedVocabulary.length} onClick={startTraining}>
          {t.trainMyWords}
        </button>
      </section>

      {training && currentQuestion ? (
        <section className="content-card vocab-training-card">
          {finished ? (
            <div className="training-result">
              <span className="celebration-mark">✨</span>
              <h2>{t.trainingResult}</h2>
              <strong>{score}/{training.length}</strong>
              <button className="primary-button full" type="button" onClick={startTraining}>
                {t.trainMyWords}
              </button>
            </div>
          ) : (
            <>
              <div className="section-header">
                <div>
                  <span className="eyebrow">
                    {currentQuestion.type === "translation" ? t.chooseTranslation : currentQuestion.type === "english" ? t.chooseEnglish : t.audioTest}
                  </span>
                  <h2>{currentQuestion.type === "audio" ? t.listenAndChoose : currentQuestion.prompt}</h2>
                </div>
                <span className="soft-pill">{questionIndex + 1}/{training.length}</span>
              </div>
              {currentQuestion.type === "audio" ? (
                <button className="audio-prompt-button" type="button" onClick={() => speech.toggle(currentQuestion.word.word)}>
                  <Volume2 size={24} aria-hidden="true" />
                </button>
              ) : null}
              <div className="choice-list">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    className={selectedAnswer === option ? "choice-button selected" : "choice-button"}
                    type="button"
                    disabled={selectedAnswer !== null}
                    onClick={() => answerQuestion(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {selectedAnswer ? (
                <div className={selectedAnswer === currentQuestion.answer ? "feedback correct" : "feedback wrong"}>
                  {selectedAnswer === currentQuestion.answer ? t.correct : `${t.answer}: ${currentQuestion.answer}`}
                </div>
              ) : null}
              <button className="primary-button full" type="button" disabled={!selectedAnswer} onClick={moveTrainingNext}>
                {questionIndex >= training.length - 1 ? t.finishTraining : t.nextQuestion}
              </button>
            </>
          )}
        </section>
      ) : null}

      <VocabularySection title={`⭐ ${t.myWords}`} words={savedVocabulary} savedWords={savedWords} labels={t} onSpeak={speech.toggle} onToggleSavedWord={onToggleSavedWord} />
      <VocabularySection title={`📖 ${t.allWords}`} words={allWords} savedWords={savedWords} labels={t} onSpeak={speech.toggle} onToggleSavedWord={onToggleSavedWord} />
    </main>
  );
}

function VocabularySection({
  title,
  words,
  savedWords,
  labels,
  onSpeak,
  onToggleSavedWord,
}: {
  title: string;
  words: VocabularyEntry[];
  savedWords: string[];
  labels: Copy;
  onSpeak: (text: string) => void;
  onToggleSavedWord: (word: string) => void;
}) {
  return (
    <section className="content-card">
      <div className="section-header">
        <h2>{title}</h2>
        <span className="soft-pill">{words.length}</span>
      </div>
      {words.length ? (
        <div className="smart-vocab-grid">
          {words.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              saved={savedWords.includes(word.word)}
              labels={{ addWord: labels.addWord, saved: labels.saved }}
              onSpeak={onSpeak}
              onToggleSave={onToggleSavedWord}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>📚</span>
          <p>{labels.noSavedWords}</p>
        </div>
      )}
    </section>
  );
}

function buildVocabularyTraining(savedVocabulary: VocabularyEntry[], allWords: VocabularyEntry[]) {
  return shuffleArray(savedVocabulary)
    .slice(0, 8)
    .map((word, index) => {
      const type = (["translation", "english", "audio"] as const)[index % 3];
      if (type === "translation") {
        const options = answerOptions(
          word.translation,
          allWords.filter((item) => item.word !== word.word).map((item) => item.translation),
        );
        return {
          type,
          prompt: word.word,
          answer: word.translation,
          options,
          word,
        };
      }
      const englishOptions = answerOptions(
        word.word,
        allWords.filter((item) => item.word !== word.word).map((item) => item.word),
      );
      return {
        type,
        prompt: type === "audio" ? word.word : word.translation,
        answer: word.word,
        options: englishOptions,
        word,
      };
    });
}

function answerOptions(answer: string, distractors: string[]) {
  return shuffleArray([answer, ...shuffleArray(distractors).slice(0, 3)]);
}

function shuffleArray<T>(items: T[]) {
  const copyItems = Array.from(new Set(items));
  for (let index = copyItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copyItems[index], copyItems[swapIndex]] = [copyItems[swapIndex], copyItems[index]];
  }
  return copyItems;
}

function useVocabularySpeech() {
  function toggle(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  return { toggle };
}

function StatisticsPage({
  t,
  progress,
  currentLevel,
  totalProgress,
}: {
  t: Copy;
  progress: ReturnType<typeof useLearnerProgress>["progress"];
  currentLevel: string;
  totalProgress: number;
}) {
  return (
    <main className="page-stack">
      <PageTitle label={t.stats} title={t.progress} text={t.welcomeText} />
      <div className="dashboard-grid">
        <MetricCard icon={<Sparkles />} label={t.totalXp} value={progress.xp.toString()} />
        <MetricCard icon={<Flame />} label={t.streak} value={`${progress.streak}`} />
        <MetricCard icon={<Trophy />} label={t.level} value={currentLevel} />
        <MetricCard icon={<CheckCircle2 />} label={t.completedLessons} value={`${progress.completedLessons.length}/${stories.length}`} />
      </div>
      <section className="content-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">{t.progress}</span>
            <h2>{totalProgress}%</h2>
          </div>
        </div>
        <ProgressBar value={totalProgress} />
      </section>
    </main>
  );
}

function SettingsPage({
  t,
  selectedLanguage,
  onSelectLanguage,
}: {
  t: Copy;
  selectedLanguage: NativeLanguage;
  onSelectLanguage: (language: NativeLanguage) => void;
}) {
  return (
    <main className="page-stack">
      <section className="content-card compact-settings">
        <div>
          <span className="eyebrow">{t.settings}</span>
          <h1>{t.languageSettings}</h1>
          <p>{t.changeLanguage}</p>
        </div>
        <div className="language-grid settings-grid">
          {languages.map((language) => (
            <button key={language} className={selectedLanguage === language ? "active" : ""} type="button" onClick={() => onSelectLanguage(language)}>
              <Languages size={20} aria-hidden="true" />
              {language}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function LessonPathCard({
  t,
  story,
  index,
  progressValue,
  completed,
  unlocked,
  onStartLesson,
}: {
  t: Copy;
  story: Story;
  index: number;
  progressValue: number;
  completed: boolean;
  unlocked: boolean;
  onStartLesson: (storyId: string) => void;
}) {
  return (
    <article className={unlocked ? "path-card" : "path-card locked"}>
      <div className="illustration-card lesson-card-illustration" style={{ backgroundColor: story.color }}>
        <span>{story.illustration ?? sceneForStory(story.id)}</span>
      </div>
      <div className="path-card-body">
        <div className="lesson-meta">
          <span>{story.level}</span>
          <span>{story.vocabulary.length} {t.words}</span>
          <span>{story.readingTime}</span>
        </div>
        <h3>{index + 1}. {story.title}</h3>
        <p>{story.description}</p>
        <ProgressBar value={completed ? 100 : progressValue} />
      </div>
      <button className="primary-button" type="button" disabled={!unlocked} onClick={() => onStartLesson(story.id)}>
        {!unlocked ? <><LockKeyhole size={17} />{t.locked}</> : completed ? t.review : progressValue > 0 ? t.continueLearning : t.start}
      </button>
    </article>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function PageTitle({ label, title, text }: { label: string; title: string; text: string }) {
  return (
    <section className="page-title">
      <span className="eyebrow">{label}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function navItems(t: Copy): Array<{ page: Page; label: string; short: string; icon: ReactNode }> {
  return [
    { page: "home", label: t.home, short: t.home, icon: <Home size={20} /> },
    { page: "learn", label: t.learn, short: t.learn, icon: <GraduationCap size={20} /> },
    { page: "words", label: t.wordsPage, short: t.wordsPage, icon: <BookOpen size={20} /> },
    { page: "stats", label: t.stats, short: t.stats, icon: <BarChart3 size={20} /> },
    { page: "settings", label: t.settings, short: t.settings, icon: <Settings size={20} /> },
  ];
}

function translateLevel(level: string, language: NativeLanguage) {
  if (language === "English") return level;
  if (level.includes("B1")) return "B1 Исследователь";
  if (level.includes("A2")) return "A2 Ученик";
  return "A1 Старт";
}

function sceneForStory(storyId: string) {
  const scenes: Record<string, string> = {
    "morning-routine": "🛏️",
    "beach-day": "🏖️",
    "my-first-trip": "🚉",
    "lost-phone": "📱",
    "new-job": "🏢",
    "surprise-gift": "🎁",
  };

  return scenes[storyId] ?? "📚";
}

export default App;
