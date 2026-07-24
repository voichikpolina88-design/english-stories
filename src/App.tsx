import { ArrowLeft, BookOpen, Bookmark, Clock, Home, Languages, Library, Pause, Play, Search, User, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import { getCatalogBook, getCategoryBooks, homeShelfBooks, libraryCategories, type HomeShelfBook } from "./data/homeShelves";
import { getReaderBook, getReaderChapter } from "./data/aliceReader";
import { getAllVocabulary, type VocabularyEntry } from "./data/vocabulary";
import { useLearnerProgress } from "./hooks/useLearnerProgress";
import { emptyPaginationSize, type ReaderPage, type ReaderPageWord, useReaderPagination } from "./hooks/useReaderPagination";
import { useReadingTimer } from "./hooks/useReadingTimer";
import type { LastOpenedContent, NativeLanguage, ReaderChapter, ReaderPosition, ReadingSettings } from "./types";

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
  progressValue: number;
  rect: BookRect;
};

type OpenContentOptions = {
  chapterId?: string;
  readingProgress?: number;
  scrollPosition?: number;
  restorePosition?: boolean;
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
  showSentenceTranslation: true,
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
    } catch {
      // Reading should remain available when localStorage is blocked.
    }
  }, [settings]);

  return { settings, setSettings };
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
    showSentenceTranslation: true,
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

