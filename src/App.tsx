import { ArrowLeft, BookOpen, Clock, Home, Languages, Library, Pause, Play, Search, User, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { getCatalogBook, getCategoryBooks, homeShelfBooks, libraryCategories, type HomeShelfBook } from "./data/homeShelves";
import { getAllVocabulary, type VocabularyEntry } from "./data/vocabulary";
import { useLearnerProgress } from "./hooks/useLearnerProgress";
import { useReadingTimer } from "./hooks/useReadingTimer";
import type { NativeLanguage } from "./types";

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

const getShelfBooks = (shelfId: string) => getCategoryBooks(shelfId);
const getShelfBook = (bookId: string) => getCatalogBook(bookId);
const homeContinueBook = getShelfBook("alice-in-wonderland") ?? homeShelfBooks[0];
const recentBooks = ["secret-garden", "wonderful-wizard-of-oz"]
  .map((bookId) => getShelfBook(bookId))
  .filter((book): book is HomeShelfBook => Boolean(book));
const recommendationBook = getShelfBook("pride-prejudice") ?? homeShelfBooks[0];
const weeklyNewBook = getShelfBook("seen-217") ?? homeShelfBooks[0];

const libraryShelves = libraryCategories.map((category) => ({
  ...category,
  books: getShelfBooks(category.id),
}));

function App() {
  const [page, setPage] = useState<Page>("home");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [bookInfo, setBookInfo] = useState<BookInfoState | null>(null);
  const [sheetInfo, setSheetInfo] = useState<{ book: HomeShelfBook; progressValue: number } | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const closeInfoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { progress, saveReadingProgress, selectLanguage } = useLearnerProgress();
  const allItems = homeShelfBooks;
  const activeBook = allItems.find((book) => book.id === activeBookId) ?? null;
  const readingTimer = useReadingTimer(
    activeBook
      ? {
          contentType: activeBook.type,
          contentId: activeBook.id,
          chapterId: activeBook.chapter,
        }
      : null,
  );

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setActiveBookId(null);
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

  function openBook(bookId: string) {
    const book = getShelfBook(bookId);
    if (book?.comingSoon) return;
    setBookInfo(null);
    setSheetInfo(null);
    setActiveBookId(bookId);
  }

  function startReadingFromGoal() {
    if (readingTimer.lastContentId && allItems.some((item) => item.id === readingTimer.lastContentId)) {
      openBook(readingTimer.lastContentId);
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
            onBack={() => setActiveBookId(null)}
            onProgress={(value) => saveReadingProgress(activeBook.id, value)}
            readingTimer={readingTimer}
            onChangeGoal={() => setGoalDialogOpen(true)}
          />
        ) : (
          <>
            {page === "home" ? (
              <HomePage
                onNavigate={navigate}
                onOpenBook={openBook}
                onShowBookInfo={showBookInfo}
                onHideBookInfo={scheduleCloseBookInfo}
                onOpenBookSheet={setSheetInfo}
                progress={progress.readingProgress}
                readingTimer={readingTimer}
                onStartReading={startReadingFromGoal}
                onChangeGoal={() => setGoalDialogOpen(true)}
              />
            ) : null}
            {page === "library" ? (
              <LibraryPage
                onOpenBook={openBook}
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
          onOpen={openBook}
          onKeepOpen={clearCloseInfoTimer}
          onRequestClose={scheduleCloseBookInfo}
        />
      ) : null}
      {sheetInfo ? (
        <BookInfoSheet
          book={sheetInfo.book}
          progressValue={sheetInfo.progressValue}
          onClose={() => setSheetInfo(null)}
          onOpen={openBook}
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
  onShowBookInfo,
  onHideBookInfo,
  onOpenBookSheet,
  progress,
  readingTimer,
  onStartReading,
  onChangeGoal,
}: {
  onNavigate: (page: Page) => void;
  onOpenBook: (bookId: string) => void;
  onShowBookInfo: (book: HomeShelfBook, progressValue: number, rect: BookRect) => void;
  onHideBookInfo: () => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressValue: number }) => void;
  progress: Record<string, number>;
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
        book={homeContinueBook}
        progressValue={progress[homeContinueBook.id] ?? homeContinueBook.progress}
        onOpen={onOpenBook}
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
          onOpen={onOpenBook}
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
  progressValue,
  onOpen,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onOpen: (bookId: string) => void;
}) {
  return (
    <section className="home-continue-panel">
      <div className="home-continue-book">
        <BookCover book={book} progressValue={progressValue} onOpen={onOpen} featured />
      </div>
      <div className="home-continue-copy">
        <span className="eyebrow">Продолжить чтение</span>
        <h2>{book.title}</h2>
        <p>{book.author}</p>
        <span>{book.chapter}</span>
        <Progress value={progressValue} />
        <small>{progressValue}% прочитано</small>
        <button className="primary-button" type="button" onClick={() => onOpen(book.id)}>Продолжить чтение</button>
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
  return (
    <article className="recommendation-card">
      <div className={`recommendation-cover cover-${book.coverStyle}`} aria-hidden="true">
        <span>{book.title}</span>
      </div>
      <div className="recommendation-copy">
        <span className="eyebrow">Рекомендация для вас</span>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <small>B1 · классика · роман · {book.readingTime}</small>
        <p className="feature-description">Спокойная классика с живыми диалогами и понятной бытовой лексикой.</p>
        <span className="recommendation-note">Подойдёт, если вам нравится спокойная классика и живые диалоги</span>
        <button className="secondary-button" type="button" onClick={() => onOpen(book.id)}>Посмотреть книгу</button>
      </div>
    </article>
  );
}

function WeeklyNewCard({ book, onOpen }: { book: HomeShelfBook; onOpen: (bookId: string) => void }) {
  return (
    <article className="weekly-new-card">
      <div className="weekly-new-overlay">
        <span className="weekly-kicker">Новинка недели</span>
        <span>StoryLingo Original</span>
        <h3>{book.title}</h3>
        <small>A2 · 12 минут</small>
        <p>Одно сообщение. Один пропущенный звонок. И слишком позднее время.</p>
        <button className="weekly-new-button" type="button" onClick={() => onOpen(book.id)}>Читать рассказ</button>
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
      <button className="book-info-button" type="button" disabled={book.comingSoon} onClick={() => onOpen(book.id)}>
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
          <button className="book-info-button" type="button" disabled={book.comingSoon} onClick={() => onOpen(book.id)}>
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
  readingTimer,
  onChangeGoal,
}: {
  book: HomeShelfBook;
  progressValue: number;
  onBack: () => void;
  onProgress: (value: number) => void;
  readingTimer: ReturnType<typeof useReadingTimer>;
  onChangeGoal: () => void;
}) {
  const speech = useSpeech();
  const [timerOpen, setTimerOpen] = useState(false);
  const timerButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextProgress = Math.min(100, Math.max(progressValue, 0) + 12);
  const closeTimer = () => {
    setTimerOpen(false);
    window.setTimeout(() => timerButtonRef.current?.focus(), 0);
  };

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

  return (
    <main
      className="reader-preview"
      onClick={readingTimer.recordActivity}
      onKeyDown={readingTimer.recordActivity}
      onPointerMove={readingTimer.recordActivity}
      onScroll={readingTimer.recordActivity}
      onTouchStart={readingTimer.recordActivity}
    >
      <button className="text-button" type="button" onClick={onBack}>← Назад в библиотеку</button>
      <article className="reader-card">
        <div className={`book-cover ${book.tone}`}><span>{book.title.split(" ")[0]}</span></div>
        <div className="reader-copy">
          <span className="eyebrow">{book.chapter}</span>
          <h1>{book.title}</h1>
          <p>{book.author}</p>
          <div className="reader-progress">
            <div><span style={{ width: `${progressValue}%` }} /></div>
            <small>{progressValue}% прочитано</small>
          </div>
          <blockquote>{book.excerpt}</blockquote>
          <button className="audio-link" type="button" onClick={() => speech.toggle(book.excerpt)}>
            <Volume2 size={18} aria-hidden="true" />
            Прослушать фрагмент
          </button>
          <button className="primary-button" type="button" onClick={() => onProgress(nextProgress)}>
            Сохранить прогресс чтения
          </button>
        </div>
      </article>
      <ReadingTimerButton
        bookTitle={book.title}
        chapterTitle={book.chapter}
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
