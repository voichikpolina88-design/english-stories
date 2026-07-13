import { BookOpen, Home, Languages, Library, Search, User, Volume2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { getAllVocabulary, type VocabularyEntry } from "./data/vocabulary";
import { useLearnerProgress } from "./hooks/useLearnerProgress";
import type { NativeLanguage } from "./types";

type Page = "home" | "library" | "dictionary" | "profile";

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

function App() {
  const [page, setPage] = useState<Page>("home");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const { progress, saveReadingProgress, selectLanguage } = useLearnerProgress();
  const allItems = [...continueBooks, ...popularStories];
  const activeBook = allItems.find((book) => book.id === activeBookId) ?? null;

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setActiveBookId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            {page === "home" ? <HomePage onNavigate={navigate} onOpenBook={setActiveBookId} progress={progress.readingProgress} /> : null}
            {page === "library" ? <LibraryPage onOpenBook={setActiveBookId} progress={progress.readingProgress} /> : null}
            {page === "dictionary" ? <DictionaryPage /> : null}
            {page === "profile" ? <ProfilePage language={progress.selectedLanguage ?? "Russian"} onSelectLanguage={selectLanguage} progress={progress.readingProgress} /> : null}
          </>
        )}
      </div>
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
  progress,
}: {
  onNavigate: (page: Page) => void;
  onOpenBook: (bookId: string) => void;
  progress: Record<string, number>;
}) {
  return (
    <main className="book-home">
      <section className="book-hero">
        <div className="book-hero-copy">
          <span className="eyebrow">StoryLingo Library</span>
          <h1>Читайте книги<br />на английском<br />с удовольствием</h1>
          <p>Истории, которые вы полюбите.<br />Английский, который вы понимаете.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate("library")}>Книги</button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("library")}>Рассказы</button>
          </div>
        </div>
        <ReadingScene />
      </section>

      <BookSection title="Продолжить чтение" className="continue-grid">
        {continueBooks.map((book) => (
          <ContinueBookCard key={book.id} book={book} progressValue={progress[book.id] ?? book.progress} onOpen={onOpenBook} />
        ))}
      </BookSection>

      <BookSection title="Популярные рассказы" className="story-grid">
        {popularStories.map((story) => (
          <StoryCard key={story.id} story={story} onOpen={onOpenBook} />
        ))}
      </BookSection>
    </main>
  );
}

function LibraryPage({ onOpenBook, progress }: { onOpenBook: (bookId: string) => void; progress: Record<string, number> }) {
  return (
    <main className="page-stack">
      <PageTitle title="Библиотека" text="Демо-полка книг и рассказов. Реальная библиотека появится позже." />
      <BookSection title="Книги" className="continue-grid">
        {continueBooks.map((book) => (
          <ContinueBookCard key={book.id} book={book} progressValue={progress[book.id] ?? book.progress} onOpen={onOpenBook} />
        ))}
      </BookSection>
      <BookSection title="Рассказы" className="story-grid">
        {popularStories.map((story) => (
          <StoryCard key={story.id} story={story} onOpen={onOpenBook} />
        ))}
      </BookSection>
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

function ReadingScene() {
  return (
    <div className="reading-scene" aria-label="Уютная книжная композиция">
      <div className="scene-glow" />
      <div className="scene-book scene-book-main">Alice</div>
      <div className="scene-book scene-book-side">Garden</div>
      <div className="scene-cup" />
      <div className="scene-candle" />
      <div className="scene-blanket" />
    </div>
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
