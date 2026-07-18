import type { ReaderBook, ReaderSentence } from "../types";

function sentence(id: string, text: string, translation?: string): ReaderSentence {
  return {
    id,
    translation,
    words: text.split(" ").map((word, index) => ({
      id: `${id}-w${index + 1}`,
      text: word,
    })),
  };
}

export const aliceReaderBook: ReaderBook = {
  id: "alice-in-wonderland",
  title: "Alice's Adventures in Wonderland",
  author: "Lewis Carroll",
  chapters: [
    {
      id: "alice-chapter-1",
      number: 1,
      title: "Down the Rabbit-Hole",
      paragraphs: [
        {
          id: "alice-ch1-p1",
          sentences: [
            sentence(
              "alice-ch1-p1-s1",
              "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.",
              "Алиса начинала очень уставать от того, что сидела рядом с сестрой на берегу и ей было нечего делать.",
            ),
            sentence(
              "alice-ch1-p1-s2",
              "Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.",
              "Раз или два она заглянула в книгу, которую читала сестра, но там не было ни картинок, ни разговоров.",
            ),
          ],
        },
        {
          id: "alice-ch1-p2",
          sentences: [
            sentence(
              "alice-ch1-p2-s1",
              "So she was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies.",
              "Она размышляла, стоит ли удовольствие от плетения венка из маргариток того, чтобы вставать и собирать цветы.",
            ),
            sentence(
              "alice-ch1-p2-s2",
              "Suddenly a White Rabbit with pink eyes ran close by her.",
              "Вдруг совсем рядом с ней пробежал Белый Кролик с розовыми глазами.",
            ),
          ],
        },
        {
          id: "alice-ch1-p3",
          sentences: [
            sentence(
              "alice-ch1-p3-s1",
              "There was nothing so very remarkable in that.",
              "В этом не было ничего особенно удивительного.",
            ),
            sentence(
              "alice-ch1-p3-s2",
              "Nor did Alice think it so very much out of the way to hear the Rabbit say to itself, Oh dear! Oh dear! I shall be late!",
              "Алиса не сразу удивилась даже тому, что Кролик сказал себе: Ах боже! Ах боже! Я опоздаю!",
            ),
          ],
        },
        {
          id: "alice-ch1-p4",
          sentences: [
            sentence(
              "alice-ch1-p4-s1",
              "But when the Rabbit actually took a watch out of its waistcoat-pocket and looked at it, Alice started to her feet.",
              "Но когда Кролик вынул часы из жилетного кармана и посмотрел на них, Алиса вскочила на ноги.",
            ),
            sentence(
              "alice-ch1-p4-s2",
              "She ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.",
              "Она побежала за ним через поле и как раз успела увидеть, как он нырнул в большую кроличью нору под живой изгородью.",
            ),
          ],
        },
      ],
    },
  ],
};

export function getReaderChapter(bookId: string, chapterId?: string) {
  if (bookId !== aliceReaderBook.id) return null;
  return aliceReaderBook.chapters.find((chapter) => chapter.id === chapterId) ?? aliceReaderBook.chapters[0] ?? null;
}
