import { ArrowLeft, BookOpen, Bookmark, CheckCircle2, Clock, Home, Languages, Library, Pause, Play, Search, User, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import { comingSoonBookIds, getCatalogBook, getCategoryBooks, homeShelfBooks, libraryCategories, type HomeShelfBook } from "./data/homeShelves";
import { getReaderBook, getReaderChapter } from "./data/aliceReader";
import { getChapterCompletionKey, useLearnerProgress } from "./hooks/useLearnerProgress";
import {
  emptyPaginationSize,
  readerDisplayWordText,
  readerWordHasEmphasis,
  type ReaderPage,
  type ReaderPageWord,
  useReaderPagination,
} from "./hooks/useReaderPagination";
import { useReadingTimer } from "./hooks/useReadingTimer";
import {
  cleanVocabularyContextText,
  getVocabularyAcceptedTranslations,
  getVocabularyDisplayTranslation,
  getVocabularySourceLabel,
  hasValidTranscription,
  hasValidTranslation,
  normalizeVocabularyAnswer,
} from "./services/vocabularyHelpers";
import { useAuth } from "./services/AuthProvider";
import { replaceSavedVocabularyWords, useSavedVocabulary } from "./services/vocabularyStorage";
import type { BookCompletion, ChapterCompletion, LastOpenedContent, NativeLanguage, ReaderChapter, ReaderPosition, ReadingSession, ReadingSettings, SavedVocabularyWord } from "./types";

type Page = "home" | "library" | "dictionary" | "profile";

type BookRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type BookInfoState = {
  book: HomeShelfBook;
  progressInfo: BookReadingProgress;
  rect: BookRect;
};

type BookReadingProgress = {
  progressPercent: number;
  completedChapterCount: number;
  totalChapterCount: number;
  isStarted: boolean;
  isCompleted: boolean;
  lastOpenedChapterId?: string;
  lastOpenedChapterNumber?: number;
  lastOpenedChapterTitle?: string;
  nextChapterId?: string;
  nextChapterNumber?: number;
  nextChapterTitle?: string;
  totalReadingSeconds: number;
};

type BookCardState = {
  availability: "available" | "comingSoon";
  canOpen: boolean;
  showProgress: boolean;
  progressPercent?: number;
  primaryAction: "start" | "continue" | "open" | "comingSoon";
};

type OpenContentOptions = {
  chapterId?: string;
  readingProgress?: number;
  scrollPosition?: number;
  restorePosition?: boolean;
};

type CompleteChapterInput = {
  bookId: string;
  chapterId: string;
  chapterIds: string[];
  readingSeconds: number;
  savedWordsCount: number;
  readingProgress: number;
  completedAt?: string;
};

const READING_SETTINGS_KEY = "storylingo-reading-settings";
const READER_POSITION_KEY = "storylingo-reader-positions";
const READER_SWIPE_HINT_KEY = "storylingo-reader-swipe-hint-seen";

const defaultReadingSettings: ReadingSettings = {
  theme: "cream",
  textSize: 20,
  lineHeight: 1.55,
  fontFamily: "Literata",
  textWidth: 720,
  textAlign: "left",
  accentedReading: false,
  showWordTranslation: false,
};

const readingThemes: Array<{ id: ReadingSettings["theme"]; label: string }> = [
  { id: "light", label: "Light" },
  { id: "cream", label: "Cream" },
  { id: "sepia", label: "Sepia" },
  { id: "dark", label: "Dark" },
];

const readingFonts: ReadingSettings["fontFamily"][] = [
  "Literata",
  "Merriweather",
  "Source Serif 4",
  "Georgia",
  "Atkinson Hyperlegible",
  "Inter",
];

const lineHeightOptions: Array<{ label: string; value: number }> = [
  { label: "Компактный", value: 1.4 },
  { label: "Обычный", value: 1.55 },
  { label: "Свободный", value: 1.75 },
];

const getShelfBooks = (shelfId: string) => getCategoryBooks(shelfId);
const getShelfBook = (bookId: string) => getCatalogBook(bookId);
const recentBooks = ["secret-garden", "wonderful-wizard-of-oz"]
  .map((bookId) => getShelfBook(bookId))
  .filter((book): book is HomeShelfBook => Boolean(book));
const recommendationBook = getShelfBook("pride-and-prejudice") ?? homeShelfBooks[0];
const weeklyNewBook = getShelfBook("seen-217") ?? homeShelfBooks[0];

const libraryShelves = libraryCategories.map((category) => ({
  ...category,
  books: getShelfBooks(category.id),
}));

function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    try {
      const saved = window.localStorage.getItem(READING_SETTINGS_KEY);
      return saved ? normalizeReadingSettings({ ...defaultReadingSettings, ...JSON.parse(saved) }) : defaultReadingSettings;
    } catch {
      return defaultReadingSettings;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(READING_SETTINGS_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent("storylingo-reading-settings-change"));
    } catch {
      // Reading should remain available when localStorage is blocked.
    }
  }, [settings]);

  useEffect(() => {
    const handleAccountDataMerged = () => {
      try {
        const saved = window.localStorage.getItem(READING_SETTINGS_KEY);
        if (saved) setSettings(normalizeReadingSettings({ ...defaultReadingSettings, ...JSON.parse(saved) }));
      } catch {
        // Keep current settings if stored cloud settings are unavailable.
      }
    };

    window.addEventListener("storylingo-account-data-merged", handleAccountDataMerged);
    return () => window.removeEventListener("storylingo-account-data-merged", handleAccountDataMerged);
  }, []);

  function replaceSettings(nextSettings: ReadingSettings) {
    setSettings(normalizeReadingSettings({ ...defaultReadingSettings, ...nextSettings }));
  }

  return { settings, setSettings, replaceSettings };
}

function normalizeReadingSettings(settings: ReadingSettings): ReadingSettings {
  return {
    ...settings,
    textSize: Math.min(28, Math.max(16, Number(settings.textSize) || defaultReadingSettings.textSize)),
    lineHeight: lineHeightOptions.some((option) => option.value === settings.lineHeight) ? settings.lineHeight : defaultReadingSettings.lineHeight,
    fontFamily: readingFonts.includes(settings.fontFamily) ? settings.fontFamily : defaultReadingSettings.fontFamily,
    textWidth: Math.min(760, Math.max(600, Number(settings.textWidth) || defaultReadingSettings.textWidth)),
    textAlign: settings.textAlign === "justify" ? "justify" : "left",
    accentedReading: Boolean(settings.accentedReading),
    showWordTranslation: false,
  };
}

function readReaderPosition(contentId: string): ReaderPosition | null {
  try {
    const saved = window.localStorage.getItem(READER_POSITION_KEY);
    const positions = saved ? JSON.parse(saved) as Record<string, ReaderPosition> : {};
    return positions[contentId] ?? null;
  } catch {
    return null;
  }
}

function writeReaderPosition(contentId: string, position: ReaderPosition) {
  try {
    const saved = window.localStorage.getItem(READER_POSITION_KEY);
    const positions = saved ? JSON.parse(saved) as Record<string, ReaderPosition> : {};
    window.localStorage.setItem(READER_POSITION_KEY, JSON.stringify({ ...positions, [contentId]: position }));
  } catch {
    // Reading still works if storage is unavailable.
  }
}

function clearComingSoonReaderPositions() {
  try {
    const saved = window.localStorage.getItem(READER_POSITION_KEY);
    if (!saved) return;

    const positions = JSON.parse(saved) as Record<string, ReaderPosition>;
    let changed = false;
    comingSoonBookIds.forEach((bookId) => {
      if (positions[bookId]) {
        delete positions[bookId];
        changed = true;
      }
    });

    if (changed) {
      window.localStorage.setItem(READER_POSITION_KEY, JSON.stringify(positions));
    }
  } catch {
    // Ignore invalid stored reader positions; reading remains available.
  }
}