function getDefaultChapterId(book: HomeShelfBook) {
  const readerBook = getReaderBook(book.id);
  if (!readerBook) return book.chapter;
  return readReaderPosition(book.id)?.chapterId ?? readerBook.chapters[0]?.id ?? book.chapter;
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [bookInfo, setBookInfo] = useState<BookInfoState | null>(null);
  const [sheetInfo, setSheetInfo] = useState<{ book: HomeShelfBook; progressValue: number } | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const closeInfoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollPosition = useRef<number | null>(null);
  const { progress, saveLastOpenedContent, saveReadingProgress, selectLanguage } = useLearnerProgress();
  const allItems = homeShelfBooks;
  const activeBook = allItems.find((book) => book.id === activeBookId) ?? null;
  const activeDetailBook = allItems.find((book) => book.id === activeDetailId) ?? null;
  const lastOpenedBook = progress.lastOpenedContent ? getShelfBook(progress.lastOpenedContent.contentId) : null;
  const readingTimer = useReadingTimer(
    activeBook
      ? {
          contentType: activeBook.type,
          contentId: activeBook.id,
          chapterId: getDefaultChapterId(activeBook),
        }
      : null,
  );

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setActiveBookId(null);
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

  function showBookInfo(book: HomeShelfBook, progressValue: number, rect: BookRect) {
    clearCloseInfoTimer();
    setBookInfo({ book, progressValue, rect });
  }

  function scheduleCloseBookInfo() {
    clearCloseInfoTimer();
    closeInfoTimer.current = setTimeout(() => setBookInfo(null), 140);
  }

  function saveOpenedContent(book: HomeShelfBook, options: OpenContentOptions = {}) {
    const fallbackProgress = progress.readingProgress[book.id] ?? book.progress;
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

    const restorePosition = options.restorePosition ?? true;
    pendingScrollPosition.current = restorePosition ? options.scrollPosition ?? progress.lastOpenedContent?.scrollPosition ?? null : null;
    saveOpenedContent(book, options);
    setBookInfo(null);
    setSheetInfo(null);
    setPage("home");

    if (book.comingSoon) {
      setActiveBookId(null);
      setActiveDetailId(book.id);
      return;
    }

    setActiveDetailId(null);
    setActiveBookId(book.id);
  }

  function openBook(bookId: string, options?: OpenContentOptions) {
    openContent(bookId, options);
  }

  function closeActiveContent() {
    if (activeBook) {
      saveOpenedContent(activeBook, {
        readingProgress: progress.readingProgress[activeBook.id] ?? activeBook.progress,
        scrollPosition: window.scrollY,
      });
    }

    setActiveBookId(null);
    setActiveDetailId(null);
  }

  function continueLastOpened() {
    if (!progress.lastOpenedContent) return;
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
      readingProgress: progress.readingProgress[book.id] ?? book.progress,
      scrollPosition: 0,
    });
    setBookInfo(null);
    setSheetInfo(null);
    setActiveBookId(null);
    setActiveDetailId(book.id);
  }

  function startReadingFromGoal() {
    if (progress.lastOpenedContent && allItems.some((item) => item.id === progress.lastOpenedContent?.contentId)) {
      continueLastOpened();
      return;
    }

    if (readingTimer.lastContentId && allItems.some((item) => item.id === readingTimer.lastContentId)) {
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
            progressValue={progress.readingProgress[activeBook.id] ?? activeBook.progress}
            onBack={closeActiveContent}
            onProgress={(value) => handleReadingProgress(activeBook, value)}
            onSessionUpdate={(scrollPosition) =>
              saveOpenedContent(activeBook, {
                readingProgress: progress.readingProgress[activeBook.id] ?? activeBook.progress,
                scrollPosition,
              })
            }
            restoreScrollPosition={pendingScrollPosition.current}
            readingTimer={readingTimer}
            onChangeGoal={() => setGoalDialogOpen(true)}
          />
        ) : activeDetailBook ? (
          <ContentDetailPage
            book={activeDetailBook}
            progressValue={progress.readingProgress[activeDetailBook.id] ?? activeDetailBook.progress}
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
              />
            ) : null}
            {page === "dictionary" ? <DictionaryPage /> : null}
            {page === "profile" ? <ProfilePage language={progress.selectedLanguage ?? "Russian"} onSelectLanguage={selectLanguage} progress={progress.readingProgress} /> : null}
          </>
        )}
      </div>
      {bookInfo ? (
        <BookInfoPopover
          book={bookInfo.book}
          progressValue={bookInfo.progressValue}
          anchorRect={bookInfo.rect}
          onOpen={openContent}
          onKeepOpen={clearCloseInfoTimer}
          onRequestClose={scheduleCloseBookInfo}
        />
      ) : null}
      {sheetInfo ? (
        <BookInfoSheet
          book={sheetInfo.book}
          progressValue={sheetInfo.progressValue}
          onClose={() => setSheetInfo(null)}
          onOpen={openContent}
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
  onShowBookInfo: (book: HomeShelfBook, progressValue: number, rect: BookRect) => void;
  onHideBookInfo: () => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressValue: number }) => void;
  progress: Record<string, number>;
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
        progressValue={lastOpenedBook ? progress[lastOpenedBook.id] ?? lastOpened?.readingProgress ?? lastOpenedBook.progress : 0}
        onContinue={onContinueLast}
        onChooseFirstBook={() => onNavigate("library")}
      />

      <ShelfSection title="Недавно открывали" onViewAll={() => onNavigate("library")} compact>
        <BookShelf compact>
          {recentBooks.map((book) => (
            <BookCover
              key={book.id}
              book={book}
              progressValue={progress[book.id] ?? book.progress}
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
  progressValue,
  onContinue,
  onChooseFirstBook,
}: {
  book: HomeShelfBook | null;
  lastOpened: LastOpenedContent | null;
  progressValue: number;
  onContinue: () => void;
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
  const progressLabel = progressValue > 0 ? `${progressValue}% прочитано` : "Позиция сохранена";
  const actionLabel = isStory ? "Продолжить рассказ" : "Продолжить чтение";

  return (
    <section className="home-continue-panel">
      <div className="home-continue-book">
        <BookCover book={book} progressValue={progressValue} onOpen={onContinue} featured />
      </div>
      <div className="home-continue-copy">
        <span className="eyebrow">Продолжить чтение</span>
        <h2>{book.title}</h2>
        <p>{book.author}</p>
        <span>{isStory ? "Рассказ" : lastOpened.chapterId ?? book.chapter}</span>
        <Progress value={progressValue} />
        <small>{progressLabel}</small>
        <button className="primary-button" type="button" onClick={onContinue}>{actionLabel}</button>
      </div>
    </section>
  );
}

function RecommendationCard({
  book,
  onOpen,
}: {
  book: HomeShelfBook;
  onOpen: (bookId: string) => void;
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
}: {
  books: HomeShelfBook[];
  onHideBookInfo: () => void;
  onOpenBook: (bookId: string) => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressValue: number }) => void;
  onShowBookInfo: (book: HomeShelfBook, progressValue: number, rect: BookRect) => void;
  progress: Record<string, number>;
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
            progressValue={progress[book.id] ?? book.progress}
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
}: {
  books: HomeShelfBook[];
  onHideBookInfo: () => void;
  onOpenBook: (bookId: string) => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressValue: number }) => void;
  onShowBookInfo: (book: HomeShelfBook, progressValue: number, rect: BookRect) => void;
  progress: Record<string, number>;
}) {
  const renderBooks = (items: HomeShelfBook[]) =>
    items.map((book) => (
      <BookCover
        key={book.id}
        book={book}
        progressValue={progress[book.id] ?? book.progress}
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
  progressValue,
  onOpen,
  onShowInfo,
  onHideInfo,
  onOpenSheet,
  compact = false,
  featured = false,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onOpen: (bookId: string) => void;
  onShowInfo?: (book: HomeShelfBook, progressValue: number, rect: BookRect) => void;
  onHideInfo?: () => void;
  onOpenSheet?: (info: { book: HomeShelfBook; progressValue: number }) => void;
  compact?: boolean;
  featured?: boolean;
}) {
  const safeProgress = Math.min(100, Math.max(0, progressValue));
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
    onShowInfo?.(book, safeProgress, getBookRect(element));
  }

  function handleCoverClick(event: React.MouseEvent<HTMLDivElement>) {
    if (book.comingSoon && !canShowInfo) return;

    if (!canShowInfo) {
      onOpen(book.id);
      return;
    }

    if (isMobileInput()) {
      if (!pointerMoved.current) {
        onOpenSheet?.({ book, progressValue: safeProgress });
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
        {book.comingSoon ? <span className="soon-ribbon">Скоро</span> : null}
        <span className={hasCoverImage || isMinimalCover ? "cover-frame image-cover-copy" : "cover-frame"}>
          <span className="cover-title">{book.title}</span>
          <span className="cover-author">{book.author}</span>
        </span>
        {!isMinimalCover && safeProgress > 0 ? (
          <span className="cover-progress">
            <span style={{ width: `${safeProgress}%` }} />
            <small>{safeProgress}%</small>
          </span>
        ) : !isMinimalCover ? (
          <span className="cover-meta">{book.readingTime}</span>
        ) : null}
      </span>
      <span className="book-pages" aria-hidden="true" />
    </div>
  );
}

function BookInfoPopover({
  book,
  progressValue,
  anchorRect,
  onOpen,
  onKeepOpen,
  onRequestClose,
}: {
  book: HomeShelfBook;
  progressValue: number;
  anchorRect: BookRect;
  onOpen: (bookId: string) => void;
  onKeepOpen: () => void;
  onRequestClose: () => void;
}) {
  const meta = getBookInfoMeta(book, progressValue);
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
      <small>{meta.level} · {meta.chapters} · {book.readingTime}</small>
      <p>{meta.description}</p>
      {meta.safeProgress > 0 ? (
        <span className="details-progress">
          <span style={{ width: `${meta.safeProgress}%` }} />
          <small>{meta.safeProgress}% прочитано</small>
        </span>
      ) : null}
      <button className="book-info-button" type="button" onClick={() => onOpen(book.id)}>
        {book.comingSoon ? "Скоро" : meta.safeProgress > 0 ? "Продолжить" : "Читать"}
      </button>
    </aside>
  );
}

function BookInfoSheet({
  book,
  progressValue,
  onClose,
  onOpen,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onClose: () => void;
  onOpen: (bookId: string) => void;
}) {
  const meta = getBookInfoMeta(book, progressValue);
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
          <small>{meta.level} · {meta.chapters} · {book.readingTime}</small>
          <p>{meta.description}</p>
          {meta.safeProgress > 0 ? (
            <span className="details-progress">
              <span style={{ width: `${meta.safeProgress}%` }} />
              <small>{meta.safeProgress}% прочитано</small>
            </span>
          ) : null}
          <button className="book-info-button" type="button" onClick={() => onOpen(book.id)}>
            {book.comingSoon ? "Скоро" : meta.safeProgress > 0 ? "Продолжить" : "Читать"}
          </button>
        </div>
      </article>
    </div>
  );
}

