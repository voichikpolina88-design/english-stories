import { BookOpen, Home, Languages, Library, Search, User, Volume2 } from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { homeShelfBooks, homeShelves, type HomeShelfBook } from "./data/homeShelves";
import { getAllVocabulary, type VocabularyEntry } from "./data/vocabulary";
import { useLearnerProgress } from "./hooks/useLearnerProgress";
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

type DemoBook = {
  id: string;
  title: string;
  author: string;
  type: "book" | "story";
  chapter: string;
  readingTime: string;
  progress: number;
  tone: string;
  excerpt: string;
};

const continueBooks: DemoBook[] = [
  {
    id: "alice",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    type: "book",
    chapter: "Глава 3",
    readingTime: "25 мин",
    progress: 42,
    tone: "violet",
    excerpt: "Alice was beginning to get very tired of sitting by her sister on the bank.",
  },
  {
    id: "secret-garden",
    title: "The Secret Garden",
    author: "Frances Hodgson Burnett",
    type: "book",
    chapter: "Глава 5",
    readingTime: "30 мин",
    progress: 28,
    tone: "rose",
    excerpt: "When Mary Lennox was sent to Misselthwaite Manor she felt lonely and curious.",
  },
  {
    id: "oz",
    title: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    type: "book",
    chapter: "Глава 2",
    readingTime: "22 мин",
    progress: 64,
    tone: "gold",
    excerpt: "Dorothy lived in the midst of the great Kansas prairies with Uncle Henry.",
  },
  {
    id: "anne",
    title: "Anne of Green Gables",
    author: "L. M. Montgomery",
    type: "book",
    chapter: "Глава 7",
    readingTime: "28 мин",
    progress: 53,
    tone: "plum",
    excerpt: "Anne looked at the world with bright eyes and a heart full of stories.",
  },
];

const popularStories: DemoBook[] = [
  {
    id: "seen-217",
    title: "Seen at 2:17 AM",
    author: "StoryLingo Original",
    type: "story",
    chapter: "Короткий рассказ",
    readingTime: "12 мин",
    progress: 0,
    tone: "midnight",
    excerpt: "At 2:17 AM, the old reading lamp turned on by itself.",
  },
  {
    id: "magi",
    title: "The Gift of the Magi",
    author: "O. Henry",
    type: "story",
    chapter: "Классика",
    readingTime: "18 мин",
    progress: 0,
    tone: "candle",
    excerpt: "One dollar and eighty-seven cents. That was all.",
  },
  {
    id: "last-leaf",
    title: "The Last Leaf",
    author: "O. Henry",
    type: "story",
    chapter: "Классика",
    readingTime: "16 мин",
    progress: 0,
    tone: "leaf",
    excerpt: "In a little district west of Washington Square the streets have run crazy.",
  },
  {
    id: "open-door",
    title: "The Open Door",
    author: "StoryLingo Original",
    type: "story",
    chapter: "Короткий рассказ",
    readingTime: "10 мин",
    progress: 0,
    tone: "door",
    excerpt: "The door at the end of the hall was always open, but nobody entered.",
  },
];

const getShelfBooks = (shelfId: string) => homeShelves.find((shelf) => shelf.id === shelfId)?.books ?? [];
const getShelfBook = (bookId: string) => homeShelfBooks.find((book) => book.id === bookId);
const homeContinueBook = getShelfBook("alice") ?? homeShelfBooks[0];
const recentBooks = ["secret-garden", "oz", "anne"]
  .map((bookId) => getShelfBook(bookId))
  .filter((book): book is HomeShelfBook => Boolean(book));
const recommendationBook = getShelfBook("pride-prejudice") ?? homeShelfBooks[0];
const weeklyNewBook = getShelfBook("seen-217") ?? homeShelfBooks[0];
const classicBooks = [
  "pride-prejudice",
  "frankenstein",
  "little-women",
  "time-machine",
  "jane-eyre",
  "magi",
  "last-leaf",
  "happy-prince",
  "tell-tale-heart",
]
  .map((bookId) => getShelfBook(bookId))
  .filter((book): book is HomeShelfBook => Boolean(book));

const libraryShelves = [
  { id: "popular-books", title: "🔥 Популярные книги", books: getShelfBooks("popular-books") },
  { id: "classics", title: "Классика", books: classicBooks },
  { id: "originals", title: "✨ StoryLingo Originals", books: getShelfBooks("originals") },
  { id: "short-stories", title: "📚 Короткие рассказы", books: getShelfBooks("short-stories") },
  { id: "new", title: "Новинки", books: [weeklyNewBook, ...getShelfBooks("originals").filter((book) => book.id !== weeklyNewBook.id)] },
];