function getDefaultChapterId(book: HomeShelfBook) {
  const readerBook = getReaderBook(book.id);
  if (!readerBook) return book.chapter;
  return readReaderPosition(book.id)?.chapterId ?? readerBook.chapters[0]?.id ?? book.chapter;
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeReaderChapterId, setActiveReaderChapterId] = useState<string | null>(null);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [bookInfo, setBookInfo] = useState<BookInfoState | null>(null);
  const [sheetInfo, setSheetInfo] = useState<{ book: HomeShelfBook; progressInfo: BookReadingProgress } | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [readingSettingsSyncTick, setReadingSettingsSyncTick] = useState(0);
  const closeInfoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollPosition = useRef<number | null>(null);
  const lastAccountSyncSignature = useRef("");
  const auth = useAuth();
  const { savedWords: accountSavedWords } = useSavedVocabulary();
  const { completeChapterAndUpdateBook, progress, replaceProgress, saveLastOpenedContent, saveReadingProgress, selectLanguage } = useLearnerProgress();
  const allItems = homeShelfBooks;
  const activeBook = allItems.find((book) => book.id === activeBookId) ?? null;
  const activeDetailBook = allItems.find((book) => book.id === activeDetailId) ?? null;
  const savedLastOpenedBook = progress.lastOpenedContent ? getShelfBook(progress.lastOpenedContent.contentId) : null;
  const lastOpenedBook = savedLastOpenedBook && !savedLastOpenedBook.comingSoon ? savedLastOpenedBook : null;
  const readingTimer = useReadingTimer(
    activeBook
      ? {
          contentType: activeBook.type,
          contentId: activeBook.id,
          chapterId: activeReaderChapterId ?? getDefaultChapterId(activeBook),
        }
      : null,
  );
  const bookProgress = useMemo(
    () => buildBookReadingProgressMap(allItems, progress, readingTimer.sessions),
    [allItems, progress, readingTimer.sessions],
  );

  useEffect(() => {
    clearComingSoonReaderPositions();
  }, []);

  useEffect(() => {
    const handleReadingSettingsChange = () => setReadingSettingsSyncTick((value) => value + 1);
    window.addEventListener("storylingo-reading-settings-change", handleReadingSettingsChange);
    return () => window.removeEventListener("storylingo-reading-settings-change", handleReadingSettingsChange);
  }, []);

  useEffect(() => {
    if (!auth.cloudSnapshot) return;
    if (auth.cloudSnapshot.progress) replaceProgress(auth.cloudSnapshot.progress);
    if (auth.cloudSnapshot.vocabulary) replaceSavedVocabularyWords(auth.cloudSnapshot.vocabulary);
    if (auth.cloudSnapshot.readingSessions) readingTimer.replaceSessions(auth.cloudSnapshot.readingSessions);
  }, [auth.cloudSnapshot]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const signature = JSON.stringify({
      readingProgress: progress.readingProgress,
      chapterCompletions: progress.chapterCompletions,
      bookCompletions: progress.bookCompletions,
      lastOpenedContent: progress.lastOpenedContent,
      savedWords: accountSavedWords.map((word) => ({
        id: word.lexicalEntryId,
        contexts: word.contexts.length,
        status: word.progress.status,
        correctCount: word.progress.correctCount,
        incorrectCount: word.progress.incorrectCount,
      })),
      sessions: readingTimer.sessions.map((session) => `${session.id}:${session.durationSeconds}`),
    });
    if (signature === lastAccountSyncSignature.current) return;
    lastAccountSyncSignature.current = signature;

    const timer = window.setTimeout(() => {
      void auth.syncLocalData();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [auth.isAuthenticated, progress, accountSavedWords, readingTimer.sessions, readingSettingsSyncTick]);

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setActiveBookId(null);
    setActiveReaderChapterId(null);
    setActiveDetailId(null);
    setBookInfo(null);
    setSheetInfo(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearCloseInfoTimer() {
    if (closeInfoTimer.current) {
      clearTimeout(closeInfoTimer.current);
      closeInfoTimer.current = null;
    }
  }

  function showBookInfo(book: HomeShelfBook, progressInfo: BookReadingProgress, rect: BookRect) {
    clearCloseInfoTimer();
    setBookInfo({ book, progressInfo, rect });
  }

  function scheduleCloseBookInfo() {
    clearCloseInfoTimer();
    closeInfoTimer.current = setTimeout(() => setBookInfo(null), 140);
  }

  function saveOpenedContent(book: HomeShelfBook, options: OpenContentOptions = {}) {
    if (book.comingSoon) return;

    const fallbackProgress = bookProgress[book.id]?.progressPercent ?? progress.readingProgress[book.id] ?? 0;
    saveLastOpenedContent({
      contentId: book.id,
      contentType: book.type,
      chapterId: options.chapterId ?? getDefaultChapterId(book),
      readingProgress: options.readingProgress ?? fallbackProgress,
      scrollPosition: options.scrollPosition ?? 0,
      lastPosition: options.scrollPosition ?? 0,
    });
  }

  function openContent(contentId: string, options: OpenContentOptions = {}) {
    const book = getShelfBook(contentId);
    if (!book) return;

    setBookInfo(null);
    setSheetInfo(null);

    if (book.comingSoon) {
      pendingScrollPosition.current = null;
      setActiveBookId(null);
      setActiveReaderChapterId(null);
      setActiveDetailId(book.id);
      return;
    }

    const restorePosition = options.restorePosition ?? true;
    pendingScrollPosition.current = restorePosition ? options.scrollPosition ?? progress.lastOpenedContent?.scrollPosition ?? null : null;
    saveOpenedContent(book, options);
    setPage("home");
    setActiveDetailId(null);
    setActiveReaderChapterId(options.chapterId ?? getDefaultChapterId(book));
    setActiveBookId(book.id);
  }

  function openBook(bookId: string, options?: OpenContentOptions) {
    openContent(bookId, options);
  }

  function closeActiveContent() {
    if (activeBook) {
      saveOpenedContent(activeBook, {
        readingProgress: bookProgress[activeBook.id]?.progressPercent ?? progress.readingProgress[activeBook.id] ?? 0,
        scrollPosition: window.scrollY,
      });
    }

    setActiveBookId(null);
    setActiveReaderChapterId(null);
    setActiveDetailId(null);
  }

  function continueLastOpened() {
    if (!progress.lastOpenedContent) return;
    const book = getShelfBook(progress.lastOpenedContent.contentId);
    if (!book || book.comingSoon) return;

    openContent(progress.lastOpenedContent.contentId, {
      chapterId: progress.lastOpenedContent.chapterId,
      readingProgress: progress.lastOpenedContent.readingProgress,
      scrollPosition: progress.lastOpenedContent.scrollPosition,
      restorePosition: true,
    });
  }

  function handleReadingProgress(book: HomeShelfBook, value: number) {
    saveReadingProgress(book.id, value);
    saveOpenedContent(book, {
      readingProgress: value,
      scrollPosition: window.scrollY,
    });
  }

  function openBookPage(bookId: string) {
    const book = getShelfBook(bookId);
    if (!book) return;
    saveOpenedContent(book, {
      readingProgress: bookProgress[book.id]?.progressPercent ?? progress.readingProgress[book.id] ?? 0,
      scrollPosition: 0,
    });
    setBookInfo(null);
    setSheetInfo(null);
    setActiveBookId(null);
    setActiveReaderChapterId(null);
    setActiveDetailId(book.id);
  }

  function startReadingFromGoal() {
    const lastOpened = progress.lastOpenedContent ? getShelfBook(progress.lastOpenedContent.contentId) : null;
    if (progress.lastOpenedContent && lastOpened && !lastOpened.comingSoon) {
      continueLastOpened();
      return;
    }

    if (readingTimer.lastContentId && allItems.some((item) => item.id === readingTimer.lastContentId && !item.comingSoon)) {
      openContent(readingTimer.lastContentId);
      return;
    }

    navigate("library");
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="app-main">
        <MobileTopBar onProfile={() => navigate("profile")} />
        {activeBook ? (
          <ReaderPreview
            book={activeBook}
            progressValue={bookProgress[activeBook.id]?.progressPercent ?? 0}
            onBack={closeActiveContent}
            onProgress={(value) => handleReadingProgress(activeBook, value)}
            onSessionUpdate={(scrollPosition) =>
              saveOpenedContent(activeBook, {
                readingProgress: bookProgress[activeBook.id]?.progressPercent ?? progress.readingProgress[activeBook.id] ?? 0,
                scrollPosition,
              })
            }
            restoreScrollPosition={pendingScrollPosition.current}
            readingTimer={readingTimer}
            chapterCompletions={progress.chapterCompletions ?? {}}
            onChapterChange={setActiveReaderChapterId}
            onChapterComplete={completeChapterAndUpdateBook}
            onChapterOpen={(chapterId, readingProgress) =>
              saveOpenedContent(activeBook, {
                chapterId,
                readingProgress,
                scrollPosition: 0,
              })
            }
            onReturnToBook={() => {
              setActiveBookId(null);
              setActiveReaderChapterId(null);
              setActiveDetailId(activeBook.id);
            }}
            onReturnToLibrary={() => {
              setActiveBookId(null);
              setActiveReaderChapterId(null);
              setActiveDetailId(null);
              setPage("library");
            }}
            onChangeGoal={() => setGoalDialogOpen(true)}
          />
        ) : activeDetailBook ? (
          <ContentDetailPage
            book={activeDetailBook}
            progressInfo={bookProgress[activeDetailBook.id] ?? getEmptyBookProgress(activeDetailBook)}
            chapterCompletions={progress.chapterCompletions ?? {}}
            onBack={() => setActiveDetailId(null)}
            onOpen={openContent}
          />
        ) : (
          <>
            {page === "home" ? (
              <HomePage
                onNavigate={navigate}
                onOpenBook={openContent}
                onOpenBookPage={openBookPage}
                onContinueLast={continueLastOpened}
                onShowBookInfo={showBookInfo}
                onHideBookInfo={scheduleCloseBookInfo}
                onOpenBookSheet={setSheetInfo}
                progress={progress.readingProgress}
                bookProgress={bookProgress}
                lastOpened={progress.lastOpenedContent ?? null}
                lastOpenedBook={lastOpenedBook ?? null}
                readingTimer={readingTimer}
                onStartReading={startReadingFromGoal}
                onChangeGoal={() => setGoalDialogOpen(true)}
              />
            ) : null}
            {page === "library" ? (
              <LibraryPage
                onOpenBook={openContent}
                onShowBookInfo={showBookInfo}
                onHideBookInfo={scheduleCloseBookInfo}
                onOpenBookSheet={setSheetInfo}
                progress={progress.readingProgress}
                bookProgress={bookProgress}
              />
            ) : null}
            {page === "dictionary" ? <DictionaryPage /> : null}
            {page === "profile" ? (
              <ProfilePage
                language={progress.selectedLanguage ?? "Russian"}
                onSelectLanguage={selectLanguage}
                bookProgress={bookProgress}
                readingTimer={readingTimer}
              />
            ) : null}
          </>
        )}
      </div>
      {bookInfo ? (
        <BookInfoPopover
          book={bookInfo.book}
          progressInfo={bookInfo.progressInfo}
          anchorRect={bookInfo.rect}
          onOpen={openContent}
          onOpenBookPage={openBookPage}
          onKeepOpen={clearCloseInfoTimer}
          onRequestClose={scheduleCloseBookInfo}
        />
      ) : null}
      {sheetInfo ? (
        <BookInfoSheet
          book={sheetInfo.book}
          progressInfo={sheetInfo.progressInfo}
          onClose={() => setSheetInfo(null)}
          onOpen={openContent}
          onOpenBookPage={openBookPage}
        />
      ) : null}
      {goalDialogOpen ? (
        <ReadingGoalDialog
          currentGoal={readingTimer.goal.dailyGoalMinutes}
          onClose={() => setGoalDialogOpen(false)}
          onSave={(minutes) => {
            readingTimer.setDailyGoal(minutes);
            setGoalDialogOpen(false);
          }}
        />
      ) : null}
      <MobileNav page={page} onNavigate={navigate} />
    </div>
  );
}

function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <aside className="sidebar">
      <Logo />
      <nav className="sidebar-nav" aria-label="Основная навигация">
        {navItems.map((item) => (
          <button key={item.page} className={page === item.page ? "active" : ""} type="button" onClick={() => onNavigate(item.page)}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="premium-card">
        <span>Premium</span>
        <strong>Больше книг скоро</strong>
        <p>Заглушка для будущей подписки. Оплата пока не подключена.</p>
      </div>
    </aside>
  );
}

function MobileTopBar({ onProfile }: { onProfile: () => void }) {
  return (
    <header className="mobile-topbar">
      <Logo compact />
      <button className="icon-pill" type="button" aria-label="Поиск">
        <Search size={18} aria-hidden="true" />
      </button>
      <button className="icon-pill" type="button" aria-label="Профиль" onClick={onProfile}>
        <User size={18} aria-hidden="true" />
      </button>
    </header>
  );
}

function MobileNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="mobile-nav" aria-label="Мобильная навигация">
      {navItems.map((item) => (
        <button key={item.page} className={page === item.page ? "active" : ""} type="button" onClick={() => onNavigate(item.page)}>
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "logo compact" : "logo"}>
      <span>SL</span>
      <div>
        <strong>StoryLingo</strong>
        {!compact ? <small>English reading library</small> : null}
      </div>
    </div>
  );
}

function HomePage({
  onNavigate,
  onOpenBook,
  onOpenBookPage,
  onContinueLast,
  onShowBookInfo,
  onHideBookInfo,
  onOpenBookSheet,
  progress,
  bookProgress,
  lastOpened,
  lastOpenedBook,
  readingTimer,
  onStartReading,
  onChangeGoal,
}: {
  onNavigate: (page: Page) => void;
  onOpenBook: (bookId: string, options?: OpenContentOptions) => void;
  onOpenBookPage: (bookId: string) => void;
  onContinueLast: () => void;
  onShowBookInfo: (book: HomeShelfBook, progressInfo: BookReadingProgress, rect: BookRect) => void;
  onHideBookInfo: () => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressInfo: BookReadingProgress }) => void;
  progress: Record<string, number>;
  bookProgress: Record<string, BookReadingProgress>;
  lastOpened: LastOpenedContent | null;
  lastOpenedBook: HomeShelfBook | null;
  readingTimer: ReturnType<typeof useReadingTimer>;
  onStartReading: () => void;
  onChangeGoal: () => void;
}) {
  return (
    <main className="book-home">
      <section className="home-welcome">
        <div>
          <span className="eyebrow">Добрый вечер, Полина 🌙</span>
          <h1>Что будем читать сегодня?</h1>
        </div>
        <div className="home-decor" aria-hidden="true">
          <span className="decor-plant" />
          <span className="decor-books" />
          <span className="decor-candle" />
        </div>
      </section>

      <HomeContinuePanel
        book={lastOpenedBook}
        lastOpened={lastOpened}
        progressInfo={lastOpenedBook ? bookProgress[lastOpenedBook.id] ?? getEmptyBookProgress(lastOpenedBook) : null}
        onContinue={onContinueLast}
        onOpenBookPage={onOpenBookPage}
        onChooseFirstBook={() => onNavigate("library")}
      />

      <ShelfSection title="Недавно открывали" onViewAll={() => onNavigate("library")} compact>
        <BookShelf compact>
          {recentBooks.map((book) => (
            <BookCover
              key={book.id}
              book={book}
              progressInfo={bookProgress[book.id] ?? getEmptyBookProgress(book)}
              onOpen={onOpenBook}
              onShowInfo={onShowBookInfo}
              onHideInfo={onHideBookInfo}
              onOpenSheet={onOpenBookSheet}
              compact
            />
          ))}
        </BookShelf>
      </ShelfSection>

      <section className="home-feature-grid">
        <RecommendationCard
          book={recommendationBook}
          onOpen={onOpenBookPage}
        />
        <WeeklyNewCard
          book={weeklyNewBook}
          onOpen={onOpenBook}
        />
      </section>

      <ReadingGoalCard
        dailyGoalMinutes={readingTimer.goal.dailyGoalMinutes}
        todayReadingSeconds={readingTimer.stats.todaySeconds}
        isComplete={readingTimer.isGoalCompleteToday}
        onChangeGoal={onChangeGoal}
        onStartReading={onStartReading}
      />
    </main>
  );
}

function HomeContinuePanel({
  book,
  lastOpened,
  progressInfo,
  onContinue,
  onOpenBookPage,
  onChooseFirstBook,
}: {
  book: HomeShelfBook | null;
  lastOpened: LastOpenedContent | null;
  progressInfo: BookReadingProgress | null;
  onContinue: () => void;
  onOpenBookPage: (bookId: string) => void;
  onChooseFirstBook: () => void;
}) {
  if (!book || !lastOpened) {
    return (
      <section className="home-continue-panel empty">
        <div className="home-empty-cover" aria-hidden="true">
          <BookOpen size={42} />
        </div>
        <div className="home-continue-copy">
          <span className="eyebrow">Продолжить чтение</span>
          <h2>Выберите первую книгу</h2>
          <p>Откройте библиотеку и выберите книгу или рассказ для уютного чтения.</p>
          <button className="primary-button" type="button" onClick={onChooseFirstBook}>В библиотеку</button>
        </div>
      </section>
    );
  }

  const isStory = book.type === "story";
  const progressLabel = progressInfo?.isCompleted
    ? (isStory ? "Рассказ прочитан" : "Книга прочитана")
    : progressInfo?.isStarted
      ? `${progressInfo.progressPercent}% прочитано`
      : "Позиция сохранена";
  const actionLabel = progressInfo?.isCompleted
    ? (isStory ? "Открыть рассказ" : "Открыть книгу")
    : isStory ? "Продолжить рассказ" : "Продолжить чтение";
  const handlePrimaryAction = () => {
    if (progressInfo?.isCompleted) {
      onOpenBookPage(book.id);
      return;
    }

    onContinue();
  };

  return (
    <section className="home-continue-panel">
      <div className="home-continue-book">
        <BookCover book={book} progressInfo={progressInfo ?? getEmptyBookProgress(book)} onOpen={handlePrimaryAction} featured />
      </div>
      <div className="home-continue-copy">
        <span className="eyebrow">Продолжить чтение</span>
        <h2>{book.title}</h2>
        <p>{book.author}</p>
        <span>{isStory ? "Рассказ" : lastOpened.chapterId ?? book.chapter}</span>
        <BookProgressBar
          percent={progressInfo?.progressPercent ?? 0}
          isCompleted={Boolean(progressInfo?.isCompleted)}
          label={progressLabel}
        />
        <button className="primary-button" type="button" onClick={handlePrimaryAction}>{actionLabel}</button>
      </div>
    </section>
  );
}

function RecommendationCard({
  book,
  onOpen,
}: {
  book: HomeShelfBook;
  onOpen: (bookId: string, options?: OpenContentOptions) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasCoverImage = Boolean(book.coverImage && !imageFailed);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(book.id);
    }
  }

  return (
    <article
      className="recommendation-card clickable"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(book.id)}
      onKeyDown={handleKeyDown}
      aria-label={`Открыть ${book.title}`}
    >
      <div className={`recommendation-cover cover-${book.coverStyle}`} aria-hidden="true">
        {hasCoverImage ? (
          <img src={book.coverImage} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
        ) : (
          <span>{book.title}</span>
        )}
        {book.comingSoon ? <small>Скоро</small> : null}
      </div>
      <div className="recommendation-copy">
        <span className="eyebrow">Рекомендация для вас</span>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <small>B1 · классика · роман · {book.readingTime}</small>
        <p className="feature-description">Спокойная классика с живыми диалогами и понятной бытовой лексикой.</p>
        <span className="recommendation-note">Подойдёт, если вам нравится спокойная классика и живые диалоги</span>
        <button
          className="secondary-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(book.id);
          }}
        >
          Посмотреть книгу
        </button>
      </div>
    </article>
  );
}

function WeeklyNewCard({ book, onOpen }: { book: HomeShelfBook; onOpen: (bookId: string) => void }) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(book.id);
    }
  }

  return (
    <article
      className="weekly-new-card clickable"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(book.id)}
      onKeyDown={handleKeyDown}
      aria-label={`Открыть ${book.title}`}
    >
      <div className="weekly-new-overlay">
        <span className="weekly-kicker">Новинка недели</span>
        <span>StoryLingo Original</span>
        <h3>{book.title}</h3>
        <small>A2 · 12 минут</small>
        <p>Одно сообщение. Один пропущенный звонок. И слишком позднее время.</p>
        <button
          className="weekly-new-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(book.id);
          }}
        >
          Читать рассказ
        </button>
      </div>
    </article>
  );
}

function ReadingGoalCard({
  dailyGoalMinutes,
  todayReadingSeconds,
  isComplete,
  onChangeGoal,
  onStartReading,
}: {
  dailyGoalMinutes: number;
  todayReadingSeconds: number;
  isComplete: boolean;
  onChangeGoal: () => void;
  onStartReading: () => void;
}) {
  const todayReadingMinutes = Math.floor(todayReadingSeconds / 60);
  const progressValue = dailyGoalMinutes > 0 ? Math.min(100, Math.round((todayReadingSeconds / (dailyGoalMinutes * 60)) * 100)) : 0;

  return (
    <section className="reading-goal-card">
      <div className="reading-goal-copy">
        <span className="eyebrow">Цель по чтению</span>
        <h2>Читайте понемногу каждый день</h2>
        <p>Дневная цель: {dailyGoalMinutes} минут</p>
        <strong className="goal-status">{isComplete ? "Цель на сегодня выполнена" : `${todayReadingMinutes} из ${dailyGoalMinutes} минут`}</strong>
        <button className="primary-button" type="button" onClick={onStartReading}>Начать читать</button>
        <button className="goal-link" type="button" onClick={onChangeGoal}>Изменить цель</button>
      </div>
      <div className="reading-goal-meter" style={{ "--goal-progress": `${progressValue}%` } as CSSProperties}>
        <div className="goal-ring" aria-label={`${todayReadingMinutes} из ${dailyGoalMinutes} минут`}>
          <strong>{todayReadingMinutes}</strong>
          <span>из {dailyGoalMinutes} минут</span>
        </div>
        <small>Сегодня</small>
      </div>
    </section>
  );
}

function ShelfSection({
  title,
  children,
  onViewAll,
  compact = false,
  showViewAll = true,
}: {
  title: string;
  children: ReactNode;
  onViewAll: () => void;
  compact?: boolean;
  showViewAll?: boolean;
}) {
  return (
    <section className={compact ? "shelf-section compact" : "shelf-section"}>
      <div className="shelf-heading">
        <h2>{title}</h2>
        {showViewAll ? <button className="shelf-link" type="button" onClick={onViewAll}>Все</button> : null}
      </div>
      {children}
    </section>
  );
}

function BookShelf({
  children,
  compact = false,
  grid = false,
  scrollRef,
}: {
  children: ReactNode;
  compact?: boolean;
  grid?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={[compact ? "book-shelf compact" : "book-shelf", grid ? "grid" : ""].filter(Boolean).join(" ")}>
      <div className="shelf-books" ref={scrollRef}>{children}</div>
      <div className="wood-shelf" aria-hidden="true" />
    </div>
  );
}

function LibraryShelfScroller({
  books,
  onHideBookInfo,
  onOpenBook,
  onOpenBookSheet,
  onShowBookInfo,
  progress,
  bookProgress,
}: {
  books: HomeShelfBook[];
  onHideBookInfo: () => void;
  onOpenBook: (bookId: string) => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressInfo: BookReadingProgress }) => void;
  onShowBookInfo: (book: HomeShelfBook, progressInfo: BookReadingProgress, rect: BookRect) => void;
  progress: Record<string, number>;
  bookProgress: Record<string, BookReadingProgress>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const element = scrollRef.current;
    if (!element) return;
    setCanScrollLeft(element.scrollLeft > 4);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 4);
  }

  function scrollShelf(direction: "left" | "right") {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction === "left" ? -Math.round(element.clientWidth * 0.72) : Math.round(element.clientWidth * 0.72),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [books.length]);

  return (
    <div className="library-shelf-frame">
      <button
        className="shelf-scroll-button left"
        type="button"
        aria-label="Прокрутить полку влево"
        disabled={!canScrollLeft}
        onClick={() => scrollShelf("left")}
      >
        ‹
      </button>
      <BookShelf scrollRef={scrollRef}>
        {books.map((book) => (
          <BookCover
            key={book.id}
            book={book}
            progressInfo={bookProgress[book.id] ?? getEmptyBookProgress(book)}
            onOpen={onOpenBook}
            onShowInfo={onShowBookInfo}
            onHideInfo={onHideBookInfo}
            onOpenSheet={onOpenBookSheet}
          />
        ))}
      </BookShelf>
      <button
        className="shelf-scroll-button right"
        type="button"
        aria-label="Прокрутить полку вправо"
        disabled={!canScrollRight}
        onClick={() => scrollShelf("right")}
      >
        ›
      </button>
    </div>
  );
}

function FullCategoryBooks({
  books,
  onHideBookInfo,
  onOpenBook,
  onOpenBookSheet,
  onShowBookInfo,
  progress,
  bookProgress,
}: {
  books: HomeShelfBook[];
  onHideBookInfo: () => void;
  onOpenBook: (bookId: string) => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressInfo: BookReadingProgress }) => void;
  onShowBookInfo: (book: HomeShelfBook, progressInfo: BookReadingProgress, rect: BookRect) => void;
  progress: Record<string, number>;
  bookProgress: Record<string, BookReadingProgress>;
}) {
  const renderBooks = (items: HomeShelfBook[]) =>
    items.map((book) => (
      <BookCover
        key={book.id}
        book={book}
        progressInfo={bookProgress[book.id] ?? getEmptyBookProgress(book)}
        onOpen={onOpenBook}
        onShowInfo={onShowBookInfo}
        onHideInfo={onHideBookInfo}
        onOpenSheet={onOpenBookSheet}
      />
    ));

  return (
    <div className="category-full-list">
      <div className="category-full-desktop category-full-desktop-4">
        {chunkBooks(books, 4).map((row, index) => (
          <BookShelf key={`row-4-${index}`}>
            {renderBooks(row)}
          </BookShelf>
        ))}
      </div>
      <div className="category-full-desktop category-full-desktop-3">
        {chunkBooks(books, 3).map((row, index) => (
          <BookShelf key={`row-3-${index}`}>
            {renderBooks(row)}
          </BookShelf>
        ))}
      </div>
      <div className="category-full-mobile">
        <BookShelf grid>
          {renderBooks(books)}
        </BookShelf>
      </div>
    </div>
  );
}