function getBookInfoMeta(book: HomeShelfBook, progressValue: number) {
  const safeProgress = Math.min(100, Math.max(0, progressValue));
  const level = book.level ?? (book.type === "book" ? "A2" : "A1");
  const chapters = book.chapters ?? (book.type === "book" ? "10 глав" : "1 рассказ");
  const description = book.excerpt.length > 156 ? `${book.excerpt.slice(0, 153)}...` : book.excerpt;

  return { safeProgress, level, chapters, description };
}

function LibraryPage({
  onOpenBook,
  onShowBookInfo,
  onHideBookInfo,
  onOpenBookSheet,
  progress,
}: {
  onOpenBook: (bookId: string) => void;
  onShowBookInfo: (book: HomeShelfBook, progressValue: number, rect: BookRect) => void;
  onHideBookInfo: () => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressValue: number }) => void;
  progress: Record<string, number>;
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
            />
          ) : (
            <LibraryShelfScroller
              books={shelf.books}
              onHideBookInfo={onHideBookInfo}
              onOpenBook={onOpenBook}
              onOpenBookSheet={onOpenBookSheet}
              onShowBookInfo={onShowBookInfo}
              progress={progress}
            />
          )}
        </ShelfSection>
      ))}
    </main>
  );
}

function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const speech = useSpeech();
  const words = useMemo(() => getAllVocabulary(), []);
  const visibleWords = words
    .filter((word) => {
      const value = query.trim().toLowerCase();
      if (!value) return true;
      return word.word.toLowerCase().includes(value) || word.translation.toLowerCase().includes(value);
    })
    .slice(0, 36);

  return (
    <main className="page-stack">
      <PageTitle title="Словарь" text="Слова из текущей базы StoryLingo с переводом, транскрипцией и аудио." />
      <section className="dictionary-toolbar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти слово или перевод" />
        </label>
        <button className="primary-button" type="button" onClick={() => setPracticeOpen((current) => !current)}>
          Тренировать слова
        </button>
      </section>
      {practiceOpen ? (
        <section className="practice-placeholder">
          <strong>Тренировка слов скоро</strong>
          <p>Кнопка уже находится внутри словаря. Отдельный раздел тренировки удалён.</p>
        </section>
      ) : null}
      <section className="word-grid">
        {visibleWords.map((word) => (
          <WordRow key={word.id} word={word} onSpeak={speech.toggle} />
        ))}
      </section>
    </main>
  );
}