function App() {
  const [page, setPage] = useState<Page>("home");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [bookInfo, setBookInfo] = useState<BookInfoState | null>(null);
  const [sheetInfo, setSheetInfo] = useState<{ book: HomeShelfBook; progressValue: number } | null>(null);
  const closeInfoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { progress, saveReadingProgress, selectLanguage } = useLearnerProgress();
  const allItems = [...continueBooks, ...popularStories, ...homeShelfBooks];
  const activeBook = allItems.find((book) => book.id === activeBookId) ?? null;

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
    setBookInfo(null);
    setSheetInfo(null);
    setActiveBookId(bookId);
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
}: {
  onNavigate: (page: Page) => void;
  onOpenBook: (bookId: string) => void;
  onShowBookInfo: (book: HomeShelfBook, progressValue: number, rect: BookRect) => void;
  onHideBookInfo: () => void;
  onOpenBookSheet: (info: { book: HomeShelfBook; progressValue: number }) => void;
  progress: Record<string, number>;
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
        <FeatureCard
          title="Рекомендация для вас"
          book={recommendationBook}
          description="Спокойная классика с живыми диалогами и понятной бытовой лексикой."
          badge="B1 · роман · 34 мин"
          action="Открыть"
          onOpen={onOpenBook}
        />
        <FeatureCard
          title="Новинка недели"
          book={weeklyNewBook}
          description="Короткий атмосферный рассказ для вечернего чтения."
          badge="StoryLingo Original · A2 · 12 мин"
          action="Открыть"
          onOpen={onOpenBook}
          original
        />
      </section>

      <section className="home-progress-panel">
        <ProgressMetric label="Прочитано глав" value="12" />
        <ProgressMetric label="Прочитано рассказов" value="7" />
        <ProgressMetric label="Серия чтения" value="5 дней" />
      </section>
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

function FeatureCard({
  title,
  book,
  description,
  badge,
  action,
  original = false,
  onOpen,
}: {
  title: string;
  book: HomeShelfBook;
  description: string;
  badge: string;
  action: string;
  original?: boolean;
  onOpen: (bookId: string) => void;
}) {
  return (
    <article className="home-feature-card">
      <div>
        <span className="eyebrow">{title}</span>
        <h3>{book.title}</h3>
        <p>{description}</p>
        <small>{badge}</small>
        {original ? <strong>StoryLingo Original</strong> : null}
      </div>
      <button className="secondary-button" type="button" onClick={() => onOpen(book.id)}>{action}</button>
    </article>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ShelfSection({ title, children, onViewAll, compact = false }: { title: string; children: ReactNode; onViewAll: () => void; compact?: boolean }) {
  return (
    <section className={compact ? "shelf-section compact" : "shelf-section"}>
      <div className="shelf-heading">
        <h2>{title}</h2>
        <button className="shelf-link" type="button" onClick={onViewAll}>Все</button>
      </div>
      {children}
    </section>
  );
}

function BookShelf({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? "book-shelf compact" : "book-shelf"}>
      <div className="shelf-books">{children}</div>
      <div className="wood-shelf" aria-hidden="true" />
    </div>
  );
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
        {meta.safeProgress > 0 ? "Продолжить" : "Читать"}
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
            {meta.safeProgress > 0 ? "Продолжить" : "Читать"}
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

  const visibleShelves = libraryShelves
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
        <h1>Библиотека</h1>
        <p>Полный демо-каталог книг и рассказов. Реальные подборки появятся позже.</p>
      </section>

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

      {visibleShelves.map((shelf) => (
        <ShelfSection key={shelf.id} title={shelf.title} onViewAll={() => setQuery("")}>
          <BookShelf>
            {shelf.books.map((book) => (
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
}: {
  book: DemoBook;
  progressValue: number;
  onBack: () => void;
  onProgress: (value: number) => void;
}) {
  const speech = useSpeech();
  const nextProgress = Math.min(100, Math.max(progressValue, 0) + 12);

  return (
    <main className="reader-preview">
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
    </main>
  );
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
  book: DemoBook;
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

function StoryCard({ story, onOpen }: { story: DemoBook; onOpen: (bookId: string) => void }) {
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