function chunkBooks(books: HomeShelfBook[], size: number) {
  const rows: HomeShelfBook[][] = [];
  for (let index = 0; index < books.length; index += size) {
    rows.push(books.slice(index, index + size));
  }
  return rows;
}

function BookCover({
  book,
  progressInfo,
  onOpen,
  onShowInfo,
  onHideInfo,
  onOpenSheet,
  compact = false,
  featured = false,
}: {
  book: HomeShelfBook;
  progressInfo: BookReadingProgress;
  onOpen: (bookId: string) => void;
  onShowInfo?: (book: HomeShelfBook, progressInfo: BookReadingProgress, rect: BookRect) => void;
  onHideInfo?: () => void;
  onOpenSheet?: (info: { book: HomeShelfBook; progressInfo: BookReadingProgress }) => void;
  compact?: boolean;
  featured?: boolean;
}) {
  const cardState = getBookCardState(book, progressInfo);
  const safeProgress = cardState.progressPercent ?? progressInfo.progressPercent;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pointerMoved = useRef(false);
  const hasCoverImage = Boolean(book.coverImage && !imageFailed);
  const canShowInfo = Boolean(onShowInfo && onHideInfo && onOpenSheet && !featured);
  const isMinimalCover = featured;

  function isMobileInput() {
    return window.innerWidth <= 768 || window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  function getBookRect(element: HTMLElement): BookRect {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function showInfo(element: HTMLElement) {
    if (!canShowInfo || isMobileInput()) return;
    onShowInfo?.(book, progressInfo, getBookRect(element));
  }

  function handleCoverClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!cardState.canOpen && !canShowInfo) return;

    if (!canShowInfo) {
      onOpen(book.id);
      return;
    }

    if (isMobileInput()) {
      if (!pointerMoved.current) {
        onOpenSheet?.({ book, progressInfo });
      }
      return;
    }

    showInfo(event.currentTarget);
  }

  return (
    <div
      className={[featured ? "book-3d featured" : "book-3d", compact ? "compact" : "", isMinimalCover ? "minimal-cover" : ""].filter(Boolean).join(" ")}
      role="button"
      tabIndex={0}
      onClick={handleCoverClick}
      onMouseEnter={(event) => showInfo(event.currentTarget)}
      onMouseLeave={() => onHideInfo?.()}
      onFocus={(event) => showInfo(event.currentTarget)}
      onBlur={() => onHideInfo?.()}
      onPointerDown={(event) => {
        pointerMoved.current = false;
        pointerStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        if (!pointerStart.current) return;
        const deltaX = Math.abs(event.clientX - pointerStart.current.x);
        const deltaY = Math.abs(event.clientY - pointerStart.current.y);
        if (deltaX > 10 || deltaY > 10) {
          pointerMoved.current = true;
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!cardState.canOpen && !canShowInfo) {
            return;
          }

          if (canShowInfo) {
            showInfo(event.currentTarget);
          } else {
            onOpen(book.id);
          }
        }
      }}
      style={{ "--tilt": `${book.tilt}deg` } as CSSProperties}
      aria-label={`Открыть информацию о ${book.title}`}
    >
      <span className="book-spine" aria-hidden="true" />
      <span className={`book-face cover-${book.coverStyle} ${hasCoverImage ? "has-image" : ""}`}>
        {hasCoverImage ? (
          <img
            className={imageLoaded ? "loaded" : ""}
            src={book.coverImage}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        ) : null}
        {book.original ? <span className="original-ribbon">StoryLingo Original</span> : null}
        {cardState.availability === "comingSoon" ? <span className="soon-ribbon">Скоро</span> : null}
        <span className={hasCoverImage || isMinimalCover ? "cover-frame image-cover-copy" : "cover-frame"}>
          <span className="cover-title">{book.title}</span>
          <span className="cover-author">{book.author}</span>
        </span>
        {!isMinimalCover && cardState.showProgress && progressInfo.isStarted ? (
          <span className={progressInfo.isCompleted ? "cover-progress completed" : "cover-progress"}>
            <span className="cover-progress-track">
              <span
                className={progressInfo.isCompleted ? "cover-progress-fill completed" : "cover-progress-fill"}
                style={{ width: `${progressInfo.isCompleted ? 100 : safeProgress}%` }}
              />
            </span>
            <small>{safeProgress}%</small>
          </span>
        ) : !isMinimalCover ? (
          <span className="cover-meta">{cardState.availability === "comingSoon" ? "Скоро" : "Не начато"}</span>
        ) : null}
      </span>
      <span className="book-pages" aria-hidden="true" />
    </div>
  );
}

function BookInfoPopover({
  book,
  progressInfo,
  anchorRect,
  onOpen,
  onOpenBookPage,
  onKeepOpen,
  onRequestClose,
}: {
  book: HomeShelfBook;
  progressInfo: BookReadingProgress;
  anchorRect: BookRect;
  onOpen: (bookId: string) => void;
  onOpenBookPage: (bookId: string) => void;
  onKeepOpen: () => void;
  onRequestClose: () => void;
}) {
  const meta = getBookInfoMeta(book, progressInfo);
  const cardState = getBookCardState(book, progressInfo);
  const cardWidth = 292;
  const gap = 18;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const rightSpace = viewportWidth - anchorRect.right - gap - 16;
  const leftSpace = anchorRect.left - gap - 16;
  const opensRight = rightSpace >= cardWidth || rightSpace >= leftSpace;
  const rawLeft = opensRight ? anchorRect.right + gap : anchorRect.left - gap - cardWidth;
  const left = Math.max(12, Math.min(rawLeft, viewportWidth - cardWidth - 12));
  const top = Math.max(12, Math.min(anchorRect.top + 6, viewportHeight - 300));

  return (
    <aside
      className={`book-info-popover ${opensRight ? "opens-right" : "opens-left"}`}
      style={{ left, top, width: cardWidth } as CSSProperties}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onRequestClose}
      onFocus={onKeepOpen}
      onBlur={onRequestClose}
    >
      <strong>{book.title}</strong>
      <span>{book.author}</span>
      <small>{meta.metaLine}</small>
      {cardState.canOpen ? <span className="book-progress-location">{meta.locationLabel}</span> : null}
      <p>{meta.description}</p>
      {cardState.showProgress ? (
        <BookProgressBar
          percent={meta.safeProgress}
          isCompleted={progressInfo.isCompleted}
          label={meta.progressLabel}
        />
      ) : null}
      <button className="book-info-button" type="button" disabled={!cardState.canOpen} onClick={() => (progressInfo.isCompleted ? onOpenBookPage(book.id) : onOpen(book.id))}>
        {meta.buttonLabel}
      </button>
    </aside>
  );
}

function BookInfoSheet({
  book,
  progressInfo,
  onClose,
  onOpen,
  onOpenBookPage,
}: {
  book: HomeShelfBook;
  progressInfo: BookReadingProgress;
  onClose: () => void;
  onOpen: (bookId: string) => void;
  onOpenBookPage: (bookId: string) => void;
}) {
  const meta = getBookInfoMeta(book, progressInfo);
  const cardState = getBookCardState(book, progressInfo);
  const [imageFailed, setImageFailed] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const hasCoverImage = Boolean(book.coverImage && !imageFailed);

  return (
    <div className="book-sheet-layer" role="presentation" onClick={onClose}>
      <article
        className="book-info-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={book.title}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          dragStartY.current = event.clientY;
        }}
        onPointerUp={(event) => {
          if (dragStartY.current !== null && event.clientY - dragStartY.current > 70) {
            onClose();
          }
          dragStartY.current = null;
        }}
      >
        <button className="sheet-close" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        <div className={`sheet-cover cover-${book.coverStyle}`}>
          {hasCoverImage ? (
            <img src={book.coverImage} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
          ) : (
            <span>{book.title}</span>
          )}
        </div>
        <div className="sheet-copy">
          <strong>{book.title}</strong>
          <span>{book.author}</span>
          <small>{meta.metaLine}</small>
          {cardState.canOpen ? <span className="book-progress-location">{meta.locationLabel}</span> : null}
          <p>{meta.description}</p>
          {cardState.showProgress ? (
            <BookProgressBar
              percent={meta.safeProgress}
              isCompleted={progressInfo.isCompleted}
              label={meta.progressLabel}
            />
          ) : null}
          <button className="book-info-button" type="button" disabled={!cardState.canOpen} onClick={() => (progressInfo.isCompleted ? onOpenBookPage(book.id) : onOpen(book.id))}>
            {meta.buttonLabel}
          </button>
        </div>
      </article>
    </div>
  );
}

function getBookInfoMeta(book: HomeShelfBook, progressInfo: BookReadingProgress) {
  const cardState = getBookCardState(book, progressInfo);
  const safeProgress = progressInfo.progressPercent;
  const level = book.level ?? (book.type === "book" ? "A2" : "A1");
  const chapters = book.chapters ?? (book.type === "book" ? "10 глав" : "1 рассказ");
  const description = cardState.availability === "comingSoon"
    ? "Книга готовится: мы добавим полный текст, переводы слов, аудио и упражнения."
    : book.excerpt.length > 156 ? `${book.excerpt.slice(0, 153)}...` : book.excerpt;
  const timeLabel = progressInfo.isStarted ? `Читали ${formatReadingDuration(progressInfo.totalReadingSeconds)}` : "Ещё не читали";
  const metaLine = cardState.availability === "comingSoon" ? `${level} · ${chapters}` : `${level} · ${chapters} · ${timeLabel}`;
  const progressLabel = progressInfo.isCompleted
    ? (book.type === "story" ? "Рассказ прочитан ✓" : "Книга прочитана ✓")
    : progressInfo.isStarted
      ? `${safeProgress}% прочитано`
      : "Ещё не начинали";
  const locationLabel = getProgressLocationLabel(book, progressInfo);
  const buttonLabel = cardState.primaryAction === "comingSoon"
    ? "Скоро"
    : progressInfo.isCompleted
      ? book.type === "story" ? "Открыть рассказ" : "Открыть книгу"
      : progressInfo.isStarted
        ? "Продолжить"
        : book.type === "story"
          ? "Начать рассказ"
          : "Начать читать";

  return { safeProgress, level, chapters, description, metaLine, progressLabel, locationLabel, buttonLabel };
}