function ContentDetailPage({
  book,
  progressValue,
  onBack,
  onOpen,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onBack: () => void;
  onOpen: (bookId: string) => void;
}) {
  const meta = getBookInfoMeta(book, progressValue);

  return (
    <main className="page-stack content-detail-page">
      <button className="text-button" type="button" onClick={onBack}>← Назад</button>
      <section className="content-detail-card">
        <div className="content-detail-cover">
          <BookCover book={book} progressValue={progressValue} onOpen={onOpen} featured />
        </div>
        <div className="content-detail-copy">
          <span className="eyebrow">{book.type === "story" ? "Рассказ" : "Книга"}</span>
          <h1>{book.title}</h1>
          <p>{book.author}</p>
          <div className="content-detail-meta">
            <span>{meta.level}</span>
            <span>{meta.chapters}</span>
            <span>{book.readingTime}</span>
          </div>
          {book.comingSoon ? <strong className="soon-status">Скоро</strong> : null}
          <p className="content-detail-description">{meta.description}</p>
          {progressValue > 0 ? (
            <div className="content-detail-progress">
              <Progress value={progressValue} />
              <small>{progressValue}% прочитано</small>
            </div>
          ) : null}
          <button className="primary-button" type="button" disabled={book.comingSoon} onClick={() => onOpen(book.id)}>
            {book.comingSoon ? "Скоро будет доступно" : book.type === "story" ? "Читать рассказ" : "Читать"}
          </button>
        </div>
      </section>
    </main>
  );
}

