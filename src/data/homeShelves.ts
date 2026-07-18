export type HomeShelfBook = {
  id: string;
  title: string;
  author: string;
  type: "book" | "story";
  contentType: "book" | "story";
  chapter: string;
  readingTime: string;
  progress: number;
  tone: string;
  excerpt: string;
  coverStyle: "classic" | "botanical" | "gold" | "plum" | "gothic" | "rose" | "future" | "midnight" | "paper" | "emerald";
  tilt: number;
  level?: string;
  chapters?: string;
  coverImage?: string;
  original?: boolean;
  comingSoon?: boolean;
};

export type HomeShelf = {
  id: string;
  title: string;
  books: HomeShelfBook[];
};

export type LibraryCategory = {
  id: string;
  title: string;
  bookIds: string[];
};

export const libraryCatalog: HomeShelfBook[] = [
  {
    id: "alice-in-wonderland",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    type: "book",
    contentType: "book",
    chapter: "Глава 3",
    readingTime: "25 мин",
    progress: 42,
    tone: "violet",
    coverStyle: "classic",
    coverImage: "/covers/alice-classic-book.jpg",
    level: "A2",
    chapters: "12 глав",
    tilt: -3,
    excerpt: "Alice was beginning to get very tired of sitting by her sister on the bank.",
  },
  {
    id: "secret-garden",
    title: "The Secret Garden",
    author: "Frances Hodgson Burnett",
    type: "book",
    contentType: "book",
    chapter: "Глава 5",
    readingTime: "30 мин",
    progress: 28,
    tone: "rose",
    coverStyle: "botanical",
    coverImage: "/covers/secret-garden-classic-book.jpg",
    level: "A2",
    chapters: "15 глав",
    tilt: 2,
    excerpt: "When Mary Lennox was sent to Misselthwaite Manor she felt lonely and curious.",
  },
  {
    id: "wonderful-wizard-of-oz",
    title: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    type: "book",
    contentType: "book",
    chapter: "Глава 2",
    readingTime: "22 мин",
    progress: 64,
    tone: "gold",
    coverStyle: "gold",
    coverImage: "/covers/wizard-of-oz-classic-book.jpg",
    level: "A1",
    chapters: "14 глав",
    tilt: -1,
    excerpt: "Dorothy lived in the midst of the great Kansas prairies with Uncle Henry.",
  },
  {
    id: "pride-and-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    type: "book",
    contentType: "book",
    chapter: "Классика",
    readingTime: "34 мин",
    progress: 0,
    tone: "rose",
    coverStyle: "rose",
    coverImage: "/covers/pride-prejudice-classic-book.jpg",
    level: "B1",
    chapters: "Скоро",
    tilt: -2,
    comingSoon: true,
    excerpt: "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.",
  },
  {
    id: "frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    type: "book",
    contentType: "book",
    chapter: "Классика",
    readingTime: "36 мин",
    progress: 0,
    tone: "midnight",
    coverStyle: "gothic",
    coverImage: "/covers/frankenstein-classic-book.jpg",
    level: "B1",
    chapters: "Скоро",
    tilt: 2,
    comingSoon: true,
    excerpt: "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.",
  },
  {
    id: "little-women",
    title: "Little Women",
    author: "Louisa May Alcott",
    type: "book",
    contentType: "book",
    chapter: "Классика",
    readingTime: "32 мин",
    progress: 0,
    tone: "plum",
    coverStyle: "paper",
    coverImage: "/covers/little-women-classic-book.jpg",
    level: "B1",
    chapters: "Скоро",
    tilt: -1,
    comingSoon: true,
    excerpt: "Christmas won't be Christmas without any presents, grumbled Jo, lying on the rug.",
  },
  {
    id: "last-leaf",
    title: "The Last Leaf",
    author: "O. Henry",
    type: "story",
    contentType: "story",
    chapter: "Классический рассказ",
    readingTime: "16 мин",
    progress: 0,
    tone: "leaf",
    coverStyle: "emerald",
    coverImage: "/covers/last-leaf.png",
    level: "A2",
    chapters: "1 рассказ",
    tilt: 2,
    comingSoon: true,
    excerpt: "In a little district west of Washington Square the streets have run crazy.",
  },
  {
    id: "happy-prince",
    title: "The Happy Prince",
    author: "Oscar Wilde",
    type: "story",
    contentType: "story",
    chapter: "Классический рассказ",
    readingTime: "15 мин",
    progress: 0,
    tone: "gold",
    coverStyle: "gold",
    coverImage: "/covers/happy-prince.png",
    level: "A2",
    chapters: "1 рассказ",
    tilt: -1,
    comingSoon: true,
    excerpt: "High above the city, on a tall column, stood the statue of the Happy Prince.",
  },
  {
    id: "tell-tale-heart",
    title: "The Tell-Tale Heart",
    author: "Edgar Allan Poe",
    type: "story",
    contentType: "story",
    chapter: "Классический рассказ",
    readingTime: "14 мин",
    progress: 0,
    tone: "midnight",
    coverStyle: "gothic",
    coverImage: "/covers/tell-tale-heart.png",
    level: "B1",
    chapters: "1 рассказ",
    tilt: 3,
    comingSoon: true,
    excerpt: "True! nervous, very, very dreadfully nervous I had been and am.",
  },
  {
    id: "magi",
    title: "The Gift of the Magi",
    author: "O. Henry",
    type: "story",
    contentType: "story",
    chapter: "Классический рассказ",
    readingTime: "18 мин",
    progress: 0,
    tone: "candle",
    coverStyle: "gold",
    coverImage: "/covers/gift-of-the-magi.png",
    level: "A2",
    chapters: "1 рассказ",
    tilt: -2,
    comingSoon: true,
    excerpt: "One dollar and eighty-seven cents. That was all.",
  },
  {
    id: "wrong-message",
    title: "Wrong Message",
    author: "StoryLingo Original",
    type: "story",
    contentType: "story",
    chapter: "Короткий рассказ",
    readingTime: "9 мин",
    progress: 0,
    tone: "violet",
    coverStyle: "future",
    level: "A2",
    chapters: "1 рассказ",
    tilt: -1,
    original: true,
    comingSoon: true,
    excerpt: "Mia sent the message to the wrong person, and the answer arrived in ten seconds.",
  },
  {
    id: "last-train",
    title: "The Last Train",
    author: "StoryLingo Original",
    type: "story",
    contentType: "story",
    chapter: "Короткий рассказ",
    readingTime: "11 мин",
    progress: 0,
    tone: "midnight",
    coverStyle: "midnight",
    level: "A2",
    chapters: "1 рассказ",
    tilt: 3,
    original: true,
    comingSoon: true,
    excerpt: "The platform was empty when the last train stopped without a sound.",
  },
  {
    id: "coffee-shop-girl",
    title: "Coffee Shop Girl",
    author: "StoryLingo Original",
    type: "story",
    contentType: "story",
    chapter: "Короткий рассказ",
    readingTime: "8 мин",
    progress: 0,
    tone: "candle",
    coverStyle: "paper",
    level: "A1",
    chapters: "1 рассказ",
    tilt: -3,
    original: true,
    comingSoon: true,
    excerpt: "Every morning, she wrote one English word on the cup before handing it to him.",
  },
  {
    id: "seen-217",
    title: "Seen at 2:17 AM",
    author: "StoryLingo Original",
    type: "story",
    contentType: "story",
    chapter: "Короткий рассказ",
    readingTime: "12 мин",
    progress: 0,
    tone: "midnight",
    coverStyle: "midnight",
    level: "B1",
    chapters: "1 рассказ",
    tilt: -2,
    original: true,
    comingSoon: true,
    excerpt: "At 2:17 AM, the old reading lamp turned on by itself.",
  },
  {
    id: "open-door",
    title: "The Open Door",
    author: "StoryLingo Original",
    type: "story",
    contentType: "story",
    chapter: "Короткий рассказ",
    readingTime: "10 мин",
    progress: 0,
    tone: "door",
    coverStyle: "gothic",
    level: "A2",
    chapters: "1 рассказ",
    tilt: 2,
    original: true,
    comingSoon: true,
    excerpt: "The door at the end of the hall was always open, but nobody entered.",
  },
];

