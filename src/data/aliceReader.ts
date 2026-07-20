import { aliceInWonderlandBook } from "./aliceInWonderland";

export const aliceReaderBook = aliceInWonderlandBook;

export function getReaderBook(bookId: string) {
  if (bookId !== aliceReaderBook.id) return null;
  return aliceReaderBook;
}

export function getReaderChapter(bookId: string, chapterId?: string) {
  if (bookId !== aliceReaderBook.id) return null;
  return aliceReaderBook.chapters.find((chapter) => chapter.id === chapterId) ?? aliceReaderBook.chapters[0] ?? null;
}