function ProfilePage({
  language,
  progress,
  onSelectLanguage,
}: {
  language: NativeLanguage;
  progress: Record<string, number>;
  onSelectLanguage: (language: NativeLanguage) => void;
}) {
  const startedCount = Object.values(progress).filter((value) => value > 0).length;
  const averageProgress = startedCount
    ? Math.round(Object.values(progress).reduce((total, value) => total + value, 0) / startedCount)
    : 0;

  return (
    <main className="page-stack profile-page">
      <PageTitle title="Профиль" text="Настройки чтения и локальный прогресс на этом устройстве." />
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
        <Metric label="Начато книг" value={startedCount.toString()} />
        <Metric label="Средний прогресс" value={`${averageProgress}%`} />
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
  onChangeGoal,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onBack: () => void;
  onProgress: (value: number) => void;
  onSessionUpdate: (scrollPosition: number) => void;
  restoreScrollPosition: number | null;
  readingTimer: ReturnType<typeof useReadingTimer>;
  onChangeGoal: () => void;
}) {
  const speech = useSpeech();
  const { settings, setSettings } = useReadingSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(emptyPaginationSize);
  const [pageDirection, setPageDirection] = useState<"next" | "prev" | null>(null);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<ReaderPageWord | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<ReaderPageWord | null>(null);
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
  const closeTimer = () => {
    setTimerOpen(false);
    window.setTimeout(() => timerButtonRef.current?.focus(), 0);
  };

  useEffect(() => {
    onProgressRef.current = onProgress;
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onProgress, onSessionUpdate]);

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

  function rememberCurrentWord() {
    visibleWordIdBeforeRepaginate.current = activePage?.firstWordId ?? null;
  }

  function updateReadingSettings(nextSettings: SetStateAction<ReadingSettings>) {
    rememberCurrentWord();
    setSettings(nextSettings);
  }

  function turnPage(direction: "next" | "prev") {
    if (pages.length === 0 || isPageTurning) return;
    readingTimer.recordActivity();
    setSelectedWord(null);
    setSelectedSentence(null);
    setShowSwipeHint(false);
    try {
      window.localStorage.setItem(READER_SWIPE_HINT_KEY, "true");
    } catch {
      // The hint is cosmetic; storage failures should not affect reading.
    }

    const canTurnNext = direction === "next" && currentPageIndex < pages.length - 1;
    const canTurnPrev = direction === "prev" && currentPageIndex > 0;

    if (!canTurnNext && !canTurnPrev) {
      const chapterIndex = readerBook?.chapters.findIndex((item) => item.id === chapter.id) ?? -1;
      const nextChapter = direction === "next" ? readerBook?.chapters[chapterIndex + 1] : null;
      const previousChapter = direction === "prev" ? readerBook?.chapters[chapterIndex - 1] : null;

      if (nextChapter) {
        pendingChapterEdgeRef.current = "first";
        visibleWordIdBeforeRepaginate.current = null;
        setActiveChapterId(nextChapter.id);
        setCurrentPageIndex(0);
        return;
      }

      if (previousChapter) {
        pendingChapterEdgeRef.current = "last";
        visibleWordIdBeforeRepaginate.current = null;
        setActiveChapterId(previousChapter.id);
        setCurrentPageIndex(0);
        return;
      }

      if (direction === "next") setRestrictionOpen(true);
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
                  {item.number}. {item.title}
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
                onSelectSentence={setSelectedSentence}
                onSelectWord={setSelectedWord}
              />
            )}
          </div>
          {selectedWord ? (
            <ReaderWordPopover word={selectedWord} onClose={() => setSelectedWord(null)} />
          ) : null}
          {selectedSentence ? (
            <ReaderSentencePopover sentence={selectedSentence} onClose={() => setSelectedSentence(null)} />
          ) : null}
        </article>
        <button
          className="reader-page-edge reader-page-edge-right"
          type="button"
          aria-label="Следующая страница"
          disabled={isPageTurning || (currentPageIndex >= pages.length - 1 && book.id === "alice-in-wonderland")}
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
  onSelectSentence,
  onSelectWord,
}: {
  page: ReaderPage;
  settings: ReadingSettings;
  onSpeak: (sentenceText: string) => void;
  onSelectSentence: (word: ReaderPageWord) => void;
  onSelectWord: (word: ReaderPageWord) => void;
}) {
  const paragraphs = groupPageWords(page.words);

  return (
    <div className="structured-text">
      {paragraphs.map((paragraph) => (
        <p className="reader-paragraph" key={paragraph.paragraphId}>
          {paragraph.sentences.map((sentence) => (
            <ReaderSentenceView
              key={`${paragraph.paragraphId}-${sentence.sentenceId}`}
              sentenceWords={sentence.words}
              settings={settings}
              onSelectSentence={onSelectSentence}
              onSelectWord={onSelectWord}
              onSpeak={onSpeak}
            />
          ))}
        </p>
      ))}
    </div>
  );
}