export const libraryCategories: LibraryCategory[] = [
  {
    id: "classic-books",
    title: "Классические книги",
    bookIds: ["alice-in-wonderland", "secret-garden", "wonderful-wizard-of-oz", "pride-and-prejudice", "frankenstein", "little-women"],
  },
  {
    id: "classic-stories",
    title: "Классические рассказы",
    bookIds: ["last-leaf", "happy-prince", "tell-tale-heart", "magi"],
  },
  {
    id: "originals",
    title: "StoryLingo Originals",
    bookIds: ["wrong-message", "last-train", "coffee-shop-girl", "seen-217", "open-door"],
  },
  {
    id: "new",
    title: "Новинки",
    bookIds: ["seen-217", "coffee-shop-girl", "open-door", "wrong-message", "last-train"],
  },
];

export const getCatalogBook = (bookId: string) => libraryCatalog.find((book) => book.id === bookId);

export const getCategoryBooks = (categoryId: string) => {
  const category = libraryCategories.find((item) => item.id === categoryId);
  return category ? category.bookIds.map((bookId) => getCatalogBook(bookId)).filter((book): book is HomeShelfBook => Boolean(book)) : [];
};

const homeShelfConfig: LibraryCategory[] = [
  {
    id: "continue",
    title: "📖 Продолжить чтение",
    bookIds: ["alice-in-wonderland", "secret-garden", "wonderful-wizard-of-oz"],
  },
  ...libraryCategories,
];

export const homeShelves: HomeShelf[] = homeShelfConfig.map((shelf) => ({
  id: shelf.id,
  title: shelf.title,
  books: shelf.bookIds.map((bookId) => getCatalogBook(bookId)).filter((book): book is HomeShelfBook => Boolean(book)),
}));

export const homeShelfBooks = libraryCatalog;