function LibraryPage({
  onOpenBook,
  onShowBookInfo,
  onHideBookInfo,
  onOpenBookSheet,
  progress,
  bookProgress,
}: {
  onOpenBook: (bookId: string) => void;
  onShowBookInfo: (book: HomeShelfBook, progressInfo: BookReadingProgress, rect: BookRect) => void;
  onHideBookInfo: () => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressInfo: BookReadingProgress }) => void;
  progress: Record<string, number>;
  bookProgress: Record<string, BookReadingProgress>;
}) {
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState<"all" | "books" | "stories" | "originals">("all");
  const [libraryCategory, setLibraryCategory] = useState<string | null>(null);
  const selectedCategory = libraryShelves.find((shelf) => shelf.id === libraryCategory) ?? null;

  const shelvesToShow = selectedCategory ? [selectedCategory] : libraryShelves;
  const visibleShelves = shelvesToShow
    .map((shelf) => ({
      ...shelf,
      books: shelf.books.filter((book) => {
        const matchesQuery = `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase());
        const matchesType =
          contentType === "all"
            ? true
            : contentType === "originals"
            ? book.original
            : contentType === "books"
              ? book.type === "book"
              : book.type === "story";
        return matchesQuery && matchesType;
      }),
    }))
    .filter((shelf) => shelf.books.length > 0);

  return (
    <main className="page-stack library-page">
      <section className="library-header">
        <span className="eyebrow">StoryLingo</span>
        {selectedCategory ? (
          <button className="library-back-button" type="button" onClick={() => setLibraryCategory(null)}>
            <ArrowLeft size={18} aria-hidden="true" />
            Назад
          </button>
        ) : null}
        <h1>{selectedCategory ? selectedCategory.title : "Библиотека"}</h1>
        <p>{selectedCategory ? "Полный список выбранной категории." : "Каталог книг и рассказов StoryLingo."}</p>
      </section>

      {!selectedCategory ? (
        <section className="library-controls">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти книгу или рассказ" />
          </label>
          <div className="library-tabs" aria-label="Тип контента">
            <button className={contentType === "books" ? "active" : ""} type="button" onClick={() => setContentType(contentType === "books" ? "all" : "books")}>Книги</button>
            <button className={contentType === "stories" ? "active" : ""} type="button" onClick={() => setContentType(contentType === "stories" ? "all" : "stories")}>Рассказы</button>
            <button className={contentType === "originals" ? "active" : ""} type="button" onClick={() => setContentType(contentType === "originals" ? "all" : "originals")}>Originals</button>
          </div>
          <div className="library-filters" aria-label="Фильтры каталога">
            <span>Уровень: A2-B1</span>
            <span>Жанр: все</span>
            <span>Сортировка: популярное</span>
          </div>
        </section>
      ) : null}

      {visibleShelves.map((shelf) => (
        <ShelfSection
          key={shelf.id}
          title={shelf.title}
          onViewAll={() => {
            setQuery("");
            setContentType("all");
            setLibraryCategory(shelf.id);
          }}
          showViewAll={!selectedCategory}
        >
          {selectedCategory ? (
            <FullCategoryBooks
              books={shelf.books}
              onHideBookInfo={onHideBookInfo}
              onOpenBook={onOpenBook}
              onOpenBookSheet={onOpenBookSheet}
              onShowBookInfo={onShowBookInfo}
              progress={progress}
              bookProgress={bookProgress}
            />
          ) : (
            <LibraryShelfScroller
              books={shelf.books}
              onHideBookInfo={onHideBookInfo}
              onOpenBook={onOpenBook}
              onOpenBookSheet={onOpenBookSheet}
              onShowBookInfo={onShowBookInfo}
              progress={progress}
              bookProgress={bookProgress}
            />
          )}
        </ShelfSection>
      ))}
    </main>
  );
}

function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "errors" | "learned">("all");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [removedWord, setRemovedWord] = useState<SavedVocabularyWord | null>(null);
  const speech = useSpeech();
  const { savedWords, removeWord, restoreWord, startTrainingSession, recordAnswer, finishTrainingSession } = useSavedVocabulary();
  const dictionaryWords = savedWords.filter(isDisplayableVocabularyWord);
  const trainableWords = dictionaryWords.filter(isTrainableVocabularyWord);
  const visibleWords = dictionaryWords
    .filter((word) => {
      const value = query.trim().toLowerCase();
      if (!value) return true;
      return word.word.toLowerCase().includes(value) || word.translation.toLowerCase().includes(value) || word.lemma.toLowerCase().includes(value);
    })
    .filter((word) => {
      const progress = getVocabularyProgress(word);
      if (filter === "new") return progress.status === "new";
      if (filter === "learned") return progress.status === "learned";
      if (filter === "errors") return (progress.unresolvedIncorrectCount ?? 0) > 0;
      return true;
    })
    .slice(0, 36);

  if (practiceOpen) {
    return (
      <VocabularyTrainingScreen
        words={trainableWords}
        onBack={() => setPracticeOpen(false)}
        onFinishSession={finishTrainingSession}
        onRecordAnswer={recordAnswer}
        onSpeak={speech.toggle}
        onStartSession={startTrainingSession}
      />
    );
  }

  function handleRemoveWord(word: SavedVocabularyWord) {
    setRemovedWord(word);
    removeWord(word.lexicalEntryId);
  }

  function undoRemoveWord() {
    if (!removedWord) return;
    restoreWord(removedWord);
    setRemovedWord(null);
  }

  return (
    <main className="page-stack">
      <PageTitle title="Словарь" text="Слова из текущей базы StoryLingo с переводом, транскрипцией и аудио." />
      <section className="dictionary-toolbar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти слово или перевод" />
        </label>
        {trainableWords.length ? (
          <button className="primary-button" type="button" onClick={() => setPracticeOpen(true)}>
            Тренировать {trainableWords.length} {pluralizeRussian(trainableWords.length, "слово", "слова", "слов")}
          </button>
        ) : null}
      </section>
      {savedWords.length ? (
        <div className="dictionary-filters" role="group" aria-label="Фильтр словаря">
          {[
            ["all", "Все"],
            ["new", "Новые"],
            ["errors", "С ошибками"],
            ["learned", "Изученные"],
          ].map(([id, label]) => (
            <button
              className={filter === id ? "active" : ""}
              key={id}
              type="button"
              onClick={() => setFilter(id as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {visibleWords.length ? (
        <section className="word-grid">
          {visibleWords.map((word) => (
            <WordRow key={word.id} word={word} onRemove={handleRemoveWord} onSpeak={speech.toggle} />
          ))}
        </section>
      ) : (
        <section className="practice-placeholder">
          <strong>{dictionaryWords.length ? "В этом фильтре пока пусто" : "Пока слов нет"}</strong>
          <p>{dictionaryWords.length ? "Попробуйте выбрать другой фильтр или продолжить тренировку." : "Нажимайте на слова во время чтения и добавляйте их сюда."}</p>
        </section>
      )}
      {removedWord ? (
        <div className="dictionary-toast" role="status">
          <span>Слово удалено</span>
          <button type="button" onClick={undoRemoveWord}>Отменить</button>
        </div>
      ) : null}
    </main>
  );
}

type VocabularyTaskType = "translation-choice" | "word-choice" | "context-choice" | "typed-translation";

type VocabularyTrainingTask = {
  id: string;
  type: VocabularyTaskType;
  word: SavedVocabularyWord;
  prompt: string;
  context?: string;
  options: string[];
  correctAnswer: string;
};

type VocabularyFeedback = {
  task: VocabularyTrainingTask;
  answer: string;
  isCorrect: boolean;
};

const reserveVocabularyOptions: Array<Pick<SavedVocabularyWord, "word" | "translation" | "partOfSpeech">> = [
  { word: "rabbit", translation: "кролик", partOfSpeech: "noun" },
  { word: "bank", translation: "берег", partOfSpeech: "noun" },
  { word: "watch", translation: "часы", partOfSpeech: "noun" },
  { word: "cupboard", translation: "шкаф", partOfSpeech: "noun" },
  { word: "curious", translation: "любопытный", partOfSpeech: "adjective" },
  { word: "suddenly", translation: "внезапно", partOfSpeech: "adverb" },
  { word: "fall", translation: "падать", partOfSpeech: "verb" },
  { word: "garden", translation: "сад", partOfSpeech: "noun" },
  { word: "door", translation: "дверь", partOfSpeech: "noun" },
  { word: "little", translation: "маленький", partOfSpeech: "adjective" },
  { word: "drink", translation: "пить", partOfSpeech: "verb" },
  { word: "think", translation: "думать", partOfSpeech: "verb" },
];

function VocabularyTrainingScreen({
  words,
  allWords,
  onBack,
  onFinishSession,
  onRecordAnswer,
  onSpeak,
  onStartSession,
  backLabel = "← Вернуться в словарь",
  introEyebrow = "Личный словарь",
  introTitle = "Тренировка слов",
  introDescription = "В тренировку попадут только слова, которые вы сами сохранили во время чтения.",
  resultReturnLabel = "Вернуться в словарь",
}: {
  words: SavedVocabularyWord[];
  allWords?: SavedVocabularyWord[];
  onBack: () => void;
  onFinishSession: (sessionId: string) => void;
  onRecordAnswer: (wordId: string, isCorrect: boolean, sessionId: string) => void;
  onSpeak: (text: string) => void;
  onStartSession: () => string;
  backLabel?: string;
  introEyebrow?: string;
  introTitle?: string;
  introDescription?: string;
  resultReturnLabel?: string;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<VocabularyTrainingTask[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<VocabularyFeedback | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<SavedVocabularyWord[]>([]);
  const [retrySession, setRetrySession] = useState(false);
  const [phase, setPhase] = useState<"intro" | "training" | "result">("intro");
  const availableWords = words.slice(0, 10);
  const taskCount = Math.min(15, Math.max(availableWords.length, Math.min(availableWords.length * 2, 15)));
  const currentTask = tasks[index];
  const progressValue = tasks.length ? Math.round((index / tasks.length) * 100) : 0;

  useEffect(() => {
    return () => {
      if (sessionId) onFinishSession(sessionId);
    };
  }, [onFinishSession, sessionId]);

  function start(wordsForSession = availableWords, retry = false) {
    const nextSessionId = onStartSession();
    const nextTasks = buildVocabularyTrainingTasks(wordsForSession, allWords ?? words, retry);
    setSessionId(nextSessionId);
    setTasks(nextTasks);
    setIndex(0);
    setFeedback(null);
    setTypedAnswer("");
    setCorrectCount(0);
    setMistakes([]);
    setRetrySession(retry);
    setPhase("training");
  }

  function submitAnswer(answer: string) {
    if (!currentTask || !sessionId || feedback) return;
    const isCorrect = isVocabularyAnswerCorrect(currentTask, answer);
    onRecordAnswer(currentTask.word.lexicalEntryId, isCorrect, sessionId);
    setFeedback({ task: currentTask, answer, isCorrect });
    if (isCorrect) {
      setCorrectCount((current) => current + 1);
    } else {
      setMistakes((current) => (
        current.some((word) => word.lexicalEntryId === currentTask.word.lexicalEntryId)
          ? current
          : [...current, currentTask.word]
      ));
    }
  }

  function continueTraining() {
    if (!feedback) return;
    setFeedback(null);
    setTypedAnswer("");
    if (index >= tasks.length - 1) {
      if (sessionId) onFinishSession(sessionId);
      setSessionId(null);
      setPhase("result");
      return;
    }
    setIndex((current) => current + 1);
  }

  function retryMistakes() {
    if (!mistakes.length) return;
    start(mistakes, true);
  }

  if (phase === "intro") {
    return (
      <main className="page-stack vocabulary-training-page">
        <button className="text-button" type="button" onClick={onBack}>{backLabel}</button>
        <section className="training-card training-intro">
          <span className="eyebrow">{introEyebrow}</span>
          <h1>{introTitle}</h1>
          <p>{introDescription}</p>
          <div className="training-summary">
            <Metric label="Слов" value={availableWords.length.toString()} />
            <Metric label="Заданий" value={taskCount.toString()} />
            <Metric label="Время" value={`${Math.max(1, Math.ceil(taskCount * 0.35))} мин`} />
          </div>
          <button className="primary-button" type="button" onClick={() => start()}>
            Начать тренировку
          </button>
        </section>
      </main>
    );
  }

  if (phase === "result") {
    const incorrectCount = tasks.length - correctCount;
    const percent = tasks.length ? Math.round((correctCount / tasks.length) * 100) : 0;
    return (
      <main className="page-stack vocabulary-training-page">
        <section className="training-card training-result">
          <span className="eyebrow">{mistakes.length ? "Итог" : "Отлично"}</span>
          <h1>{retrySession && !mistakes.length ? "Все ошибки исправлены" : "Тренировка завершена"}</h1>
          <div className="training-summary">
            <Metric label="Правильно" value={correctCount.toString()} />
            <Metric label="Ошибок" value={incorrectCount.toString()} />
            <Metric label="Результат" value={`${percent}%`} />
          </div>
          {mistakes.length ? (
            <div className="training-hard-words">
              <strong>Сложные слова</strong>
              <p>{mistakes.map((word) => word.word).join(", ")}</p>
            </div>
          ) : (
            <p className="training-success-note">Все ответы правильные.</p>
          )}
          <div className="training-result-actions">
            {mistakes.length ? (
              <button className="secondary-button" type="button" onClick={retryMistakes}>
                Повторить ошибки
              </button>
            ) : null}
            <button className="primary-button" type="button" onClick={onBack}>
              {resultReturnLabel}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-stack vocabulary-training-page">
      <section className="training-card training-task-card">
        <div className="training-topline">
          <button className="text-button" type="button" onClick={onBack}>{backLabel}</button>
          <span>{Math.min(index + 1, tasks.length)} / {tasks.length}</span>
          <small>Ошибок: {mistakes.length}</small>
        </div>
        <Progress value={progressValue} />
        {currentTask ? (
          <article className="training-task">
            <span className="eyebrow">{trainingTaskLabel(currentTask.type)}</span>
            <button className="audio-button training-audio" type="button" aria-label={`Прослушать ${currentTask.word.word}`} onClick={() => onSpeak(currentTask.word.word)}>
              <Volume2 size={17} aria-hidden="true" />
            </button>
            <h2>{currentTask.prompt}</h2>
            {currentTask.context ? <p className="training-context">{currentTask.context}</p> : null}
            {currentTask.type === "typed-translation" ? (
              <form
                className="typed-answer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitAnswer(typedAnswer);
                }}
              >
                <input
                  value={typedAnswer}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder="Введите перевод"
                  aria-label="Введите перевод"
                />
                <button className="primary-button" type="submit" disabled={!typedAnswer.trim()}>
                  Проверить
                </button>
              </form>
            ) : (
              <div className="training-options">
                {currentTask.options.map((option) => (
                  <button key={option} type="button" onClick={() => submitAnswer(option)}>
                    {option}
                  </button>
                ))}
              </div>
            )}
          </article>
        ) : null}
        {feedback ? (
          <section className={feedback.isCorrect ? "training-feedback correct" : "training-feedback incorrect"} aria-live="polite">
            <strong>{feedback.isCorrect ? "Правильно" : "Нужно повторить"}</strong>
            {!feedback.isCorrect ? <p>Ваш ответ: {feedback.answer || "—"}</p> : null}
            <p>Правильно: {feedback.task.correctAnswer}</p>
            <small>{feedback.task.word.word} — {feedback.task.word.translation}</small>
            {feedback.task.word.contexts[0]?.sentenceText ? <p>{feedback.task.word.contexts[0].sentenceText}</p> : null}
            <button className="primary-button" type="button" onClick={continueTraining}>
              Продолжить
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function buildVocabularyTrainingTasks(words: SavedVocabularyWord[], allWords: SavedVocabularyWord[], retry = false) {
  const sessionWords = shuffleArray(words).slice(0, 10);
  const types: VocabularyTaskType[] = retry
    ? ["context-choice", "typed-translation", "translation-choice", "word-choice"]
    : ["translation-choice", "word-choice", "context-choice", "typed-translation"];
  const targetCount = Math.min(15, Math.max(sessionWords.length, Math.min(sessionWords.length * 2, 15)));
  const tasks: VocabularyTrainingTask[] = [];
  let cursor = 0;

  while (tasks.length < targetCount && sessionWords.length) {
    const word = sessionWords[cursor % sessionWords.length];
    const previous = tasks.at(-1)?.word.lexicalEntryId;
    const nextWord = previous === word.lexicalEntryId && sessionWords.length > 1
      ? sessionWords[(cursor + 1) % sessionWords.length]
      : word;
    const type = types[(tasks.length + (retry ? 1 : 0)) % types.length];
    tasks.push(createVocabularyTask(nextWord, type, allWords, tasks.length));
    cursor++;
  }

  return tasks;
}

function createVocabularyTask(word: SavedVocabularyWord, type: VocabularyTaskType, allWords: SavedVocabularyWord[], index: number): VocabularyTrainingTask {
  const distractors = getVocabularyDistractors(word, allWords, type);
  const context = word.contexts[0]?.sentenceText;
  const displayTranslation = getVocabularyDisplayTranslation(word).primary;
  if (type === "word-choice") {
    return {
      id: `${word.lexicalEntryId}-${type}-${index}`,
      type,
      word,
      prompt: displayTranslation,
      options: shuffleArray([word.word, ...distractors.map((item) => item.word)]).slice(0, 4),
      correctAnswer: word.word,
    };
  }

  if (type === "context-choice") {
    return {
      id: `${word.lexicalEntryId}-${type}-${index}`,
      type,
      word,
      prompt: "Вставьте слово в контекст",
      context: makeVocabularyContextGap(context ?? word.contexts[0]?.contextualPhrase ?? word.word, word),
      options: shuffleArray([word.word, ...distractors.map((item) => item.word)]).slice(0, 4),
      correctAnswer: word.word,
    };
  }

  if (type === "typed-translation") {
    return {
      id: `${word.lexicalEntryId}-${type}-${index}`,
      type,
      word,
      prompt: word.word,
      options: [],
      correctAnswer: displayTranslation,
    };
  }

  return {
    id: `${word.lexicalEntryId}-${type}-${index}`,
    type,
    word,
    prompt: word.word,
    options: shuffleArray([displayTranslation, ...distractors.map((item) => getVocabularyDisplayTranslation(item as SavedVocabularyWord).primary)]).slice(0, 4),
    correctAnswer: displayTranslation,
  };
}

function getVocabularyDistractors(word: SavedVocabularyWord, allWords: SavedVocabularyWord[], type: VocabularyTaskType) {
  const source = [
    ...allWords.filter((item) => item.lexicalEntryId !== word.lexicalEntryId),
    ...reserveVocabularyOptions.map((item, index) => ({
      id: `reserve-${index}`,
      lexicalEntryId: `reserve-${index}`,
      lemma: item.word,
      contexts: [],
      createdAt: "",
      progress: { correctCount: 0, incorrectCount: 0, sessionsCorrect: 0, status: "new" as const, unresolvedIncorrectCount: 0 },
      ...item,
    })),
  ];
  const preferred = source.filter((item) => item.partOfSpeech && item.partOfSpeech === word.partOfSpeech);
  const candidates = preferred.length >= 3 ? preferred : source;
  const seen = new Set<string>([type === "translation-choice" ? getVocabularyDisplayTranslation(word).primary : word.word]);
  const distractors: Array<Pick<SavedVocabularyWord, "word" | "translation" | "partOfSpeech">> = [];

  shuffleArray(candidates).forEach((item) => {
    const value = type === "translation-choice" ? getVocabularyDisplayTranslation(item as SavedVocabularyWord).primary : item.word;
    if (!value || seen.has(value) || (type === "translation-choice" && !hasValidTranslation(value, item.word))) return;
    seen.add(value);
    distractors.push(item);
  });

  return distractors.slice(0, 3);
}

function isVocabularyAnswerCorrect(task: VocabularyTrainingTask, answer: string) {
  const normalizedAnswer = normalizeVocabularyAnswer(answer);
  if (!normalizedAnswer) return false;
  if (task.type !== "typed-translation") return normalizedAnswer === normalizeVocabularyAnswer(task.correctAnswer);
  return getVocabularyAcceptedTranslations(task.word).some((item) => normalizeVocabularyAnswer(item) === normalizedAnswer);
}

function makeVocabularyContextGap(context: string, word: SavedVocabularyWord) {
  const target = word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${target}\\b`, "i");
  if (regex.test(context)) return context.replace(regex, "______");
  return `${context}  ______`;
}

function trainingTaskLabel(type: VocabularyTaskType) {
  if (type === "word-choice") return "Выберите английское слово";
  if (type === "context-choice") return "Контекст";
  if (type === "typed-translation") return "Введите перевод";
  return "Выберите перевод";
}

function getVocabularyProgress(word: SavedVocabularyWord) {
  return word.progress ?? { correctCount: 0, incorrectCount: 0, sessionsCorrect: 0, status: "new" as const, unresolvedIncorrectCount: 0 };
}

function isTrainableVocabularyWord(word: SavedVocabularyWord) {
  return !word.isInvalid && hasValidTranslation(getVocabularyDisplayTranslation(word).primary, word.word);
}

function isDisplayableVocabularyWord(word: SavedVocabularyWord) {
  return !word.isInvalid && hasValidTranslation(getVocabularyDisplayTranslation(word).primary, word.word);
}

function getSavedWordsForChapter(words: SavedVocabularyWord[], bookId: string, chapterId: string) {
  return dedupeVocabularyWords(
    words.filter((word) => (
      isTrainableVocabularyWord(word) &&
      word.contexts.some((context) => context.bookId === bookId && context.chapterId === chapterId)
    )),
  );
}

function getSavedWordsForBook(words: SavedVocabularyWord[], bookId: string) {
  return dedupeVocabularyWords(
    words.filter((word) => (
      isTrainableVocabularyWord(word) &&
      word.contexts.some((context) => context.bookId === bookId)
    )),
  );
}

function dedupeVocabularyWords(words: SavedVocabularyWord[]) {
  const unique = new Map<string, SavedVocabularyWord>();
  words.forEach((word) => {
    if (!unique.has(word.lexicalEntryId)) unique.set(word.lexicalEntryId, word);
  });
  return Array.from(unique.values());
}

function getReadingSecondsForChapter(sessions: ReadingSession[], bookId: string, chapterId: string, currentSessionSeconds = 0) {
  const savedSeconds = sessions
    .filter((session) => session.contentId === bookId && session.chapterId === chapterId)
    .reduce((total, session) => total + session.durationSeconds, 0);
  return savedSeconds + currentSessionSeconds;
}

function getReadingSecondsForBook(sessions: ReadingSession[], bookId: string, currentSessionSeconds = 0) {
  const savedSeconds = sessions
    .filter((session) => session.contentId === bookId)
    .reduce((total, session) => total + session.durationSeconds, 0);
  return savedSeconds + currentSessionSeconds;
}

function buildBookReadingProgressMap(books: HomeShelfBook[], progress: { readingProgress: Record<string, number>; chapterCompletions?: Record<string, ChapterCompletion>; bookCompletions?: Record<string, BookCompletion> }, sessions: ReadingSession[]) {
  return books.reduce<Record<string, BookReadingProgress>>((result, book) => {
    result[book.id] = getBookReadingProgress(book, progress, sessions);
    return result;
  }, {});
}

function getBookReadingProgress(book: HomeShelfBook, progress: { readingProgress: Record<string, number>; chapterCompletions?: Record<string, ChapterCompletion>; bookCompletions?: Record<string, BookCompletion> }, sessions: ReadingSession[]): BookReadingProgress {
  if (book.comingSoon) return getEmptyBookProgress(book);

  const readerBook = getReaderBook(book.id);
  const savedPosition = readReaderPosition(book.id);
  const totalChapterCount = readerBook?.chapters.length ?? getChapterCountFromBook(book);
  const completedChapterIds = readerBook?.chapters
    .filter((chapter) => progress.chapterCompletions?.[getChapterCompletionKey(book.id, chapter.id)]?.completed)
    .map((chapter) => chapter.id) ?? [];
  const completedChapterCount = completedChapterIds.length;
  const totalReadingSeconds = sessions
    .filter((session) => session.contentId === book.id)
    .reduce((sum, session) => sum + session.durationSeconds, 0);
  const allChaptersCompleted = readerBook
    ? readerBook.chapters.every((chapter) => completedChapterIds.includes(chapter.id))
    : totalChapterCount > 0 && completedChapterCount >= totalChapterCount;
  const isCompleted = allChaptersCompleted && Boolean(progress.bookCompletions?.[book.id]?.completed ?? true);
  const savedProgress = progress.readingProgress[book.id] ?? 0;
  const positionProgress = savedPosition?.progressRatio !== undefined ? Math.round(savedPosition.progressRatio * 100) : 0;
  const fallbackChapterProgress = totalChapterCount > 0 ? Math.round((completedChapterCount / totalChapterCount) * 100) : 0;
  const rawProgress = isCompleted ? 100 : Math.max(positionProgress, fallbackChapterProgress, savedProgress);
  const progressPercent = Math.min(isCompleted ? 100 : 99, Math.max(0, Math.round(rawProgress)));
  const lastOpenedChapter = readerBook?.chapters.find((chapter) => chapter.id === savedPosition?.chapterId);
  const nextChapter = readerBook?.chapters.find((chapter) => !completedChapterIds.includes(chapter.id));
  const isStarted = progressPercent > 0 || totalReadingSeconds > 0 || Boolean(savedPosition);

  return {
    progressPercent: isCompleted ? 100 : progressPercent,
    completedChapterCount,
    totalChapterCount,
    isStarted,
    isCompleted,
    lastOpenedChapterId: lastOpenedChapter?.id ?? savedPosition?.chapterId,
    lastOpenedChapterNumber: lastOpenedChapter?.number,
    lastOpenedChapterTitle: lastOpenedChapter?.title,
    nextChapterId: nextChapter?.id,
    nextChapterNumber: nextChapter?.number,
    nextChapterTitle: nextChapter?.title,
    totalReadingSeconds,
  };
}

function getBookCardState(book: HomeShelfBook, progressInfo: BookReadingProgress): BookCardState {
  if (book.comingSoon) {
    return {
      availability: "comingSoon",
      canOpen: false,
      showProgress: false,
      primaryAction: "comingSoon",
    };
  }

  return {
    availability: "available",
    canOpen: true,
    showProgress: true,
    progressPercent: progressInfo.progressPercent,
    primaryAction: progressInfo.isCompleted ? "open" : progressInfo.isStarted ? "continue" : "start",
  };
}

function getEmptyBookProgress(book: HomeShelfBook): BookReadingProgress {
  return {
    progressPercent: 0,
    completedChapterCount: 0,
    totalChapterCount: getReaderBook(book.id)?.chapters.length ?? getChapterCountFromBook(book),
    isStarted: false,
    isCompleted: false,
    totalReadingSeconds: 0,
  };
}

function getChapterCountFromBook(book: HomeShelfBook) {
  if (book.type === "story") return 1;
  const match = book.chapters?.match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function getProgressLocationLabel(book: HomeShelfBook, progressInfo: BookReadingProgress) {
  if (!progressInfo.isStarted) return book.type === "story" ? "1 рассказ" : `${progressInfo.totalChapterCount} глав`;
  if (progressInfo.isCompleted) {
    return book.type === "story" ? "Рассказ прочитан" : `Все ${progressInfo.totalChapterCount} глав прочитаны`;
  }
  if (book.type === "story") return `${progressInfo.progressPercent}% рассказа`;
  if (progressInfo.lastOpenedChapterNumber) {
    return `Остановились: глава ${progressInfo.lastOpenedChapterNumber} · ${progressInfo.lastOpenedChapterTitle}`;
  }
  if (progressInfo.nextChapterNumber) {
    return `Следующая: глава ${progressInfo.nextChapterNumber} · ${progressInfo.nextChapterTitle}`;
  }
  return `Прочитано ${progressInfo.completedChapterCount} из ${progressInfo.totalChapterCount} глав`;
}

function formatReadingDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  if (safeSeconds < 60) return "меньше минуты";
  const totalMinutes = Math.round(safeSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} ${pluralizeRussian(totalMinutes, "минута", "минуты", "минут")}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes
    ? `${hours} ч ${minutes} мин`
    : `${hours} ч`;
}

function capitalizeFirst(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function vocabularyStatusLabel(word: SavedVocabularyWord) {
  const status = getVocabularyProgress(word).status;
  if (status === "learned") return "Изучено";
  if (status === "learning") return "Изучается";
  return "Новое";
}

function pluralizeRussian(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function shuffleArray<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function ContentDetailPage({
  book,
  progressInfo,
  chapterCompletions,
  onBack,
  onOpen,
}: {
  book: HomeShelfBook;
  progressInfo: BookReadingProgress;
  chapterCompletions: Record<string, ChapterCompletion>;
  onBack: () => void;
  onOpen: (bookId: string, options?: OpenContentOptions) => void;
}) {
  const meta = getBookInfoMeta(book, progressInfo);
  const cardState = getBookCardState(book, progressInfo);
  const readerBook = getReaderBook(book.id);
  const firstChapter = readerBook?.chapters[0];

  function openChapter(chapterId: string) {
    onOpen(book.id, {
      chapterId,
      readingProgress: progressInfo.isCompleted ? 100 : progressInfo.progressPercent,
      scrollPosition: 0,
      restorePosition: false,
    });
  }

  return (
    <main className="page-stack content-detail-page">
      <button className="text-button" type="button" onClick={onBack}>← Назад</button>
      <section className="content-detail-card">
        <div className="content-detail-cover">
          <BookCover book={book} progressInfo={progressInfo} onOpen={onOpen} featured />
        </div>
        <div className="content-detail-copy">
          <span className="eyebrow">{book.type === "story" ? "Рассказ" : "Книга"}</span>
          <h1>{book.title}</h1>
          <p>{book.author}</p>
          <div className="content-detail-meta">
            <span>{meta.level}</span>
            <span>{meta.chapters}</span>
            <span>{cardState.availability === "comingSoon" ? "Скоро" : progressInfo.isStarted ? `Читали ${formatReadingDuration(progressInfo.totalReadingSeconds)}` : "Ещё не читали"}</span>
          </div>
          {cardState.availability === "comingSoon" ? <strong className="soon-status">Скоро</strong> : null}
          <p className="content-detail-description">{meta.description}</p>
          {cardState.showProgress ? (
            <div className="content-detail-progress">
              <BookProgressBar
                percent={progressInfo.progressPercent}
                isCompleted={progressInfo.isCompleted}
                label={meta.progressLabel}
              />
            </div>
          ) : null}
          {cardState.canOpen ? <small className="book-progress-location">{meta.locationLabel}</small> : null}
          <button
            className="primary-button"
            type="button"
            disabled={!cardState.canOpen}
            onClick={() => {
              if (!cardState.canOpen) return;
              if (progressInfo.isCompleted && firstChapter) {
                openChapter(firstChapter.id);
                return;
              }
              onOpen(book.id);
            }}
          >
            {cardState.canOpen ? (progressInfo.isCompleted ? "Перечитать" : meta.buttonLabel) : "Скоро будет доступно"}
          </button>
        </div>
      </section>
      {readerBook && cardState.canOpen ? (
        <section className="content-chapters-panel">
          <div className="content-chapters-heading">
            <div>
              <span className="eyebrow">Главы</span>
              <h2>Выберите главу</h2>
            </div>
            {progressInfo.isCompleted ? <span className="book-progress-location">Книга прочитана · можно перечитывать с любой главы</span> : null}
          </div>
          <div className="content-chapter-list">
            {readerBook.chapters.map((chapter) => {
              const isCompleted = Boolean(chapterCompletions[getChapterCompletionKey(book.id, chapter.id)]?.completed);
              return (
                <button key={chapter.id} type="button" className="content-chapter-button" onClick={() => openChapter(chapter.id)}>
                  <span>{chapter.number}</span>
                  <strong>{chapter.title}</strong>
                  {isCompleted ? <small>Прочитано</small> : <small>Открыть</small>}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ProfilePage({
  language,
  bookProgress,
  onSelectLanguage,
  readingTimer,
}: {
  language: NativeLanguage;
  bookProgress: Record<string, BookReadingProgress>;
  onSelectLanguage: (language: NativeLanguage) => void;
  readingTimer: ReturnType<typeof useReadingTimer>;
}) {
  const auth = useAuth();
  const { savedWords } = useSavedVocabulary();
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const totalReadingSeconds = readingTimer.sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const availableBookIds = new Set(homeShelfBooks.filter((book) => book.type === "book" && !book.comingSoon).map((book) => book.id));
  const completedBookCount = Object.entries(bookProgress).filter(([bookId, item]) => availableBookIds.has(bookId) && item.isCompleted).length;
  const inProgressBookCount = Object.entries(bookProgress).filter(([bookId, item]) => availableBookIds.has(bookId) && item.isStarted && !item.isCompleted).length;

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.isLoading) return;
    if (authMode === "register") {
      await auth.register(email.trim(), password);
    } else {
      await auth.login(email.trim(), password);
    }
  }

  return (
    <main className="page-stack profile-page">
      <PageTitle title="Профиль" text={auth.isAuthenticated ? "Аккаунт StoryLingo и синхронизация прогресса." : "Читайте без регистрации или сохраните прогресс в аккаунте."} />
      <section className="profile-panel account-panel">
        {auth.isAuthenticated ? (
          <>
            <div>
              <span className="eyebrow">Аккаунт</span>
              <h2>{auth.user?.email}</h2>
              <p>Ваш прогресс, слова и настройки чтения сохраняются для продолжения обучения с любого устройства.</p>
            </div>
            <button className="secondary-button" type="button" disabled={auth.isLoading} onClick={auth.logout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <div className="account-copy">
              <span className="eyebrow">Аккаунт</span>
              <h2>Создайте аккаунт бесплатно</h2>
              <p>Сохраняйте:</p>
              <ul className="account-benefits">
                <li>✓ прогресс книг</li>
                <li>✓ изученные слова</li>
                <li>✓ настройки чтения</li>
              </ul>
              <p>И продолжайте обучение с любого устройства.</p>
            </div>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
                <button className={authMode === "register" ? "active" : ""} type="button" onClick={() => setAuthMode("register")}>Создать аккаунт</button>
                <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>Войти</button>
              </div>
              <label>
                Email
                <input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                Пароль
                <input type="password" value={password} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={6} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              {auth.error ? <p className="auth-error" role="alert">{auth.error}</p> : null}
              <button className="primary-button" type="submit" disabled={auth.isLoading}>
                {auth.isLoading ? "Подождите..." : authMode === "register" ? "Создать аккаунт" : "Войти"}
              </button>
            </form>
          </>
        )}
      </section>
      <section className="profile-panel">
        <div>
          <span className="eyebrow">Язык интерфейса</span>
          <h2>{language === "Russian" ? "Русский" : "English"}</h2>
        </div>
        <div className="language-actions">
          <button className={language === "Russian" ? "active" : ""} type="button" onClick={() => onSelectLanguage("Russian")}>Русский</button>
          <button className={language === "English" ? "active" : ""} type="button" onClick={() => onSelectLanguage("English")}>English</button>
        </div>
      </section>
      <section className="profile-stats">
        <Metric label="Прочитано книг" value={completedBookCount.toString()} />
        <Metric label="Книг в процессе" value={inProgressBookCount.toString()} />
        <Metric label="Слов в словаре" value={savedWords.length.toString()} />
        <Metric label="Время чтения" value={formatReadingDuration(totalReadingSeconds)} />
      </section>
    </main>
  );
}

function ReaderPreview({
  book,
  progressValue,
  onBack,
  onProgress,
  onSessionUpdate,
  restoreScrollPosition,
  readingTimer,
  chapterCompletions,
  onChapterChange,
  onChapterComplete,
  onChapterOpen,
  onReturnToBook,
  onReturnToLibrary,
  onChangeGoal,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onBack: () => void;
  onProgress: (value: number) => void;
  onSessionUpdate: (scrollPosition: number) => void;
  restoreScrollPosition: number | null;
  readingTimer: ReturnType<typeof useReadingTimer>;
  chapterCompletions: Record<string, ChapterCompletion>;
  onChapterChange: (chapterId: string) => void;
  onChapterComplete: (completion: CompleteChapterInput) => void;
  onChapterOpen: (chapterId: string, readingProgress: number) => void;
  onReturnToBook: () => void;
  onReturnToLibrary: () => void;
  onChangeGoal: () => void;
}) {
  const speech = useSpeech();
  const { savedWords, startTrainingSession, recordAnswer, finishTrainingSession } = useSavedVocabulary();
  const { settings, setSettings } = useReadingSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(emptyPaginationSize);
  const [pageDirection, setPageDirection] = useState<"next" | "prev" | null>(null);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [chapterTrainingOpen, setChapterTrainingOpen] = useState(false);
  const [completionTrainingWords, setCompletionTrainingWords] = useState<SavedVocabularyWord[]>([]);
  const [completionTrainingScope, setCompletionTrainingScope] = useState<"chapter" | "book">("chapter");
  const [selectedWord, setSelectedWord] = useState<ReaderPageWord | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<ReaderPageWord | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try {
      return window.localStorage.getItem(READER_SWIPE_HINT_KEY) !== "true";
    } catch {
      return true;
    }
  });
  const timerButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const readingPageRef = useRef<HTMLElement | null>(null);
  const readingTextFrameRef = useRef<HTMLDivElement | null>(null);
  const onChapterChangeRef = useRef(onChapterChange);
  const onChapterOpenRef = useRef(onChapterOpen);
  const onProgressRef = useRef(onProgress);
  const onSessionUpdateRef = useRef(onSessionUpdate);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
  } | null>(null);
  const ghostClickUntilRef = useRef(0);
  const visibleWordIdBeforeRepaginate = useRef<string | null>(null);
  const restoredPositionKeyRef = useRef<string | null>(null);
  const titleReserveHeightRef = useRef(0);
  const readerBook = useMemo(() => getReaderBook(book.id), [book.id]);
  const [activeChapterId, setActiveChapterId] = useState(() => {
    const savedChapterId = readReaderPosition(book.id)?.chapterId;
    return savedChapterId ?? getReaderBook(book.id)?.chapters[0]?.id ?? "chapter-1";
  });
  const pendingChapterEdgeRef = useRef<"first" | "last" | null>(null);
  const chapter = useMemo(() => getReaderChapter(book.id, activeChapterId) ?? createFallbackChapter(book), [activeChapterId, book]);
  const chapterCount = readerBook?.chapterCount ?? readerBook?.chapters.length ?? 1;
  const readerFont = readerFontStack(settings.fontFamily);
  const { flatWords, isPaginating, pages } = useReaderPagination({
    chapter,
    fontFamily: readerFont,
    settings,
    size: pageSize,
  });
  const activePage = pages[currentPageIndex] ?? pages[0] ?? null;
  const bookPercent = Math.min(100, Math.max(progressValue, 0));
  const chapterWordOffsets = useMemo(() => {
    let total = 0;
    const offsets = new Map<string, number>();
    readerBook?.chapters.forEach((item) => {
      offsets.set(item.id, total);
      total += countReaderChapterWords(item);
    });
    return { offsets, total };
  }, [readerBook]);
  const firstVisibleWord = activePage?.words[0] ?? null;
  const lastVisibleWord = activePage?.words.at(-1) ?? null;
  const chapterStartWordCount = chapterWordOffsets.offsets.get(chapter.id) ?? 0;
  const totalBookWords = readerBook?.wordCount ?? chapterWordOffsets.total ?? Math.max(1, flatWords.length);
  const currentGlobalWordIndex = chapterStartWordCount + (lastVisibleWord?.absoluteIndex ?? firstVisibleWord?.absoluteIndex ?? 0) + 1;
  const visibleBookPercent = Math.min(100, Math.max(bookPercent, Math.round((currentGlobalWordIndex / Math.max(1, totalBookWords)) * 100)));
  const chapterIndex = readerBook?.chapters.findIndex((item) => item.id === chapter.id) ?? 0;
  const nextChapter = readerBook?.chapters[chapterIndex + 1] ?? null;
  const isFinalChapter = readerBook ? chapterIndex >= readerBook.chapters.length - 1 : true;
  const completedChapterIds = useMemo(() => new Set(
    readerBook?.chapters
      .filter((item) => chapterCompletions[getChapterCompletionKey(book.id, item.id)]?.completed)
      .map((item) => item.id) ?? [],
  ), [book.id, chapterCompletions, readerBook]);
  const completedChapterCount = completedChapterIds.size;
  const completionProgressCount = completionOpen
    ? new Set([...completedChapterIds, chapter.id]).size
    : completedChapterCount;
  const chapterSavedWords = getSavedWordsForChapter(savedWords, book.id, chapter.id);
  const bookSavedWords = getSavedWordsForBook(savedWords, book.id);
  const activeChapterSessionSeconds = readingTimer.timer.contentId === book.id && readingTimer.timer.chapterId === chapter.id
    ? readingTimer.currentSessionSeconds
    : 0;
  const activeBookSessionSeconds = readingTimer.timer.contentId === book.id ? readingTimer.currentSessionSeconds : 0;
  const chapterReadingSeconds = getReadingSecondsForChapter(readingTimer.sessions, book.id, chapter.id, activeChapterSessionSeconds);
  const bookReadingSeconds = getReadingSecondsForBook(readingTimer.sessions, book.id, activeBookSessionSeconds);
  const closeTimer = () => {
    setTimerOpen(false);
    window.setTimeout(() => timerButtonRef.current?.focus(), 0);
  };

  useEffect(() => {
    onChapterChangeRef.current = onChapterChange;
    onChapterOpenRef.current = onChapterOpen;
    onProgressRef.current = onProgress;
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onChapterChange, onChapterOpen, onProgress, onSessionUpdate]);

  useEffect(() => {
    onChapterChangeRef.current(chapter.id);
    onChapterOpenRef.current(chapter.id, bookPercent);
  }, [chapter.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    onSessionUpdateRef.current(0);

    const handleBeforeUnload = () => {
      onSessionUpdateRef.current(0);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      onSessionUpdateRef.current(0);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [book.id, restoreScrollPosition]);

  useEffect(() => {
    function measurePage() {
      const page = readingPageRef.current;
      const textFrame = readingTextFrameRef.current;
      if (!page || !textFrame) return;
      const pageStyles = window.getComputedStyle(page);
      const paddingTop = parseFloat(pageStyles.paddingTop) || 0;
      const paddingBottom = parseFloat(pageStyles.paddingBottom) || 0;
      const frameRect = textFrame.getBoundingClientRect();
      const contentHeight = Math.max(1, Math.floor(page.clientHeight - paddingTop - paddingBottom));
      const titleReserve = Math.max(0, contentHeight - Math.floor(frameRect.height));
      if (currentPageIndex === 0 || titleReserve > 0) {
        titleReserveHeightRef.current = titleReserve;
      }
      const nextSize = {
        width: Math.max(1, Math.floor(frameRect.width)),
        height: contentHeight,
        firstPageHeight: Math.max(1, contentHeight - titleReserveHeightRef.current),
      };
      setPageSize((current) => {
        if (
          current.width === nextSize.width &&
          current.height === nextSize.height &&
          current.firstPageHeight === nextSize.firstPageHeight
        ) return current;
        return nextSize;
      });
    }

    const observer = new ResizeObserver(measurePage);
    if (readingPageRef.current) observer.observe(readingPageRef.current);
    if (readingTextFrameRef.current) observer.observe(readingTextFrameRef.current);
    measurePage();
    window.addEventListener("resize", measurePage);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measurePage);
    };
  }, [currentPageIndex]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!settingsOpen) return;
      const target = event.target as Node;
      if (settingsPanelRef.current?.contains(target) || settingsButtonRef.current?.contains(target)) return;
      setSettingsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (pages.length === 0) return;
    const restoreKey = `${book.id}:${chapter.id}`;
    const pendingEdge = pendingChapterEdgeRef.current;
    if (pendingEdge) {
      setCurrentPageIndex(pendingEdge === "last" ? pages.length - 1 : 0);
      pendingChapterEdgeRef.current = null;
      restoredPositionKeyRef.current = restoreKey;
      return;
    }

    const repaginateWordId = visibleWordIdBeforeRepaginate.current;
    const shouldRestoreSavedPosition = !repaginateWordId && restoredPositionKeyRef.current !== restoreKey;
    const saved = shouldRestoreSavedPosition ? readReaderPosition(book.id) : null;
    const targetWordId = repaginateWordId ?? saved?.wordId;
    let nextIndex = targetWordId ? pages.findIndex((page) => page.words.some((word) => word.id === targetWordId)) : -1;

    if (nextIndex < 0 && saved?.sentenceId) {
      nextIndex = pages.findIndex((page) => page.words.some((word) => word.sentenceId === saved.sentenceId));
    }

    if (nextIndex < 0 && saved?.progressRatio !== undefined) {
      nextIndex = Math.min(pages.length - 1, Math.max(0, Math.floor(saved.progressRatio * pages.length)));
    }

    setCurrentPageIndex((current) => {
      if (nextIndex >= 0) return nextIndex;
      return Math.min(current, pages.length - 1);
    });
    visibleWordIdBeforeRepaginate.current = null;
    restoredPositionKeyRef.current = restoreKey;
  }, [book.id, chapter.id, pages]);

  useEffect(() => {
    if (!activePage || flatWords.length === 0 || pages.length === 0) return;
    const firstWord = activePage.words[0];
    const globalWordIndex = chapterStartWordCount + firstWord.absoluteIndex;
    const progressRatio = Math.min(1, Math.max(0, globalWordIndex / Math.max(1, totalBookWords - 1)));

    writeReaderPosition(book.id, {
      chapterId: chapter.id,
      paragraphId: firstWord.paragraphId,
      sentenceId: firstWord.sentenceId,
      wordId: firstWord.id,
      wordIndex: firstWord.absoluteIndex,
      progressRatio,
      updatedAt: new Date().toISOString(),
    });

    onSessionUpdateRef.current(0);

    if (visibleBookPercent > bookPercent) {
      onProgressRef.current(visibleBookPercent);
    }
  }, [activePage, book.id, bookPercent, chapter.id, chapterStartWordCount, flatWords.length, pages.length, totalBookWords, visibleBookPercent]);

  useEffect(() => {
    if (!timerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTimer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timerOpen]);

  useEffect(() => {
    setSelectedParagraph(null);
  }, [chapter.id]);

  function rememberCurrentWord() {
    visibleWordIdBeforeRepaginate.current = activePage?.firstWordId ?? null;
  }

  function updateReadingSettings(nextSettings: SetStateAction<ReadingSettings>) {
    rememberCurrentWord();
    setSettings(nextSettings);
  }

  function completeCurrentChapter() {
    const completedAt = new Date().toISOString();
    const nextCompletedChapterCount = readerBook
      ? new Set([
          ...readerBook.chapters
            .filter((item) => chapterCompletions[getChapterCompletionKey(book.id, item.id)]?.completed)
            .map((item) => item.id),
          chapter.id,
        ]).size
      : 1;
    const nextProgress = readerBook
      ? Math.round((nextCompletedChapterCount / Math.max(1, readerBook.chapters.length)) * 100)
      : 100;

    onChapterComplete({
      bookId: book.id,
      chapterId: chapter.id,
      chapterIds: readerBook?.chapters.map((item) => item.id) ?? [chapter.id],
      completedAt,
      readingSeconds: chapterReadingSeconds,
      savedWordsCount: chapterSavedWords.length,
      readingProgress: nextProgress,
    });
    saveOpenedContentForReader(chapter.id, nextProgress);
    readingTimer.finishSession();
    setCompletionOpen(true);
  }

  function saveOpenedContentForReader(chapterId: string, readingProgress: number) {
    onSessionUpdateRef.current(0);
    writeReaderPosition(book.id, {
      chapterId,
      paragraphId: firstVisibleWord?.paragraphId,
      sentenceId: firstVisibleWord?.sentenceId ?? `${chapterId}-complete`,
      wordId: firstVisibleWord?.id,
      wordIndex: firstVisibleWord?.absoluteIndex ?? 0,
      progressRatio: Math.min(1, Math.max(0, readingProgress / 100)),
      updatedAt: new Date().toISOString(),
    });
  }

  function turnPage(direction: "next" | "prev") {
    if (pages.length === 0 || isPageTurning) return;
    readingTimer.recordActivity();
    setSelectedWord(null);
    setSelectedParagraph(null);
    setShowSwipeHint(false);
    try {
      window.localStorage.setItem(READER_SWIPE_HINT_KEY, "true");
    } catch {
      // The hint is cosmetic; storage failures should not affect reading.
    }

    const canTurnNext = direction === "next" && currentPageIndex < pages.length - 1;
    const canTurnPrev = direction === "prev" && currentPageIndex > 0;

    if (!canTurnNext && !canTurnPrev) {
      const previousChapter = direction === "prev" ? readerBook?.chapters[chapterIndex - 1] : null;

      if (direction === "next") {
        completeCurrentChapter();
        return;
      }

      if (previousChapter) {
        pendingChapterEdgeRef.current = "last";
        visibleWordIdBeforeRepaginate.current = null;
        setActiveChapterId(previousChapter.id);
        setCurrentPageIndex(0);
        return;
      }

      return;
    }

    setIsPageTurning(true);
    setPageDirection(direction);
    setCurrentPageIndex((current) => current + (direction === "next" ? 1 : -1));
    window.setTimeout(() => {
      setPageDirection(null);
      setIsPageTurning(false);
    }, 240);
  }

  function goToNextPage() {
    turnPage("next");
  }

  function goToPreviousPage() {
    turnPage("prev");
  }

  function returnToCompletedPage() {
    setChapterTrainingOpen(false);
    setCompletionTrainingWords([]);
    setCompletionTrainingScope("chapter");
    setCompletionOpen(false);
    setCurrentPageIndex(Math.max(0, pages.length - 1));
    readingTimer.resumeTimer();
  }

  function openNextChapterFromCompletion() {
    if (!nextChapter) return;
    setCompletionOpen(false);
    setChapterTrainingOpen(false);
    setCompletionTrainingWords([]);
    setCompletionTrainingScope("chapter");
    pendingChapterEdgeRef.current = "first";
    visibleWordIdBeforeRepaginate.current = null;
    setActiveChapterId(nextChapter.id);
    setCurrentPageIndex(0);
    readingTimer.resumeTimer();
  }

  function openChapterTraining(scope: "chapter" | "book" = "chapter") {
    const words = scope === "book" ? bookSavedWords : chapterSavedWords;
    if (!words.length) return;
    setCompletionTrainingWords(words);
    setCompletionTrainingScope(scope);
    setChapterTrainingOpen(true);
  }

  function handleReaderKeyDown(event: KeyboardEvent) {
    if (isReaderInteractive(event.target)) return;

    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      goToNextPage();
    }

    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      goToPreviousPage();
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleReaderKeyDown);
    return () => window.removeEventListener("keydown", handleReaderKeyDown);
  });

  function handlePagePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (isReaderInteractive(event.target)) return;
    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  }

  function handlePagePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId || isReaderInteractive(event.target)) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const isSwipe = Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
    if (isSwipe) {
      ghostClickUntilRef.current = Date.now() + 420;
      if (deltaX < 0) goToNextPage();
      if (deltaX > 0) goToPreviousPage();
      return;
    }

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) return;
    if (window.getSelection()?.toString()) return;
    if (Date.now() < ghostClickUntilRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    if (relativeX > rect.width * 0.75) goToNextPage();
    if (relativeX < rect.width * 0.25) goToPreviousPage();
  }

  function handlePagePointerCancel() {
    touchStartRef.current = null;
  }

  if (chapterTrainingOpen) {
    return (
      <VocabularyTrainingScreen
        words={completionTrainingWords.length ? completionTrainingWords : chapterSavedWords}
        allWords={savedWords.filter(isTrainableVocabularyWord)}
        backLabel="← Вернуться к главе"
        introEyebrow={completionTrainingScope === "book" ? book.title : `Глава ${chapter.number}`}
        introTitle={completionTrainingScope === "book" ? "Повтор слов книги" : "Повтор слов главы"}
        introDescription={completionTrainingScope === "book" ? "В тренировку попадут только слова, сохранённые из этой книги." : "В тренировку попадут только слова, сохранённые из этой главы."}
        resultReturnLabel="Вернуться к завершению главы"
        onBack={() => setChapterTrainingOpen(false)}
        onFinishSession={finishTrainingSession}
        onRecordAnswer={recordAnswer}
        onSpeak={speech.toggle}
        onStartSession={startTrainingSession}
      />
    );
  }

  if (completionOpen) {
    return (
      <ChapterCompletionScreen
        book={book}
        chapter={chapter}
        chapterCount={chapterCount}
        completedChapterCount={completionProgressCount}
        readingSeconds={isFinalChapter ? bookReadingSeconds : chapterReadingSeconds}
        savedWordsCount={isFinalChapter ? bookSavedWords.length : chapterSavedWords.length}
        isBookComplete={isFinalChapter}
        hasChapterWords={chapterSavedWords.length > 0}
        hasBookWords={bookSavedWords.length > 0}
        onBack={returnToCompletedPage}
        onNextChapter={openNextChapterFromCompletion}
        onReviewWords={openChapterTraining}
        onReturnToBook={onReturnToBook}
        onReturnToLibrary={onReturnToLibrary}
      />
    );
  }

  return (
    <main
      className={`reader-preview reading-theme-${settings.theme}`}
      onClick={readingTimer.recordActivity}
      onKeyDown={readingTimer.recordActivity}
      onPointerMove={readingTimer.recordActivity}
      onScroll={readingTimer.recordActivity}
      onTouchStart={readingTimer.recordActivity}
      style={{
        "--reader-font-size": `${settings.textSize}px`,
        "--reader-line-height": settings.lineHeight,
        "--reader-font-family": readerFontStack(settings.fontFamily),
        "--reader-width": `${settings.textWidth}px`,
        "--reader-text-align": settings.textAlign,
      } as CSSProperties}
    >
      <header className="reading-topbar">
        <button className="reader-icon-button reader-back-button" type="button" aria-label="Назад" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="reading-title">
          <strong>{book.title}</strong>
          <span>{book.author}</span>
          {readerBook ? (
            <select
              className="reader-chapter-select"
              value={chapter.id}
              aria-label="Выбрать главу"
              onChange={(event) => {
                pendingChapterEdgeRef.current = "first";
                visibleWordIdBeforeRepaginate.current = null;
                setActiveChapterId(event.target.value);
                setCurrentPageIndex(0);
              }}
            >
              {readerBook.chapters.map((item) => (
                <option key={item.id} value={item.id}>
                  {chapterCompletions[getChapterCompletionKey(book.id, item.id)]?.completed ? "✓ " : ""}{item.number}. {item.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="reading-actions">
          <button
            className={settingsOpen ? "reader-icon-button active" : "reader-icon-button"}
            type="button"
            aria-label="Настройки чтения"
            aria-expanded={settingsOpen}
            ref={settingsButtonRef}
            onClick={() => setSettingsOpen((current) => !current)}
          >
            Aa
          </button>
          <button
            className={bookmarked ? "reader-icon-button active" : "reader-icon-button"}
            type="button"
            aria-label={bookmarked ? "Убрать закладку" : "Добавить закладку"}
            onClick={() => setBookmarked((current) => !current)}
          >
            <Bookmark size={18} aria-hidden="true" />
          </button>
          <button className="reader-icon-button" type="button" aria-label="Поиск по главе">
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
        {settingsOpen ? (
          <ReadingSettingsPanel
            panelRef={settingsPanelRef}
            settings={settings}
            onChange={updateReadingSettings}
          />
        ) : null}
      </header>

      <section
        className="paginated-reader-shell"
        aria-label="Страница чтения"
        onPointerDown={handlePagePointerDown}
        onPointerUp={handlePagePointerUp}
        onPointerCancel={handlePagePointerCancel}
      >
        <button
          className="reader-page-edge reader-page-edge-left"
          type="button"
          aria-label="Предыдущая страница"
          disabled={currentPageIndex <= 0 || isPageTurning}
          onClick={(event) => {
            event.stopPropagation();
            goToPreviousPage();
          }}
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <article className={`reading-page ${currentPageIndex === 0 ? "has-title" : "no-title"} ${pageDirection ? `page-${pageDirection}` : ""}`} ref={readingPageRef}>
          {currentPageIndex === 0 ? (
            <div className="reading-page-title">
              <span>Chapter {chapter.number}</span>
              <strong>{chapter.title}</strong>
            </div>
          ) : null}
          <div className="reading-text-frame" ref={readingTextFrameRef}>
            {isPaginating || !activePage ? (
              <div className="reader-pagination-loading">Пересчитываем страницы…</div>
            ) : (
              <ReaderPageView
                page={activePage}
                settings={settings}
                onSpeak={(sentenceText) => speech.toggle(sentenceText)}
                onSelectParagraph={(word) => {
                  setSelectedParagraph((current) => (
                    current?.paragraphId === word.paragraphId ? null : word
                  ));
                }}
                onSelectWord={setSelectedWord}
              />
            )}
          </div>
          {selectedWord ? (
            <ReaderWordPopover
              bookId={book.id}
              bookTitle={book.title}
              chapterTitle={chapter.title}
              onClose={() => setSelectedWord(null)}
              onSpeak={(wordText) => speech.toggle(wordText)}
              word={selectedWord}
            />
          ) : null}
          {selectedParagraph ? (
            <ReaderParagraphTranslationPopover word={selectedParagraph} onClose={() => setSelectedParagraph(null)} />
          ) : null}
        </article>
        <button
          className="reader-page-edge reader-page-edge-right"
          type="button"
          aria-label="Следующая страница"
          disabled={isPageTurning || pages.length === 0}
          onClick={(event) => {
            event.stopPropagation();
            goToNextPage();
          }}
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        {showSwipeHint ? <div className="reader-swipe-hint">Листайте страницы свайпом</div> : null}
        <div className="reader-page-indicator" role="status" aria-label="Текущая страница">
          <span className="reader-page-indicator-desktop">Глава {chapter.number} из {chapterCount} · Страница {Math.min(currentPageIndex + 1, pages.length || 1)} из {pages.length || 1}</span>
          <span className="reader-page-indicator-mobile">{Math.min(currentPageIndex + 1, pages.length || 1)} / {pages.length || 1}</span>
        </div>
      </section>
      {restrictionOpen ? (
        <div className="reader-restriction-layer" role="presentation" onClick={() => setRestrictionOpen(false)}>
          <section className="reader-restriction-dialog" role="dialog" aria-modal="true" aria-label="Следующая глава недоступна" onClick={(event) => event.stopPropagation()}>
            <button className="dialog-close" type="button" aria-label="Закрыть" onClick={() => setRestrictionOpen(false)}>
              <X size={18} aria-hidden="true" />
            </button>
            <span className="eyebrow">Глава скоро</span>
            <h2>Следующая глава пока недоступна</h2>
            <p>Сейчас подключена только первая глава Alice. Экран уже готов к переходу на следующую главу, когда она появится в данных.</p>
            <button className="primary-button" type="button" onClick={() => setRestrictionOpen(false)}>Понятно</button>
          </section>
        </div>
      ) : null}
      <ReadingTimerButton
        bookTitle={book.title}
        chapterTitle={`Chapter ${chapter.number}: ${chapter.title}`}
        isOpen={timerOpen}
        buttonRef={timerButtonRef}
        onClose={closeTimer}
        onChangeGoal={onChangeGoal}
        onToggle={() => setTimerOpen((current) => !current)}
        readingTimer={readingTimer}
      />
    </main>
  );
}

function ChapterCompletionScreen({
  book,
  chapter,
  chapterCount,
  completedChapterCount,
  readingSeconds,
  savedWordsCount,
  isBookComplete,
  hasChapterWords,
  hasBookWords,
  onBack,
  onNextChapter,
  onReviewWords,
  onReturnToBook,
  onReturnToLibrary,
}: {
  book: HomeShelfBook;
  chapter: ReaderChapter;
  chapterCount: number;
  completedChapterCount: number;
  readingSeconds: number;
  savedWordsCount: number;
  isBookComplete: boolean;
  hasChapterWords: boolean;
  hasBookWords: boolean;
  onBack: () => void;
  onNextChapter: () => void;
  onReviewWords: (scope?: "chapter" | "book") => void;
  onReturnToBook: () => void;
  onReturnToLibrary: () => void;
}) {
  const safeCompletedCount = Math.min(chapterCount, Math.max(completedChapterCount, isBookComplete ? chapterCount : completedChapterCount));
  const progressPercent = Math.round((safeCompletedCount / Math.max(1, chapterCount)) * 100);
  const wordsLabel = `${savedWordsCount} ${pluralizeRussian(savedWordsCount, "слово", "слова", "слов")} сохранено`;

  return (
    <main className="chapter-completion-page">
      <button className="text-button completion-back-button" type="button" onClick={onBack}>
        ← Назад к странице
      </button>
      <section className="chapter-completion-card" aria-labelledby="chapter-completion-title">
        <div className="completion-mark" aria-hidden="true">
          <CheckCircle2 size={34} />
        </div>
        <span className="eyebrow">{isBookComplete ? "Финал книги" : "StoryLingo Reader"}</span>
        <h1 id="chapter-completion-title">{isBookComplete ? "Книга прочитана!" : "Глава прочитана"}</h1>
        <div className="completion-chapter-title">
          <span>{isBookComplete ? book.title : `${chapter.number}. ${chapter.title}`}</span>
          <small>{isBookComplete ? `${chapterCount} из ${chapterCount} глав` : `${safeCompletedCount} из ${chapterCount} глав`}</small>
        </div>
        <div className="completion-stats" aria-label="Статистика завершения">
          <Metric label="Время чтения" value={capitalizeFirst(formatReadingDuration(readingSeconds))} />
          <Metric label="Словарь" value={savedWordsCount ? wordsLabel : "Слов не сохранено"} />
          <Metric label="Прогресс" value={`${progressPercent}%`} />
        </div>
        <Progress value={progressPercent} />
        <p className="completion-note">
          {savedWordsCount
            ? "Можно быстро повторить сохранённые слова или продолжить чтение в том же темпе."
            : "В этой главе вы не сохраняли слова. Можно сразу двигаться дальше."}
        </p>
        <div className="completion-actions">
          {isBookComplete ? (
            <>
              {hasBookWords ? (
                <button className="primary-button" type="button" onClick={() => onReviewWords("book")}>
                  Повторить слова книги
                </button>
              ) : null}
              <button className="primary-button" type="button" onClick={onReturnToLibrary}>
                Вернуться в библиотеку
              </button>
              <button className="secondary-button" type="button" onClick={onReturnToBook}>
                Открыть книгу
              </button>
            </>
          ) : (
            <>
              <button className="primary-button" type="button" onClick={onNextChapter}>
                Следующая глава
              </button>
              {hasChapterWords ? (
                <button className="secondary-button" type="button" onClick={() => onReviewWords("chapter")}>
                  Повторить {savedWordsCount} {pluralizeRussian(savedWordsCount, "слово", "слова", "слов")}
                </button>
              ) : null}
              <button className="text-button" type="button" onClick={onReturnToBook}>
                Вернуться к книге
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ReadingSettingsPanel({
  panelRef,
  settings,
  onChange,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  settings: ReadingSettings;
  onChange: Dispatch<SetStateAction<ReadingSettings>>;
}) {
  const [view, setView] = useState<"main" | "font">("main");
  const decreaseTextSize = () => onChange((current) => ({ ...current, textSize: Math.max(16, current.textSize - 1) }));
  const increaseTextSize = () => onChange((current) => ({ ...current, textSize: Math.min(28, current.textSize + 1) }));

  return (
    <div className="reading-settings-panel" ref={panelRef} role="dialog" aria-label="Настройки чтения">
      {view === "font" ? (
        <>
          <div className="settings-subheader">
            <button className="settings-back-button" type="button" onClick={() => setView("main")}>
              ←
            </button>
            <strong>Шрифт</strong>
          </div>
          <div className="font-choice-list nested">
            {readingFonts.map((font) => (
              <button
                className={settings.fontFamily === font ? "active" : ""}
                key={font}
                type="button"
                style={{ fontFamily: readerFontStack(font) }}
                onClick={() => onChange((current) => ({ ...current, fontFamily: font }))}
              >
                <span>{font}</span>
                {settings.fontFamily === font ? <span className="font-check" aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="settings-group">
            <span>Тема</span>
            <div className="segmented-control">
              {readingThemes.map((theme) => (
                <button
                  className={settings.theme === theme.id ? "active" : ""}
                  key={theme.id}
                  type="button"
                  onClick={() => onChange((current) => ({ ...current, theme: theme.id }))}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <span>Размер текста</span>
            <div className="text-size-stepper" role="group" aria-label="Размер текста">
              <button type="button" aria-label="Уменьшить текст" onClick={decreaseTextSize}>A−</button>
              <strong>{settings.textSize}</strong>
              <button type="button" aria-label="Увеличить текст" onClick={increaseTextSize}>A+</button>
            </div>
          </div>

          <button className="settings-nav-row" type="button" onClick={() => setView("font")}>
            <span>Шрифт</span>
            <strong style={{ fontFamily: readerFontStack(settings.fontFamily) }}>{settings.fontFamily}</strong>
            <span aria-hidden="true">›</span>
          </button>

          <div className="settings-group">
            <span>Межстрочный интервал</span>
            <div className="segmented-control three">
              {lineHeightOptions.map((option) => (
                <button
                  className={settings.lineHeight === option.value ? "active" : ""}
                  key={option.value}
                  type="button"
                  onClick={() => onChange((current) => ({ ...current, lineHeight: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <span>Выравнивание</span>
            <div className="segmented-control two">
              <button
                className={settings.textAlign === "left" ? "active" : ""}
                type="button"
                onClick={() => onChange((current) => ({ ...current, textAlign: "left" }))}
              >
                По левому краю
              </button>
              <button
                className={settings.textAlign === "justify" ? "active" : ""}
                type="button"
                onClick={() => onChange((current) => ({ ...current, textAlign: "justify" }))}
              >
                По ширине
              </button>
            </div>
          </div>

          <label className="settings-toggle accent-toggle">
            <span>
              Акцентированное чтение
              <small>Выделяет начало слов, чтобы взгляду было легче двигаться по строке.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.accentedReading}
              onChange={(event) => onChange((current) => ({ ...current, accentedReading: event.target.checked }))}
            />
          </label>
        </>
      )}
    </div>
  );
}
function ReaderPageView({
  page,
  settings,
  onSpeak,
  onSelectParagraph,
  onSelectWord,
}: {
  page: ReaderPage;
  settings: ReadingSettings;
  onSpeak: (sentenceText: string) => void;
  onSelectParagraph: (word: ReaderPageWord) => void;
  onSelectWord: (word: ReaderPageWord) => void;
}) {
  const paragraphs = groupPageWords(page.words);

  return (
    <div className="structured-text">
      {paragraphs.map((paragraph) => (
        <p className={readerParagraphClassName(paragraph.paragraphType)} key={paragraph.paragraphId}>
          {paragraph.sentences.map((sentence) => (
            <ReaderSentenceView
              key={`${paragraph.paragraphId}-${sentence.sentenceId}`}
              sentenceWords={sentence.words}
              settings={settings}
              onSelectWord={onSelectWord}
            />
          ))}
          {paragraph.lastWord?.isParagraphEnd ? (
            <span className="block-actions" data-reader-interactive="true">
              <button
                className="block-audio-button"
                type="button"
                aria-label="Прослушать абзац"
                onClick={(event) => {
                  event.stopPropagation();
                  onSpeak(paragraph.lastWord?.paragraphText ?? paragraph.words.map((word) => word.text).join(" "));
                }}
              >
                <Volume2 size={14} aria-hidden="true" />
              </button>
              {paragraph.lastWord?.paragraphTranslation ? (
                <button
                  className="block-translation-trigger"
                  type="button"
                  aria-label="Перевести абзац"
                  title="Перевести абзац"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (paragraph.lastWord) onSelectParagraph(paragraph.lastWord);
                  }}
                >
                  <Languages size={13} aria-hidden="true" />
                  <span>RU</span>
                </button>
              ) : null}
            </span>
          ) : null}
        </p>
      ))}
    </div>
  );
}

function ReaderSentenceView({
  sentenceWords,
  settings,
  onSelectWord,
}: {
  sentenceWords: ReaderPageWord[];
  settings: ReadingSettings;
  onSelectWord: (word: ReaderPageWord) => void;
}) {
  const firstWord = sentenceWords[0];

  return (
    <span className="reader-sentence" data-sentence-id={firstWord?.sentenceId}>
      <span className="reader-sentence-words">
        {sentenceWords.map((word) => (
          <ReaderWordView
            key={word.id}
            word={word}
            accented={settings.accentedReading}
            showTranslation={settings.showWordTranslation}
            onSelect={onSelectWord}
          />
        ))}
      </span>
    </span>
  );
}

function ReaderWordView({
  word,
  accented,
  showTranslation,
  onSelect,
}: {
  word: ReaderPageWord;
  accented: boolean;
  showTranslation: boolean;
  onSelect: (word: ReaderPageWord) => void;
}) {
  const displayText = readerDisplayWordText(word);
  const accentParts = splitWordForAccent(displayText);
  const isInteractiveWord = !word.isPunctuation;

  return (
    <span
      className={[
        "reader-word",
        readerWordHasEmphasis(word) ? "reader-emphasis-word" : "",
        isInteractiveWord ? "" : "reader-punctuation-word",
      ]
        .filter(Boolean)
        .join(" ")}
      data-word-id={word.id}
      role={isInteractiveWord ? "button" : undefined}
      tabIndex={isInteractiveWord ? 0 : undefined}
      onClick={(event) => {
        if (!isInteractiveWord) return;
        event.stopPropagation();
        onSelect(word);
      }}
      onKeyDown={(event) => {
        if (isInteractiveWord && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.stopPropagation();
          onSelect(word);
        }
      }}
    >
      <span>
        {accented && accentParts ? (
          <>
            <strong className="word-accent">{accentParts.accent}</strong>
            <span>{accentParts.rest}</span>
          </>
        ) : (
          displayText
        )}
      </span>
      {showTranslation && word.translation ? <small>{word.translation}</small> : null}
    </span>
  );
}

function splitWordForAccent(text: string): { accent: string; rest: string } | null {
  const match = text.match(/^([^A-Za-zА-Яа-яЁё]*)([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё’'-]*)(.*)$/);
  if (!match) return null;

  const [, prefix, core, suffix] = match;
  if (core.length <= 2) return null;

  const accentLength = Math.min(Math.max(2, Math.ceil(core.length * 0.38)), Math.max(2, core.length - 1));
  return {
    accent: `${prefix}${core.slice(0, accentLength)}`,
    rest: `${core.slice(accentLength)}${suffix}`,
  };
}
function ReaderWordPopover({
  bookId,
  bookTitle,
  chapterTitle,
  word,
  onClose,
  onSpeak,
}: {
  bookId: string;
  bookTitle: string;
  chapterTitle: string;
  word: ReaderPageWord;
  onClose: () => void;
  onSpeak: (wordText: string) => void;
}) {
  const cleanWord = (word.normalized || word.text).replace(/_/g, "");
  const lexicalEntryId = word.lexicalEntryId ?? `${word.normalized || word.id}-reader-word`;
  const { isWordSaved: isSavedVocabularyWord, toggleWord } = useSavedVocabulary();
  const isSaved = isSavedVocabularyWord(lexicalEntryId);
  const lemma = word.lemma && word.lemma.toLowerCase() !== cleanWord.toLowerCase() ? word.lemma : null;
  const partOfSpeechLabel = getPartOfSpeechLabel(word.partOfSpeech);

  function toggleSavedWord() {
    toggleWord({
      lexicalEntryId,
      word: cleanWord,
      lemma: word.lemma || cleanWord,
      translation: word.translation ?? "",
      contextualTranslation: word.contextualTranslation,
      commonTranslations: word.commonTranslations,
      transcription: word.transcription,
      partOfSpeech: word.partOfSpeech,
      context: {
        sentenceId: word.sentenceId,
        sentenceText: word.sentenceText,
        sentenceTranslation: word.sentenceTranslation,
        bookId,
        bookTitle,
        chapterId: word.chapterId || "chapter-1",
        chapterTitle,
        contextualPhrase: word.phrase,
        contextualPhraseTranslation: word.phraseTranslation,
      },
    });
  }

  return (
    <aside className="reader-translation-popover word-popover" role="dialog" aria-label={`Перевод слова ${word.text}`} onClick={(event) => event.stopPropagation()}>
      <button className="popover-close" type="button" aria-label="Закрыть перевод" onClick={onClose}>×</button>
      <strong>{cleanWord}</strong>
      {word.transcription ? <span>{word.transcription}</span> : null}
      {partOfSpeechLabel ? <span className="word-popover-meta">{partOfSpeechLabel}</span> : null}
      <p>{word.contextualTranslation ?? word.translation ?? "Перевод слова будет подключён на следующем этапе."}</p>
      {lemma ? <small className="word-popover-lemma">Начальная форма: {lemma}</small> : null}
      {word.isArchaic ? <small className="word-popover-phrase">устаревшее слово</small> : null}
      {word.commonTranslations?.length ? <small>Также: {word.commonTranslations.slice(0, 2).join(", ")}</small> : null}
      {word.phrase && word.phraseTranslation ? (
        <small className="word-popover-phrase">
          {word.phrase}: {word.phraseTranslation}
        </small>
      ) : null}
      <div className="word-popover-actions">
        <button type="button" onClick={() => onSpeak(cleanWord)} aria-label={`Прослушать ${cleanWord}`}>
          <Volume2 size={14} aria-hidden="true" />
          Audio
        </button>
        <button type="button" onClick={toggleSavedWord}>
          {isSaved ? "✓ В словаре" : "+ В словарь"}
        </button>
      </div>
    </aside>
  );
}

function getPartOfSpeechLabel(partOfSpeech?: string) {
  const labels: Record<string, string> = {
    noun: "существительное",
    verb: "глагол",
    adjective: "прилагательное",
    adverb: "наречие",
    pronoun: "местоимение",
    preposition: "предлог",
    conjunction: "союз",
    determiner: "определитель",
    interjection: "междометие",
    "proper noun": "имя собственное",
    "auxiliary verb": "вспомогательный глагол",
    "modal verb": "модальный глагол",
  };

  return partOfSpeech ? labels[partOfSpeech] ?? "" : "";
}

function ReaderParagraphTranslationPopover({ word, onClose }: { word: ReaderPageWord; onClose: () => void }) {
  return (
    <aside className="reader-translation-popover sentence-popover" role="dialog" aria-label="Перевод абзаца" onClick={(event) => event.stopPropagation()}>
      <button className="popover-close" type="button" aria-label="Закрыть перевод" onClick={onClose}>×</button>
      <strong>Перевод абзаца</strong>
      <p>{word.paragraphTranslation ?? ""}</p>
    </aside>
  );
}

function groupPageWords(words: ReaderPageWord[]) {
  const paragraphs: Array<{
    paragraphId: string;
    paragraphType?: ReaderPageWord["paragraphType"];
    lastWord?: ReaderPageWord;
    sentences: Array<{ sentenceId: string; words: ReaderPageWord[] }>;
    words: ReaderPageWord[];
  }> = [];

  words.forEach((word) => {
    let paragraph = paragraphs.find((item) => item.paragraphId === word.paragraphId);
    if (!paragraph) {
      paragraph = { paragraphId: word.paragraphId, paragraphType: word.paragraphType, sentences: [], words: [] };
      paragraphs.push(paragraph);
    }
    paragraph.words.push(word);
    paragraph.lastWord = word;

    let sentence = paragraph.sentences.find((item) => item.sentenceId === word.sentenceId);
    if (!sentence) {
      sentence = { sentenceId: word.sentenceId, words: [] };
      paragraph.sentences.push(sentence);
    }

    sentence.words.push(word);
  });

  return paragraphs;
}

function readerParagraphClassName(type?: ReaderPageWord["paragraphType"]) {
  if (type === "poem") return "reader-paragraph reader-poem";
  if (type === "dialogue") return "reader-paragraph reader-dialogue";
  if (type === "thought") return "reader-paragraph reader-thought";
  return "reader-paragraph";
}

function createFallbackChapter(book: HomeShelfBook): ReaderChapter {
  return {
    id: `${book.id}-chapter-1`,
    number: 1,
    title: book.chapter || "Reading",
    paragraphs: [
      {
        id: `${book.id}-p1`,
        sentences: [
          {
            id: `${book.id}-s1`,
            text: book.excerpt,
            words: book.excerpt.split(" ").map((word, index) => ({
              id: `${book.id}-w${index + 1}`,
              text: word,
            })),
          },
        ],
      },
    ],
  };
}

function countReaderChapterWords(chapter: ReaderChapter) {
  return chapter.paragraphs.reduce((chapterTotal, paragraph) => {
    const paragraphWords = paragraph.sentences.reduce((sentenceTotal, sentence) => {
      if (sentence.words?.length) return sentenceTotal + sentence.words.length;
      return sentenceTotal + (sentence.text.match(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g) ?? []).length;
    }, 0);
    return chapterTotal + paragraphWords;
  }, 0);
}

function readerFontStack(font: ReadingSettings["fontFamily"]) {
  if (font === "Inter") return "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  if (font === "Georgia") return 'Georgia, "Times New Roman", serif';
  if (font === "Merriweather") return 'Merriweather, Georgia, "Times New Roman", serif';
  if (font === "Source Serif 4") return '"Source Serif 4", Georgia, "Times New Roman", serif';
  if (font === "Atkinson Hyperlegible") return '"Atkinson Hyperlegible", Inter, system-ui, sans-serif';
  return 'Literata, Georgia, "Times New Roman", serif';
}

function isReaderInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, input, select, textarea, a, [role='button'], [data-reader-interactive], .reader-word, .word, .audio-button, .block-audio-button, .block-translation-trigger, .reading-settings-panel, .reading-timer-widget, .reading-timer-layer, .reader-translation-popover",
    ),
  );
}

function ReadingGoalDialog({
  currentGoal,
  onClose,
  onSave,
}: {
  currentGoal: number;
  onClose: () => void;
  onSave: (minutes: number) => void;
}) {
  const goalOptions = [5, 10, 15, 20, 30];
  const [selectedGoal, setSelectedGoal] = useState<number | "custom">(goalOptions.includes(currentGoal) ? currentGoal : "custom");
  const [customGoal, setCustomGoal] = useState(goalOptions.includes(currentGoal) ? "" : currentGoal.toString());
  const selectedMinutes = selectedGoal === "custom" ? Number(customGoal) : selectedGoal;
  const isValidGoal = Number.isInteger(selectedMinutes) && selectedMinutes >= 1 && selectedMinutes <= 240;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="goal-dialog-layer" role="presentation" onClick={onClose}>
      <section className="goal-dialog" role="dialog" aria-modal="true" aria-labelledby="goal-dialog-title" onClick={(event) => event.stopPropagation()}>
        <button className="dialog-close" type="button" aria-label="Закрыть окно цели" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <span className="eyebrow">Цель по чтению</span>
        <h2 id="goal-dialog-title">Изменить дневную цель</h2>
        <p>Выберите спокойный темп на день. Уже прочитанное сегодня время сохранится.</p>
        <div className="goal-options" role="group" aria-label="Варианты дневной цели">
          {goalOptions.map((minutes) => (
            <button
              className={selectedGoal === minutes ? "goal-option active" : "goal-option"}
              key={minutes}
              type="button"
              onClick={() => setSelectedGoal(minutes)}
            >
              {minutes} минут
            </button>
          ))}
          <button
            className={selectedGoal === "custom" ? "goal-option active" : "goal-option"}
            type="button"
            onClick={() => setSelectedGoal("custom")}
          >
            Своё
          </button>
        </div>
        {selectedGoal === "custom" ? (
          <label className="custom-goal-field">
            <span>Своё значение, минут</span>
            <input
              inputMode="numeric"
              min={1}
              max={240}
              step={1}
              type="number"
              value={customGoal}
              onChange={(event) => setCustomGoal(event.target.value)}
            />
          </label>
        ) : null}
        <div className="goal-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Отмена</button>
          <button className="primary-button" type="button" disabled={!isValidGoal} onClick={() => onSave(selectedMinutes)}>
            Сохранить
          </button>
        </div>
      </section>
    </div>
  );
}

function ReadingTimerButton({
  bookTitle,
  chapterTitle,
  buttonRef,
  isOpen,
  onClose,
  onChangeGoal,
  onToggle,
  readingTimer,
}: {
  bookTitle: string;
  chapterTitle: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onChangeGoal: () => void;
  onToggle: () => void;
  readingTimer: ReturnType<typeof useReadingTimer>;
}) {
  return (
    <>
      {isOpen ? (
        <div className="reading-timer-layer" role="presentation" onClick={onClose}>
          <ReadingTimerPanel
            bookTitle={bookTitle}
            chapterTitle={chapterTitle}
            onChangeGoal={onChangeGoal}
            onClose={onClose}
            readingTimer={readingTimer}
          />
        </div>
      ) : null}
      <div className="reading-timer-widget">
        <button
          className={readingTimer.timer.isRunning ? "reading-timer-toggle running" : "reading-timer-toggle paused"}
          type="button"
          aria-expanded={isOpen}
          aria-label="Открыть таймер чтения"
          ref={buttonRef}
          onClick={onToggle}
        >
          <Clock size={18} aria-hidden="true" />
          <span>{formatTimer(readingTimer.currentSessionSeconds)}</span>
        </button>
      </div>
    </>
  );
}

function ReadingTimerPanel({
  bookTitle,
  chapterTitle,
  onChangeGoal,
  onClose,
  readingTimer,
}: {
  bookTitle: string;
  chapterTitle: string;
  onChangeGoal: () => void;
  onClose: () => void;
  readingTimer: ReturnType<typeof useReadingTimer>;
}) {
  const todayMinutes = Math.floor(readingTimer.stats.todaySeconds / 60);
  const goalMinutes = readingTimer.goal.dailyGoalMinutes;
  const pauseMessage =
    readingTimer.pauseReason === "idle"
      ? "Таймер приостановлен из-за бездействия"
      : readingTimer.pauseReason === "manual"
        ? "Таймер на паузе"
        : null;

  return (
    <section className="reading-timer-panel" role="dialog" aria-label="Таймер чтения" onClick={(event) => event.stopPropagation()}>
      <button className="timer-close-button" type="button" aria-label="Закрыть таймер" onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
      <div className="timer-panel-heading">
        <span className="eyebrow">Таймер чтения</span>
        <strong>Сегодня: {todayMinutes} из {goalMinutes} минут</strong>
        {readingTimer.isGoalCompleteToday ? <small className="timer-complete">Цель на сегодня выполнена</small> : null}
      </div>
      <div className="timer-session-time" aria-live="polite">
        {formatTimer(readingTimer.currentSessionSeconds)}
      </div>
      <p className="timer-current-book">{bookTitle} · {chapterTitle}</p>
      {pauseMessage ? <p className="timer-message">{pauseMessage}</p> : null}
      <div className="timer-actions">
        <button
          className="primary-button"
          type="button"
          onClick={readingTimer.timer.isRunning ? readingTimer.pauseTimer : readingTimer.resumeTimer}
        >
          {readingTimer.timer.isRunning ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {readingTimer.timer.isRunning ? "Пауза" : "Продолжить"}
        </button>
        <button className="secondary-button" type="button" onClick={readingTimer.finishSession}>Завершить сеанс</button>
      </div>
      <button className="timer-text-button" type="button" onClick={onChangeGoal}>Изменить цель</button>
    </section>
  );
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const rest = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

function BookSection({ title, className, children }: { title: string; className: string; children: ReactNode }) {
  return (
    <section className="book-section">
      <h2>{title}</h2>
      <div className={className}>{children}</div>
    </section>
  );
}

function ContinueBookCard({
  book,
  progressValue,
  onOpen,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onOpen: (bookId: string) => void;
}) {
  return (
    <article className="continue-card">
      <div className={`book-cover ${book.tone}`}><span>{book.title.split(" ")[0]}</span></div>
      <div className="book-card-body">
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <span>{book.chapter}</span>
        <Progress value={progressValue} />
        <small>{progressValue}% прочитано</small>
        <button className="text-button" type="button" onClick={() => onOpen(book.id)}>Открыть демо</button>
      </div>
    </article>
  );
}

function StoryCard({ story, onOpen }: { story: HomeShelfBook; onOpen: (bookId: string) => void }) {
  return (
    <article className="story-card">
      <div className={`story-cover ${story.tone}`}><BookOpen size={26} aria-hidden="true" /></div>
      <div>
        <h3>{story.title}</h3>
        <p>{story.author}</p>
        <span>{story.readingTime}</span>
        <button className="text-button" type="button" onClick={() => onOpen(story.id)}>Читать демо</button>
      </div>
    </article>
  );
}

function WordRow({
  word,
  onRemove,
  onSpeak,
}: {
  word: SavedVocabularyWord;
  onRemove: (word: SavedVocabularyWord) => void;
  onSpeak: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryContext = word.contexts[0];
  const partOfSpeechLabel = getPartOfSpeechLabel(word.partOfSpeech);
  const lemma = word.lemma && word.lemma.toLowerCase() !== word.word.toLowerCase() ? word.lemma : null;
  const progress = getVocabularyProgress(word);
  const displayTranslation = getVocabularyDisplayTranslation(word);
  const transcription = hasValidTranscription(word.transcription, word.word) ? word.transcription : "";
  const sourceLabel = primaryContext ? getVocabularySourceLabel(primaryContext) : "StoryLingo";
  const cleanSentenceText = cleanVocabularyContextText(primaryContext?.sentenceText);
  const cleanSentenceTranslation = cleanVocabularyContextText(primaryContext?.sentenceTranslation);

  return (
    <article className="word-row">
      <div className="word-row-main">
        <div className="word-row-heading">
          <div className="word-row-title">
            <button className="audio-button word-row-audio" type="button" aria-label={`Прослушать ${word.word}`} onClick={() => onSpeak(word.word)}>
              <Volume2 size={16} aria-hidden="true" />
            </button>
            <h3>{word.word}</h3>
          </div>
          <span className={`word-status status-${progress.status}`}>{vocabularyStatusLabel(word)}</span>
        </div>
        {transcription || partOfSpeechLabel ? (
          <span className="word-row-pronunciation">
            {[transcription, partOfSpeechLabel].filter(Boolean).join(" · ")}
          </span>
        ) : null}
        <p className="word-row-translation">{displayTranslation.primary || "Перевод пока не добавлен"}</p>
        {displayTranslation.contextual ? (
          <small className="word-row-contextual">В контексте: {displayTranslation.contextual}</small>
        ) : null}
        <div className="word-row-footer">
          <span title={primaryContext ? `${primaryContext.bookTitle} · ${primaryContext.chapterTitle}` : undefined}>{sourceLabel}</span>
          <button className="text-button word-details-button" type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Скрыть" : "Подробнее"}
          </button>
          <div className="word-menu">
            <button className="icon-text-button word-remove-button" type="button" aria-label={`Действия для ${word.word}`} title="Действия" onClick={() => setMenuOpen((current) => !current)}>
              ⋯
            </button>
            {menuOpen ? (
              <div className="word-menu-popover">
                <button type="button" onClick={() => onRemove(word)}>
                  Удалить из словаря
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {expanded ? (
          <div className="word-row-context">
            {lemma ? <small>Начальная форма: {lemma}</small> : null}
            {primaryContext?.contextualPhrase && primaryContext.contextualPhraseTranslation ? (
              <small>{cleanVocabularyContextText(primaryContext.contextualPhrase)}: {cleanVocabularyContextText(primaryContext.contextualPhraseTranslation)}</small>
            ) : null}
            {primaryContext ? (
              <small className="word-row-full-source">
                {primaryContext.bookTitle} · {primaryContext.chapterTitle}
              </small>
            ) : null}
            {cleanSentenceText ? (
              <>
                <strong>Контекст</strong>
                <p>{cleanSentenceText}</p>
              </>
            ) : null}
            {cleanSentenceTranslation ? (
              <>
                <strong>Перевод</strong>
                <p>{cleanSentenceTranslation}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PageTitle({ title, text }: { title: string; text: string }) {
  return (
    <section className="page-title">
      <span className="eyebrow">StoryLingo</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function BookProgressBar({ percent, isCompleted, label }: { percent: number; isCompleted: boolean; label: string }) {
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
  const fillPercent = isCompleted ? 100 : Math.min(99, safePercent);

  return (
    <span className="details-progress">
      <span
        className="book-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fillPercent}
        aria-label={isCompleted ? "Книга прочитана" : `Прочитано ${safePercent}%`}
      >
        <span
          className={isCompleted ? "book-progress-fill book-progress-fill--completed" : "book-progress-fill"}
          style={{ width: `${fillPercent}%` }}
        />
      </span>
      <small>{label}</small>
    </span>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="progress-track" aria-label={`${value}%`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function useSpeech() {
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  function toggle(text: string) {
    if (!("speechSynthesis" in window)) return;
    const normalizedText = text.trim();
    if (!normalizedText) return;

    if (speakingText === normalizedText && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingText(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.onend = () => setSpeakingText(null);
    utterance.onerror = () => setSpeakingText(null);
    setSpeakingText(normalizedText);
    window.speechSynthesis.speak(utterance);
  }

  return { toggle };
}

const navItems: Array<{ page: Page; label: string; icon: ReactNode }> = [
  { page: "home", label: "Главная", icon: <Home size={20} /> },
  { page: "library", label: "Библиотека", icon: <Library size={20} /> },
  { page: "dictionary", label: "Словарь", icon: <Languages size={20} /> },
  { page: "profile", label: "Профиль", icon: <User size={20} /> },
];

export default App;