function ReaderSentenceView({
  sentenceWords,
  settings,
  onSpeak,
  onSelectSentence,
  onSelectWord,
}: {
  sentenceWords: ReaderPageWord[];
  settings: ReadingSettings;
  onSpeak: (sentenceText: string) => void;
  onSelectSentence: (word: ReaderPageWord) => void;
  onSelectWord: (word: ReaderPageWord) => void;
}) {
  const firstWord = sentenceWords[0];
  const lastWord = sentenceWords.at(-1);
  const showSentenceActions = Boolean(lastWord?.isSentenceEnd);

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
      {showSentenceActions ? (
        <span className="sentence-actions" data-reader-interactive="true">
          <button className="sentence-audio-button" type="button" aria-label="Прослушать предложение" onClick={(event) => {
            event.stopPropagation();
            onSpeak(firstWord?.sentenceText ?? sentenceWords.map((word) => word.text).join(" "));
          }}>
            <Volume2 size={14} aria-hidden="true" />
          </button>
          {settings.showSentenceTranslation && firstWord?.sentenceTranslation ? (
            <button className="sentence-translation-trigger" type="button" aria-label="Показать перевод предложения" onClick={(event) => {
              event.stopPropagation();
              onSelectSentence(firstWord);
            }}>
              <Languages size={13} aria-hidden="true" />
              <span>RU</span>
            </button>
          ) : null}
        </span>
      ) : null}
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
  const accentParts = splitWordForAccent(word.text);

  return (
    <span
      className="reader-word"
      data-word-id={word.id}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(word);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
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
          word.text
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
function ReaderWordPopover({ word, onClose }: { word: ReaderPageWord; onClose: () => void }) {
  return (
    <aside className="reader-translation-popover word-popover" role="dialog" aria-label={`Перевод слова ${word.text}`} onClick={(event) => event.stopPropagation()}>
      <button className="popover-close" type="button" aria-label="Закрыть перевод" onClick={onClose}>×</button>
      <strong>{word.text}</strong>
      {word.transcription ? <span>{word.transcription}</span> : null}
      <p>{word.translation ?? "Перевод слова будет подключён на следующем этапе."}</p>
    </aside>
  );
}

function ReaderSentencePopover({ sentence, onClose }: { sentence: ReaderPageWord; onClose: () => void }) {
  return (
    <aside className="reader-translation-popover sentence-popover" role="dialog" aria-label="Перевод предложения" onClick={(event) => event.stopPropagation()}>
      <button className="popover-close" type="button" aria-label="Закрыть перевод" onClick={onClose}>×</button>
      <strong>Перевод предложения</strong>
      <p>{sentence.sentenceTranslation ?? "Перевод предложения будет подключён на следующем этапе."}</p>
    </aside>
  );
}

function groupPageWords(words: ReaderPageWord[]) {
  const paragraphs: Array<{ paragraphId: string; sentences: Array<{ sentenceId: string; words: ReaderPageWord[] }> }> = [];

  words.forEach((word) => {
    let paragraph = paragraphs.find((item) => item.paragraphId === word.paragraphId);
    if (!paragraph) {
      paragraph = { paragraphId: word.paragraphId, sentences: [] };
      paragraphs.push(paragraph);
    }

    let sentence = paragraph.sentences.find((item) => item.sentenceId === word.sentenceId);
    if (!sentence) {
      sentence = { sentenceId: word.sentenceId, words: [] };
      paragraph.sentences.push(sentence);
    }

    sentence.words.push(word);
  });

  return paragraphs;
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
      "button, input, select, textarea, a, [role='button'], [data-reader-interactive], .reader-word, .word, .audio-button, .sentence-audio-button, .sentence-translation-trigger, .reading-settings-panel, .reading-timer-widget, .reading-timer-layer, .reader-translation-popover",
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

function WordRow({ word, onSpeak }: { word: VocabularyEntry; onSpeak: (text: string) => void }) {
  return (
    <article className="word-row">
      <button className="audio-button" type="button" aria-label={`Прослушать ${word.word}`} onClick={() => onSpeak(word.word)}>
        <Volume2 size={16} aria-hidden="true" />
      </button>
      <div>
        <h3>{word.word}</h3>
        <span>{word.ipa}</span>
        <p>{word.translation}</p>
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
