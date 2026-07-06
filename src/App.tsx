import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Home,
  Languages,
  Leaf,
  LockKeyhole,
  Settings,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { LessonScreen } from "./components/LessonScreen";
import { ProgressBar } from "./components/ProgressBar";
import { WordCard } from "./components/WordCard";
import { getStoryById, stories } from "./data/stories";
import { getAllVocabulary as getVocabularyDatabase, getVocabularyByStory, type VocabularyEntry } from "./data/vocabulary";
import { useLearnerProgress } from "./hooks/useLearnerProgress";
import type { Level, NativeLanguage, Story } from "./types";

type Page = "home" | "learn" | "words" | "training" | "stats" | "settings";

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
    training: "Тренировка",
    profile: "Профиль",
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
    correctAnswer: "Правильный ответ",
    sentenceTranslation: "Перевод",
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
    practiceVocabulary: "Тренируйте свой словарь",
    totalVocabulary: "Всего слов",
    savedWordsCount: "Сохранено слов",
    startTraining: "Начать тренировку",
    quickTraining: "Быстрая тренировка",
    standardTraining: "Стандартная тренировка",
    bigTraining: "Большая тренировка",
    questionsCount: "вопросов",
    matchPairs: "Соедини пары",
    audioChooseWord: "Аудио: выбери английское слово",
    audioChooseTranslation: "Аудио: выбери перевод",
    audioChooseSentenceTranslation: "Аудио: выбери перевод предложения",
    buildSentence: "Собери предложение",
    trainingComplete: "🎉 Тренировка завершена",
    score: "Счёт",
    xpEarned: "XP получено",
    tryAgain: "Попробовать снова",
    returnToTraining: "Вернуться к тренировке",
    noTrainingTasks: "Пока нет заданий для этой тренировки",
    backToTrainings: "Вернуться к тренировкам",
    noTrainingLevelTasks: "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0437\u0430\u0434\u0430\u043d\u0438\u0439 \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0443\u0440\u043e\u0432\u043d\u044f",
    userLevelUnknown: "\u0422\u0432\u043e\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c: \u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d",
    userLevelTitle: "\u0422\u0432\u043e\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c",
    levelCardDescription: "\u041f\u0440\u043e\u0439\u0434\u0438 \u0431\u044b\u0441\u0442\u0440\u044b\u0439 \u0442\u0435\u0441\u0442 — \u043c\u044b \u043f\u043e\u0434\u0431\u0435\u0440\u0451\u043c \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438 \u043f\u043e\u0434 \u0442\u0435\u0431\u044f.",
    levelCardSavedDescription: "\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438 \u0431\u0443\u0434\u0443\u0442 \u043f\u043e\u0434\u0431\u0438\u0440\u0430\u0442\u044c\u0441\u044f \u043f\u043e\u0434 \u0442\u0432\u043e\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c.",
    defineLevel: "\u041e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0443\u0440\u043e\u0432\u0435\u043d\u044c",
    retakeLevelTest: "\u041f\u0440\u043e\u0439\u0442\u0438 \u0442\u0435\u0441\u0442 \u0437\u0430\u043d\u043e\u0432\u043e",
    levelTestTitle: "\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u0442\u0435\u0441\u0442 \u0443\u0440\u043e\u0432\u043d\u044f",
    questionProgress: "\u0412\u043e\u043f\u0440\u043e\u0441",
    of: "\u0438\u0437",
    startTrainingAfterTest: "\u041d\u0430\u0447\u0430\u0442\u044c \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0443",
    levelResultA1: "\u0422\u044b \u0437\u043d\u0430\u0435\u0448\u044c \u0431\u0430\u0437\u043e\u0432\u044b\u0435 \u0441\u043b\u043e\u0432\u0430 \u0438 \u043f\u0440\u043e\u0441\u0442\u044b\u0435 \u0444\u0440\u0430\u0437\u044b. \u041d\u0430\u0447\u043d\u0451\u043c \u0441 \u043b\u0451\u0433\u043a\u0438\u0445 \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043e\u043a.",
    levelResultA2: "\u0422\u044b \u0443\u0436\u0435 \u043f\u043e\u043d\u0438\u043c\u0430\u0435\u0448\u044c \u043f\u0440\u043e\u0441\u0442\u044b\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f. \u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438 \u0431\u0443\u0434\u0443\u0442 \u0447\u0443\u0442\u044c \u0441\u043b\u043e\u0436\u043d\u0435\u0435.",
    levelResultB1: "\u0423 \u0442\u0435\u0431\u044f \u0445\u043e\u0440\u043e\u0448\u0438\u0439 \u0431\u0430\u0437\u043e\u0432\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c. \u0411\u0443\u0434\u0435\u043c \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0431\u043e\u043b\u0435\u0435 \u0434\u043b\u0438\u043d\u043d\u044b\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f.",
    levelResultB2: "\u0423 \u0442\u0435\u0431\u044f \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u0432\u044b\u0448\u0435 \u0441\u0440\u0435\u0434\u043d\u0435\u0433\u043e. \u0421\u0435\u0439\u0447\u0430\u0441 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438 \u0434\u043e B1, \u043d\u043e \u043c\u044b \u0431\u0443\u0434\u0435\u043c \u043f\u043e\u0434\u0431\u0438\u0440\u0430\u0442\u044c \u0441\u0430\u043c\u044b\u0435 \u0441\u043b\u043e\u0436\u043d\u044b\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f.",
    levelResultC1: "\u0423 \u0442\u0435\u0431\u044f \u043f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c. \u0421\u0435\u0439\u0447\u0430\u0441 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438 \u0434\u043e B1, \u043d\u043e \u043c\u044b \u0431\u0443\u0434\u0435\u043c \u043f\u043e\u0434\u0431\u0438\u0440\u0430\u0442\u044c \u0441\u0430\u043c\u044b\u0435 \u0441\u043b\u043e\u0436\u043d\u044b\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f.",
    chooseLevel: "\u0412\u044b\u0431\u0435\u0440\u0438 \u0443\u0440\u043e\u0432\u0435\u043d\u044c",
    backToCategories: "\u041d\u0430\u0437\u0430\u0434 \u043a \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430\u043c",
    easyLevel: "\u043b\u0435\u0433\u043a\u043e",
    mediumLevel: "\u0441\u0440\u0435\u0434\u043d\u0435",
    harderLevel: "\u0441\u043b\u043e\u0436\u043d\u0435\u0435",
    soon: "\u0441\u043a\u043e\u0440\u043e",
    audioTrainingName: "Аудио тренировка",
    wordsTrainingName: "Тренировка слов",
    grammarTrainingName: "Грамматическая тренировка",
    audioTrainingLabel: "АУДИО",
    wordsTrainingLabel: "СЛОВА",
    grammarTrainingLabel: "ГРАММАТИКА",
    trainingPrompt: "Что потренируем сегодня?",
    audioCategory: "🎧 Аудио",
    audioCategoryDescription: "Учись понимать слова и предложения на слух",
    wordsCategory: "📚 Слова",
    wordsCategoryDescription: "Повторяй слова из историй",
    grammarCategory: "✍️ Грамматика",
    grammarCategoryDescription: "Собирай предложения и тренируй структуру языка",
    audioTraining: "Аудио тренировка",
    vocabTrainer: "Словарный тренажёр",
    grammarTasks: "Грамматика / задания",
  },
  English: {
    appName: "English Stories",
    cozy: "cozy learning",
    chooseLanguage: "Choose your native language",
    chooseHelp: "Interface text and translations will use this language.",
    home: "Home",
    learn: "Learn",
    wordsPage: "Words",
    training: "Training",
    profile: "Profile",
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
    correctAnswer: "Correct answer",
    sentenceTranslation: "Translation",
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
    practiceVocabulary: "Practice your vocabulary",
    totalVocabulary: "Total vocabulary",
    savedWordsCount: "Saved words",
    startTraining: "Start Training",
    quickTraining: "Quick Training",
    standardTraining: "Standard Training",
    bigTraining: "Big Training",
    questionsCount: "questions",
    matchPairs: "Match Pairs",
    audioChooseWord: "Audio: choose English word",
    audioChooseTranslation: "Audio: choose translation",
    audioChooseSentenceTranslation: "Audio: choose sentence translation",
    buildSentence: "Build a Sentence",
    trainingComplete: "🎉 Training Complete",
    score: "Score",
    xpEarned: "XP earned",
    tryAgain: "Try Again",
    returnToTraining: "Return to Training",
    noTrainingTasks: "There are no tasks for this training yet",
    backToTrainings: "Back to trainings",
    noTrainingLevelTasks: "There are no tasks for this level yet",
    userLevelUnknown: "Your level: not defined",
    userLevelTitle: "Your level",
    levelCardDescription: "Take a quick test and we will match training to you.",
    levelCardSavedDescription: "Training will be matched to your level.",
    defineLevel: "Define level",
    retakeLevelTest: "Retake test",
    levelTestTitle: "Quick level test",
    questionProgress: "Question",
    of: "of",
    startTrainingAfterTest: "Start training",
    levelResultA1: "You know basic words and simple phrases. We will start with easier training.",
    levelResultA2: "You already understand simple sentences. Training will be a little harder.",
    levelResultB1: "You have a good basic level. We will practice longer sentences.",
    levelResultB2: "Your level is above intermediate. Training is currently available up to B1, so we will use the hardest available tasks.",
    levelResultC1: "You have an advanced level. Training is currently available up to B1, so we will use the hardest available tasks.",
    chooseLevel: "Choose level",
    backToCategories: "Back to trainings",
    easyLevel: "easy",
    mediumLevel: "medium",
    harderLevel: "harder",
    soon: "soon",
    audioTrainingName: "Audio training",
    wordsTrainingName: "Words training",
    grammarTrainingName: "Grammar training",
    audioTrainingLabel: "AUDIO",
    wordsTrainingLabel: "WORDS",
    grammarTrainingLabel: "GRAMMAR",
    trainingPrompt: "What shall we practice today?",
    audioCategory: "🎧 Audio",
    audioCategoryDescription: "Learn to understand words and sentences by ear",
    wordsCategory: "📚 Words",
    wordsCategoryDescription: "Review words from stories",
    grammarCategory: "✍️ Grammar",
    grammarCategoryDescription: "Build sentences and practice language structure",
    audioTraining: "Audio training",
    vocabTrainer: "Vocabulary trainer",
    grammarTasks: "Grammar / tasks",
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
            {page === "training" ? (
              <TrainingPage
                t={t}
                savedWords={progress.savedWords}
                completedLessons={progress.completedLessons}
                onSaveTestScore={saveTestScore}
              />
            ) : null}
            {page === "stats" ? (
              <StatisticsPage t={t} progress={progress} currentLevel={currentLevelLabel} totalProgress={totalProgress} />
            ) : null}
            {page === "settings" ? (
              <SettingsPage
                t={t}
                selectedLanguage={language}
                onSelectLanguage={selectLanguage}
                progress={progress}
                currentLevel={currentLevelLabel}
                totalProgress={totalProgress}
                onNavigate={navigate}
              />
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
  const items: Array<{ page: Page; label: string; icon: ReactNode; activePages?: Page[] }> = [
    { page: "home", label: t.home, icon: <Home size={20} /> },
    { page: "learn", label: t.learn, icon: <BookOpen size={20} /> },
    { page: "training", label: t.training, icon: <Target size={20} /> },
    { page: "settings", label: t.profile, icon: <Settings size={20} />, activePages: ["settings", "words", "stats"] },
  ];

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const isActive = item.activePages ? item.activePages.includes(page) : page === item.page;

        return (
          <button key={item.page} className={isActive ? "active" : ""} type="button" onClick={() => onNavigate(item.page)}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
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
        <div className="hero-copy">
          <span className="eyebrow">{t.cozy}</span>
          <h1>{t.welcome}</h1>
          <p>{t.welcomeText}</p>
          <button className="primary-button" type="button" onClick={() => onStartLesson(nextStory.id)}>
            {t.continueLearning}
          </button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-book-card">
            <BookOpen size={58} strokeWidth={1.7} />
            <span className="hero-leaf hero-leaf-one"><Leaf size={22} /></span>
            <span className="hero-leaf hero-leaf-two"><Leaf size={18} /></span>
          </div>
          <div className="hero-progress-chip">
            <strong>{totalProgress}%</strong>
            <span>{t.path}</span>
          </div>
        </div>
      </section>

      <div className="dashboard-grid home-stats-grid">
        <MetricCard icon={<Sparkles />} label={t.xp} value={progress.xp.toString()} />
        <MetricCard icon={<Flame />} label={t.streak} value={`${progress.streak}`} />
        <MetricCard icon={<Star />} label={t.level} value={currentLevel} />
      </div>

      <section className="content-card home-continue-section">
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

      <section className="home-training-preview">
        <button className="training-preview-card" type="button" onClick={() => onNavigate("training")}>
          <span><Volume2 size={22} /></span>
          <strong>{t.audioTraining}</strong>
        </button>
        <button className="training-preview-card" type="button" onClick={() => onNavigate("training")}>
          <span><BookOpen size={22} /></span>
          <strong>{t.vocabTrainer}</strong>
        </button>
        <button className="training-preview-card" type="button" onClick={() => onNavigate("training")}>
          <span><GraduationCap size={22} /></span>
          <strong>{t.grammarTasks}</strong>
        </button>
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

      <VocabularySection
        title={`⭐ ${t.myWords}`}
        words={savedVocabulary}
        savedWords={savedWords}
        labels={t}
        defaultOpen
        onSpeak={speech.toggle}
        onToggleSavedWord={onToggleSavedWord}
      />
      <VocabularySection
        title={`📚 ${t.allWords}`}
        words={allWords}
        savedWords={savedWords}
        labels={t}
        defaultOpen={false}
        onSpeak={speech.toggle}
        onToggleSavedWord={onToggleSavedWord}
      />
    </main>
  );
}

function VocabularySection({
  title,
  words,
  savedWords,
  labels,
  defaultOpen = true,
  onSpeak,
  onToggleSavedWord,
}: {
  title: string;
  words: VocabularyEntry[];
  savedWords: string[];
  labels: Copy;
  defaultOpen?: boolean;
  onSpeak: (text: string) => void;
  onToggleSavedWord: (word: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="content-card vocabulary-section-card">
      <button className="vocabulary-section-toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
        <span>{title} ({words.length})</span>
        <strong>{isOpen ? "▲" : "▶"}</strong>
      </button>
      {isOpen ? (
        words.length ? (
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
        )
      ) : null}
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

function derangedTranslations(words: VocabularyEntry[]) {
  const original = words.map((word) => word.translation);
  if (original.length < 2) return original;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = shuffleArray(original);
    if (shuffled.every((translation, index) => translation !== original[index])) return shuffled;
  }

  return [...original.slice(1), original[0]];
}

function shuffleArray<T>(items: T[]) {
  const copyItems = Array.from(new Set(items));
  for (let index = copyItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copyItems[index], copyItems[swapIndex]] = [copyItems[swapIndex], copyItems[index]];
  }
  return copyItems;
}

function shuffleWithRepeats<T>(items: T[]) {
  const copyItems = [...items];
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

type TrainingQuestion =
  | {
      id: string;
      type: "match";
      words: VocabularyEntry[];
      translations: string[];
    }
  | {
      id: string;
      type: "translation" | "english" | "audioEnglish" | "audioTranslation" | "audioSentenceTranslation" | "buildSentence";
      word: VocabularyEntry;
      prompt: string;
      answer: string;
      options: string[];
      targetSentence?: string;
    };

type TrainingCategory = {
  id: "audio" | "words" | "grammar";
  title: string;
  description: string;
  label: string;
  sessionName: string;
};

type EnglishLevel = Level | "B2" | "C1";

type PlacementQuestion = {
  id: string;
  level: EnglishLevel;
  question: string;
  options: string[];
  answer: string;
};

const USER_ENGLISH_LEVEL_KEY = "userEnglishLevel";

const grammarSentences = [
  { en: "I open the door.", ru: "Я открываю дверь." },
  { en: "She has a small dog.", ru: "У неё есть маленькая собака." },
  { en: "We are in the room.", ru: "Мы в комнате." },
  { en: "He likes this book.", ru: "Ему нравится эта книга." },
  { en: "The room was dark and quiet.", ru: "Комната была тёмной и тихой." },
  { en: "Emma drinks water.", ru: "Эмма пьёт воду." },
  { en: "Leo goes to school.", ru: "Лео идёт в школу." },
  { en: "Sara reads a story.", ru: "Сара читает историю." },
  { en: "Nikita buys fresh bread.", ru: "Никита покупает свежий хлеб." },
  { en: "My friend lives next door.", ru: "Мой друг живёт по соседству." },
  { en: "The lesson starts at nine.", ru: "Урок начинается в девять." },
  { en: "I have a new bicycle.", ru: "У меня есть новый велосипед." },
  { en: "We walk in the park.", ru: "Мы гуляем в парке." },
  { en: "She is nervous today.", ru: "Она сегодня нервничает." },
  { en: "They wait at the station.", ru: "Они ждут на станции." },
  { en: "The phone is on the table.", ru: "Телефон на столе." },
  { en: "I make breakfast every morning.", ru: "Я готовлю завтрак каждое утро." },
  { en: "He closes the window.", ru: "Он закрывает окно." },
  { en: "We need two tickets.", ru: "Нам нужны два билета." },
  { en: "The beach is warm and sunny.", ru: "На пляже тепло и солнечно." },
];

const placementQuestions: PlacementQuestion[] = [
  {
    id: "a1-hello",
    level: "A1",
    question: "Выбери правильный перевод: Hello",
    options: ["Привет", "Спасибо", "Пока", "Пожалуйста"],
    answer: "Привет",
  },
  {
    id: "a1-like-tea",
    level: "A1",
    question: "Как сказать по-английски: Я люблю чай.",
    options: ["I like tea.", "I am tea.", "I have tea?", "I go tea."],
    answer: "I like tea.",
  },
  {
    id: "a1-small-room",
    level: "A1",
    question: "Выбери правильное слово: This room is ___.",
    options: ["small", "quickly", "yesterday", "swim"],
    answer: "small",
  },
  {
    id: "a2-breakfast",
    level: "A2",
    question: "Что значит: She is making breakfast now.",
    options: ["Она сейчас готовит завтрак.", "Она уже поужинала.", "Она покупает билет.", "Она закрывает окно."],
    answer: "Она сейчас готовит завтрак.",
  },
  {
    id: "a2-past",
    level: "A2",
    question: "Выбери правильную форму: Yesterday we ___ to the park.",
    options: ["went", "go", "goes", "going"],
    answer: "went",
  },
  {
    id: "a2-because",
    level: "A2",
    question: "Какое предложение правильное?",
    options: ["I stayed home because it was raining.", "I stayed home because it raining.", "I stay home yesterday because rain.", "I stayed home because rain is."],
    answer: "I stayed home because it was raining.",
  },
  {
    id: "b1-message",
    level: "B1",
    question: "Что значит: The message surprised her because it arrived late at night.",
    options: ["Сообщение удивило её, потому что пришло поздно ночью.", "Она отправила сообщение утром.", "Сообщение было коротким и простым.", "Она потеряла телефон ночью."],
    answer: "Сообщение удивило её, потому что пришло поздно ночью.",
  },
  {
    id: "b1-condition",
    level: "B1",
    question: "Выбери правильный вариант: If I have time tomorrow, I ___ you.",
    options: ["will call", "called", "calling", "call yesterday"],
    answer: "will call",
  },
  {
    id: "b2-meeting",
    level: "B2",
    question: "Выбери самое естественное предложение.",
    options: ["Although the meeting was long, it helped us make a clear decision.", "Although the meeting long, it helped make clear decision.", "The meeting was long although helped us decision.", "Although long meeting, decision clear helped us."],
    answer: "Although the meeting was long, it helped us make a clear decision.",
  },
  {
    id: "c1-nuance",
    level: "C1",
    question: "Какой вариант лучше передаёт смысл: She barely noticed the noise.",
    options: ["Она почти не заметила шум.", "Она громко услышала шум.", "Она специально создала шум.", "Она часто слушала шум."],
    answer: "Она почти не заметила шум.",
  },
];

function TrainingPage({
  t,
  savedWords,
  completedLessons,
  onSaveTestScore,
}: {
  t: Copy;
  savedWords: string[];
  completedLessons: string[];
  onSaveTestScore: (score: number, total: number, type: string) => void;
}) {
  const allWords = useMemo(() => getVocabularyDatabase(), []);
  const savedVocabulary = allWords.filter((word) => savedWords.includes(word.word));
  const completedVocabulary = useMemo(
    () => {
      const words = completedLessons.reduce<VocabularyEntry[]>((items, storyId) => {
        getVocabularyByStory(storyId).forEach((word) => items.push(word));
        return items;
      }, []);

      return Array.from(new Map(words.map((word) => [word.word, word])).values());
    },
    [completedLessons],
  );
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [levelTestOpen, setLevelTestOpen] = useState(false);
  const [userEnglishLevel, setUserEnglishLevel] = useState<EnglishLevel | null>(() => readUserEnglishLevel());
  const [placementIndex, setPlacementIndex] = useState(0);
  const [placementScore, setPlacementScore] = useState(0);
  const [placementResult, setPlacementResult] = useState<EnglishLevel | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [builtWords, setBuiltWords] = useState<string[]>([]);
  const speech = useVocabularySpeech();

  const currentQuestion = questions[questionIndex];
  const currentPlacementQuestion = placementQuestions[placementIndex];
  const trainingPool = savedVocabulary.length ? savedVocabulary : completedVocabulary.length ? completedVocabulary : allWords;
  const progressValue = questions.length ? Math.round(((questionIndex + (finished ? 1 : 0)) / questions.length) * 100) : 0;
  const trainingCategories: TrainingCategory[] = [
    { id: "audio", title: t.audioCategory, description: t.audioCategoryDescription, label: t.audioTrainingLabel, sessionName: t.audioTrainingName },
    { id: "words", title: t.wordsCategory, description: t.wordsCategoryDescription, label: t.wordsTrainingLabel, sessionName: t.wordsTrainingName },
    { id: "grammar", title: t.grammarCategory, description: t.grammarCategoryDescription, label: t.grammarTrainingLabel, sessionName: t.grammarTrainingName },
  ];

  const defaultTrainingCount = 5;

  function chooseTrainingCategory(category: TrainingCategory) {
    startTraining(trainingLevelForUser(userEnglishLevel), category);
  }

  function startTraining(level: Level, category = selectedCategory ?? trainingCategories[1]) {
    setSelectedLevel(level);
    setSelectedCategory(category);
    setTrainingStarted(true);
    try {
      setQuestions(buildTrainingSession(trainingPool, allWords, defaultTrainingCount, category.id, level));
    } catch (error) {
      console.error("Training session could not be generated", error);
      setQuestions([]);
    }
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setFinished(false);
    setSelectedLeft(null);
    setMatchedPairs({});
    setBuiltWords([]);
  }

  function openPlacementTest() {
    setLevelTestOpen(true);
    setPlacementIndex(0);
    setPlacementScore(0);
    setPlacementResult(null);
    setQuestions([]);
    setSelectedCategory(null);
    setTrainingStarted(false);
    setFinished(false);
    resetQuestionState();
  }

  function answerPlacementQuestion(answer: string) {
    const isCorrect = currentPlacementQuestion?.answer === answer;
    const nextScore = placementScore + (isCorrect ? 1 : 0);

    if (placementIndex >= placementQuestions.length - 1) {
      const result = placementLevelFromScore(nextScore);
      setPlacementScore(nextScore);
      setPlacementResult(result);
      setUserEnglishLevel(result);
      saveUserEnglishLevel(result);
      return;
    }

    setPlacementScore(nextScore);
    setPlacementIndex((current) => current + 1);
  }

  function closePlacementTest() {
    setLevelTestOpen(false);
    setPlacementIndex(0);
    setPlacementScore(0);
    setPlacementResult(null);
  }

  function resetQuestionState() {
    setSelectedAnswer(null);
    setAnswered(false);
    setSelectedLeft(null);
    setMatchedPairs({});
    setBuiltWords([]);
  }

  function markAnswer(isCorrect: boolean) {
    if (answered) return;
    setAnswered(true);
    if (isCorrect) setScore((current) => current + 1);
  }

  function nextTrainingQuestion() {
    if (questionIndex >= questions.length - 1) {
      setFinished(true);
      onSaveTestScore(score, questions.length, "training");
      return;
    }

    setQuestionIndex((current) => current + 1);
    resetQuestionState();
  }

  function returnToTraining() {
    setQuestions([]);
    setSelectedCategory(null);
    setSelectedLevel(null);
    setLevelTestOpen(false);
    setPlacementIndex(0);
    setPlacementScore(0);
    setPlacementResult(null);
    setTrainingStarted(false);
    setQuestionIndex(0);
    setFinished(false);
    resetQuestionState();
  }

  function chooseMatchRight(translation: string) {
    if (!selectedLeft || currentQuestion?.type !== "match" || matchedPairs[selectedLeft]) return;
    const selectedWord = currentQuestion.words.find((word) => word.word === selectedLeft);
    if (!selectedWord) return;

    const nextMatched = selectedWord.translation === translation ? { ...matchedPairs, [selectedLeft]: translation } : matchedPairs;
    setMatchedPairs(nextMatched);
    setSelectedLeft(null);

    if (Object.keys(nextMatched).length === currentQuestion.words.length) {
      markAnswer(true);
    }
  }

  function chooseTrainingAnswer(answer: string) {
    if (!currentQuestion || currentQuestion.type === "match" || answered) return;
    setSelectedAnswer(answer);
    markAnswer(answer === currentQuestion.answer);
  }

  function addBuildWord(word: string) {
    if (!currentQuestion || currentQuestion.type !== "buildSentence" || answered) return;
    setBuiltWords((current) => [...current, word]);
  }

  function checkBuiltSentence() {
    if (!currentQuestion || currentQuestion.type !== "buildSentence") return;
    setSelectedAnswer(builtWords.join(" "));
    markAnswer(builtWords.join(" ") === currentQuestion.answer);
  }

  return (
    <main className="page-stack training-page">
      <PageTitle label={`🎯 ${t.training}`} title={t.trainingPrompt} text={t.practiceVocabulary} />

      {!levelTestOpen && !trainingStarted && !questions.length && !finished ? (
        <>
          <section className="content-card training-level-card">
            <div>
              <span className="eyebrow">{t.level}</span>
              <h2>{userEnglishLevel ? `${t.userLevelTitle}: ${userEnglishLevel}` : t.userLevelUnknown}</h2>
              <p>{userEnglishLevel ? t.levelCardSavedDescription : t.levelCardDescription}</p>
            </div>
            <button className="training-primary-button" type="button" onClick={openPlacementTest}>
              {userEnglishLevel ? t.retakeLevelTest : t.defineLevel}
            </button>
          </section>
          <section className="content-card training-start-card">
            <div className="training-start-copy">
              <span className="training-orb">🎯</span>
              <div>
                <span className="eyebrow">{t.training}</span>
                <h2>{t.trainingPrompt}</h2>
                <p>{savedVocabulary.length ? t.trainMyWords : t.noSavedWords}</p>
              </div>
            </div>
            <div className="training-stats-grid">
              <MetricCard icon={<BookOpen />} label={t.totalVocabulary} value={allWords.length.toString()} />
              <MetricCard icon={<Star />} label={t.savedWordsCount} value={savedVocabulary.length.toString()} />
            </div>
            <div className="training-category-grid">
              {trainingCategories.map((category) => (
                <button
                  key={category.id}
                  className="training-category-card"
                  type="button"
                  onClick={() => chooseTrainingCategory(category)}
                >
                  <strong>{category.title}</strong>
                  <small>{category.description}</small>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {levelTestOpen ? (
        <section className="content-card training-level-test-card">
          {placementResult ? (
            <>
              <span className="celebration-mark">🎓</span>
              <h2>{`${t.userLevelTitle}: ${placementResult}`}</h2>
              <p>{levelResultDescription(placementResult, t)}</p>
              <div className="level-test-actions">
                <button className="training-primary-button full" type="button" onClick={closePlacementTest}>{t.startTrainingAfterTest}</button>
                <button className="ghost-action" type="button" onClick={returnToTraining}>{t.backToTrainings}</button>
              </div>
            </>
          ) : (
            <>
              <div className="training-selection-header">
                <span className="eyebrow">{`${t.questionProgress} ${placementIndex + 1} ${t.of} ${placementQuestions.length}`}</span>
                <h2>{t.levelTestTitle}</h2>
              </div>
              <ProgressBar value={Math.round(((placementIndex + 1) / placementQuestions.length) * 100)} label={`${t.questionProgress} ${placementIndex + 1}/${placementQuestions.length}`} />
              <div className="level-test-question">
                <h3>{currentPlacementQuestion.question}</h3>
                <div className="choice-list">
                  {currentPlacementQuestion.options.map((option) => (
                    <button className="choice-button" type="button" key={option} onClick={() => answerPlacementQuestion(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <button className="ghost-action" type="button" onClick={returnToTraining}>{t.backToTrainings}</button>
            </>
          )}
        </section>
      ) : null}

      {trainingStarted && !questions.length && !finished ? (
        <section className="content-card training-complete-card">
          <span className="celebration-mark">🎯</span>
          <h2>{selectedLevel ? t.noTrainingLevelTasks : t.noTrainingTasks}</h2>
          <button className="ghost-action" type="button" onClick={returnToTraining}>{t.backToTrainings}</button>
        </section>
      ) : null}

      {currentQuestion && !finished ? (
        <section className="content-card training-card">
          <ProgressBar value={progressValue} label={`${selectedCategory?.sessionName ?? t.wordsTrainingName} · ${selectedLevel ?? "A1"} · ${questionIndex + 1}/${questions.length}`} />
          <TrainingQuestionView
            question={currentQuestion}
            t={t}
            categoryLabel={selectedCategory?.label ?? t.wordsTrainingLabel}
            speech={speech.toggle}
            selectedAnswer={selectedAnswer}
            answered={answered}
            selectedLeft={selectedLeft}
            matchedPairs={matchedPairs}
            builtWords={builtWords}
            onSelectLeft={setSelectedLeft}
            onSelectRight={chooseMatchRight}
            onChooseAnswer={chooseTrainingAnswer}
            onBuildWord={addBuildWord}
            onRemoveBuildWord={(index) => setBuiltWords((current) => current.filter((_, currentIndex) => currentIndex !== index))}
            onCheckBuiltSentence={checkBuiltSentence}
          />
          {answered ? (
            <div className={isCurrentTrainingAnswerCorrect(currentQuestion, selectedAnswer, matchedPairs) ? "feedback correct" : "feedback wrong"}>
              {currentQuestion.type === "buildSentence" ? (
                <>
                  <span>
                    <strong>{t.correctAnswer}:</strong> {trainingAnswerText(currentQuestion)}
                  </span>
                  <span className="feedback-translation">
                    <strong>{t.sentenceTranslation}:</strong> {currentQuestion.prompt}
                  </span>
                </>
              ) : isCurrentTrainingAnswerCorrect(currentQuestion, selectedAnswer, matchedPairs) ? (
                t.correct
              ) : (
                `${t.answer}: ${trainingAnswerText(currentQuestion)}`
              )}
            </div>
          ) : null}
          <button className="training-primary-button full" type="button" disabled={!answered} onClick={nextTrainingQuestion}>
            {questionIndex >= questions.length - 1 ? t.finishTraining : t.nextQuestion}
          </button>
        </section>
      ) : null}

      {finished ? (
        <section className="content-card training-complete-card">
          <span className="celebration-mark">🎉</span>
          <h2>{t.trainingComplete}</h2>
          <div className="reward-grid">
            <div>
              <span>{t.score}</span>
              <strong>{score} / {questions.length}</strong>
            </div>
            <div>
              <span>{t.xpEarned}</span>
              <strong>+{score * 3} XP</strong>
            </div>
          </div>
          <button className="training-primary-button full" type="button" onClick={() => startTraining(selectedLevel ?? "A1", selectedCategory ?? trainingCategories[1])}>{t.tryAgain}</button>
          <button className="ghost-action" type="button" onClick={returnToTraining}>{t.returnToTraining}</button>
        </section>
      ) : null}
    </main>
  );
}

function TrainingQuestionView({
  question,
  t,
  categoryLabel,
  speech,
  selectedAnswer,
  answered,
  selectedLeft,
  matchedPairs,
  builtWords,
  onSelectLeft,
  onSelectRight,
  onChooseAnswer,
  onBuildWord,
  onRemoveBuildWord,
  onCheckBuiltSentence,
}: {
  question: TrainingQuestion;
  t: Copy;
  categoryLabel: string;
  speech: (text: string) => void;
  selectedAnswer: string | null;
  answered: boolean;
  selectedLeft: string | null;
  matchedPairs: Record<string, string>;
  builtWords: string[];
  onSelectLeft: (word: string | null) => void;
  onSelectRight: (translation: string) => void;
  onChooseAnswer: (answer: string) => void;
  onBuildWord: (word: string) => void;
  onRemoveBuildWord: (index: number) => void;
  onCheckBuiltSentence: () => void;
}) {
  if (question.type === "match") {
    return (
      <div className="training-question-stack" data-training-type="match">
        <span className="eyebrow">{categoryLabel}</span>
        <h2>{t.matchPairs}</h2>
        <div className="match-grid">
          <div className="match-column">
            {question.words.map((word) => (
              <button
                key={word.word}
                className={selectedLeft === word.word ? "match-button selected" : matchedPairs[word.word] ? "match-button matched" : "match-button"}
                type="button"
                disabled={Boolean(matchedPairs[word.word])}
                onClick={() => onSelectLeft(word.word)}
              >
                {word.word}
              </button>
            ))}
          </div>
          <div className="match-column">
            {question.translations.map((translation) => (
              <button
                key={translation}
                className={Object.values(matchedPairs).includes(translation) ? "match-button matched" : "match-button"}
                type="button"
                disabled={Object.values(matchedPairs).includes(translation)}
                onClick={() => onSelectRight(translation)}
              >
                {translation}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "buildSentence") {
    return (
      <div className="training-question-stack" data-training-type="build">
        <span className="eyebrow">{categoryLabel}</span>
        <h2>{t.buildSentence}</h2>
        <p className="sentence-translation-prompt">{question.prompt}</p>
        <div className="sentence-build-zone">
          {builtWords.length ? (
            builtWords.map((word, index) => (
              <button key={`${word}-${index}`} className="word-chip" type="button" disabled={answered} onClick={() => onRemoveBuildWord(index)}>
                {word}
              </button>
            ))
          ) : (
            <span>{t.buildSentence}</span>
          )}
        </div>
        <div className="build-word-grid">
          {question.options.map((word, index) => (
            <button
              key={`${word}-${index}`}
              className="choice-button"
              type="button"
              disabled={answered || builtWords.filter((item) => item === word).length >= question.options.filter((item) => item === word).length}
              onClick={() => onBuildWord(word)}
            >
              {word}
            </button>
          ))}
        </div>
        <button className="ghost-action" type="button" disabled={answered || builtWords.length !== question.options.length} onClick={onCheckBuiltSentence}>
          {t.check}
        </button>
      </div>
    );
  }

  const title = question.type === "translation"
    ? t.chooseTranslation
    : question.type === "english"
      ? t.chooseEnglish
      : question.type === "audioEnglish"
        ? t.audioChooseWord
        : question.type === "audioTranslation"
          ? t.audioChooseTranslation
          : t.audioChooseSentenceTranslation;
  const isAudioQuestion = question.type === "audioEnglish" || question.type === "audioTranslation" || question.type === "audioSentenceTranslation";
  const audioText = question.type === "audioSentenceTranslation" ? question.targetSentence ?? question.prompt : question.word.word;

  return (
    <div className="training-question-stack" data-training-type={question.type}>
      <span className="eyebrow">{categoryLabel}</span>
      <h2>{isAudioQuestion ? t.listenAndChoose : question.prompt}</h2>
      {isAudioQuestion ? (
        <button className="audio-prompt-button" type="button" onClick={() => speech(audioText)}>
          <Volume2 size={26} aria-hidden="true" />
        </button>
      ) : null}
      <div className="choice-list">
        {question.options.map((option) => (
          <button
            key={option}
            className={selectedAnswer === option ? "choice-button selected" : "choice-button"}
            type="button"
            disabled={answered}
            onClick={() => onChooseAnswer(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function readUserEnglishLevel(): EnglishLevel | null {
  try {
    const saved = window.localStorage.getItem(USER_ENGLISH_LEVEL_KEY);
    return isEnglishLevel(saved) ? saved : null;
  } catch {
    return null;
  }
}

function saveUserEnglishLevel(level: EnglishLevel) {
  try {
    window.localStorage.setItem(USER_ENGLISH_LEVEL_KEY, level);
  } catch {
    // The app should keep working in browsers that restrict localStorage.
  }
}

function isEnglishLevel(value: unknown): value is EnglishLevel {
  return value === "A1" || value === "A2" || value === "B1" || value === "B2" || value === "C1";
}

function placementLevelFromScore(score: number): EnglishLevel {
  if (score <= 3) return "A1";
  if (score <= 6) return "A2";
  if (score <= 8) return "B1";
  if (score === 9) return "B2";
  return "C1";
}

function trainingLevelForUser(level: EnglishLevel | null): Level {
  if (level === "A2" || level === "B1") return level;
  if (level === "B2" || level === "C1") return "B1";
  return "A1";
}

function levelResultDescription(level: EnglishLevel, t: Copy) {
  if (level === "A1") return t.levelResultA1;
  if (level === "A2") return t.levelResultA2;
  if (level === "B1") return t.levelResultB1;
  if (level === "B2") return t.levelResultB2;
  return t.levelResultC1;
}

function buildTrainingSession(
  preferredWords: VocabularyEntry[],
  allWords: VocabularyEntry[],
  questionCount: number,
  category: TrainingCategory["id"] = "words",
  level?: Level,
) {
  const preferredPool = preferredWords.length ? preferredWords : allWords;
  const preferredLevelPool = level ? preferredPool.filter((word) => word.level === level) : preferredPool;
  const allLevelWords = level ? allWords.filter((word) => word.level === level) : allWords;
  const pool = shuffleArray(preferredLevelPool.length ? preferredLevelPool : allLevelWords.length ? allLevelWords : preferredPool);
  const optionWords = allLevelWords.length ? allLevelWords : allWords;
  if (!pool.length) return [];

  const sessionWords = Array.from({ length: questionCount }, (_, index) => pool[index % pool.length]);
  const baseTypes = trainingTypesForCategory(category);
  if (!baseTypes.length) return [];

  const types = shuffleWithRepeats(Array.from({ length: questionCount }, (_, index) => baseTypes[index % baseTypes.length]));

  return sessionWords.map((word, index) => createTrainingQuestion(types[index], word, optionWords, index, level));
}

function trainingTypesForCategory(category: TrainingCategory["id"]): TrainingQuestion["type"][] {
  if (category === "audio") {
    return ["audioEnglish", "audioTranslation", "audioSentenceTranslation"];
  }

  if (category === "grammar") {
    return ["buildSentence"];
  }

  return ["translation", "english", "match"];
}

function createTrainingQuestion(type: TrainingQuestion["type"], word: VocabularyEntry, allWords: VocabularyEntry[], index: number, level?: Level): TrainingQuestion {
  if (type === "match") {
    const words = shuffleArray([word, ...shuffleArray(allWords.filter((item) => item.word !== word.word)).slice(0, 2)]);
    return { id: `match-${index}`, type: "match", words, translations: derangedTranslations(words) };
  }

  if (type === "translation") {
    return {
      id: `translation-${index}`,
      type,
      word,
      prompt: word.word,
      answer: word.translation,
      options: answerOptions(word.translation, allWords.filter((item) => item.word !== word.word).map((item) => item.translation)),
    };
  }

  if (type === "english" || type === "audioEnglish") {
    return {
      id: `${type}-${index}`,
      type,
      word,
      prompt: word.translation,
      answer: word.word,
      options: answerOptions(word.word, allWords.filter((item) => item.word !== word.word).map((item) => item.word)),
    };
  }

  if (type === "audioTranslation") {
    return {
      id: `audio-translation-${index}`,
      type,
      word,
      prompt: word.word,
      answer: word.translation,
      options: answerOptions(word.translation, allWords.filter((item) => item.word !== word.word).map((item) => item.translation)),
    };
  }

  if (type === "audioSentenceTranslation") {
    const sentence = grammarSentenceForIndex(index, level);
    const sentenceOptions = answerOptions(
      sentence.ru,
      grammarSentences.filter((item) => item.en !== sentence.en).map((item) => item.ru),
    );

    return {
      id: `audio-sentence-${index}`,
      type,
      word,
      prompt: sentence.en,
      answer: sentence.ru,
      options: sentenceOptions,
      targetSentence: sentence.en,
    };
  }

  if (type === "buildSentence") {
    const sentence = grammarSentenceForIndex(index, level);
    const sentenceWords = wordsForSentenceBuild(sentence.en);

    return {
      id: `grammar-build-${index}`,
      type,
      word,
      prompt: sentence.ru,
      answer: sentenceWords.join(" "),
      options: shuffleWithRepeats(sentenceWords),
      targetSentence: sentence.en,
    };
  }

  throw new Error(`Unsupported training question type: ${type}`);
}

function grammarSentenceForIndex(index: number, level: Level = "A1") {
  const sentencesForLevel = grammarSentences.filter((_, sentenceIndex) => grammarLevelForIndex(sentenceIndex) === level);
  const source = sentencesForLevel.length ? sentencesForLevel : grammarSentences;
  return source[index % source.length];
}

function grammarLevelForIndex(index: number): Level {
  if (index < 10) return "A1";
  if (index < 17) return "A2";
  return "B1";
}

function wordsForSentenceBuild(sentence: string) {
  return sentence.replace(/[.!?]+$/g, "").split(/\s+/);
}

function trainingAnswerText(question: TrainingQuestion) {
  if (question.type === "match") return question.words.map((word) => `${word.word} ↔ ${word.translation}`).join(", ");
  if (question.type === "buildSentence") return question.targetSentence;
  return question.answer;
}

function isCurrentTrainingAnswerCorrect(question: TrainingQuestion, selectedAnswer: string | null, matchedPairs: Record<string, string>) {
  if (question.type === "match") return question.words.every((word) => matchedPairs[word.word] === word.translation);
  return selectedAnswer === question.answer;
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
  progress,
  currentLevel,
  totalProgress,
  onNavigate,
}: {
  t: Copy;
  selectedLanguage: NativeLanguage;
  onSelectLanguage: (language: NativeLanguage) => void;
  progress: ReturnType<typeof useLearnerProgress>["progress"];
  currentLevel: string;
  totalProgress: number;
  onNavigate: (page: Page) => void;
}) {
  const [openSection, setOpenSection] = useState<"stats" | "vocabulary" | null>(null);
  const vocabulary = useMemo(() => getVocabularyDatabase(), []);
  const completedLessonsLabel = `${progress.completedLessons.length}/${stories.length}`;
  const savedWordsLabel = progress.savedWords.length.toString();

  return (
    <main className="page-stack profile-page">
      <section className="content-card compact-settings profile-language-card">
        <div>
          <span className="eyebrow">{t.profile}</span>
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

      <section className="content-card profile-panel">
        <button
          className="profile-panel-toggle"
          type="button"
          aria-expanded={openSection === "stats"}
          onClick={() => setOpenSection(openSection === "stats" ? null : "stats")}
        >
          <span>
            <BarChart3 size={20} aria-hidden="true" />
            {t.stats}
          </span>
          <strong>{openSection === "stats" ? "-" : "+"}</strong>
        </button>
        {openSection === "stats" ? (
          <div className="profile-panel-body">
            <div className="profile-metric-grid">
              <MetricCard icon={<Sparkles />} label={t.totalXp} value={progress.xp.toString()} />
              <MetricCard icon={<Flame />} label={t.streak} value={`${progress.streak}`} />
              <MetricCard icon={<Trophy />} label={t.level} value={currentLevel} />
              <MetricCard icon={<CheckCircle2 />} label={t.completedLessons} value={completedLessonsLabel} />
            </div>
            <div className="profile-progress-summary">
              <div className="section-header">
                <div>
                  <span className="eyebrow">{t.progress}</span>
                  <h2>{totalProgress}%</h2>
                </div>
              </div>
              <ProgressBar value={totalProgress} />
            </div>
            <button className="secondary-button profile-link-button" type="button" onClick={() => onNavigate("stats")}>
              {t.stats}
            </button>
          </div>
        ) : null}
      </section>

      <section className="content-card profile-panel">
        <button
          className="profile-panel-toggle"
          type="button"
          aria-expanded={openSection === "vocabulary"}
          onClick={() => setOpenSection(openSection === "vocabulary" ? null : "vocabulary")}
        >
          <span>
            <BookOpen size={20} aria-hidden="true" />
            {t.wordsPage}
          </span>
          <strong>{openSection === "vocabulary" ? "-" : "+"}</strong>
        </button>
        {openSection === "vocabulary" ? (
          <div className="profile-panel-body">
            <div className="profile-metric-grid">
              <MetricCard icon={<Star />} label={t.myWords} value={savedWordsLabel} />
              <MetricCard icon={<BookOpen />} label={t.allWords} value={vocabulary.length.toString()} />
              <MetricCard icon={<CheckCircle2 />} label={t.savedWordsCount} value={savedWordsLabel} />
            </div>
            <button className="secondary-button profile-link-button" type="button" onClick={() => onNavigate("words")}>
              {t.wordsPage}
            </button>
          </div>
        ) : null}
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
    { page: "training", label: t.training, short: t.training, icon: <Target size={20} /> },
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
