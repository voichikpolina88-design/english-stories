import { stories } from "./stories";
import type { Level } from "../types";

export type VocabularyCategory =
  | "daily life"
  | "travel"
  | "school"
  | "work"
  | "emotions"
  | "objects"
  | "actions";

export type VocabularyEntry = {
  id: string;
  word: string;
  translation: string;
  ipa: string;
  level: Level;
  sourceStory: string;
  sourceStories: string[];
  sourceStoryIds: string[];
  example: string;
  exampleRu: string;
  category: VocabularyCategory;
};

type SupplementalVocabularyItem = {
  word: string;
  translation: string;
  level: Level;
  sourceStoryId: string;
  example: string;
  exampleRu: string;
  category: VocabularyCategory;
};

const ipaDictionary: Record<string, string> = {
  "wake up": "/weik up/",
  breakfast: "/brek-fuhst/",
  ready: "/red-ee/",
  quiet: "/kwy-uht/",
  usually: "/yoo-zhoo-uh-lee/",
  brush: "/brush/",
  window: "/win-doh/",
  toast: "/tohst/",
  bag: "/bag/",
  dictionary: "/dik-shuh-ner-ee/",
  beach: "/beech/",
  warm: "/worm/",
  sandwich: "/san-wich/",
  tired: "/ty-erd/",
  sunny: "/sun-ee/",
  towel: "/tow-uhl/",
  wave: "/wayv/",
  ball: "/bawl/",
  sand: "/sand/",
  photo: "/foh-toh/",
  supermarket: "/soo-per-mar-kit/",
  basket: "/bas-kit/",
  milk: "/milk/",
  bread: "/bred/",
  apple: "/ap-uhl/",
  cheese: "/cheez/",
  price: "/prys/",
  cashier: "/ka-sheer/",
  receipt: "/ri-seet/",
  "next door": "/nekst dor/",
  family: "/fam-uh-lee/",
  mother: "/muh-thur/",
  father: "/fah-thur/",
  sister: "/sis-ter/",
  brother: "/bruh-thur/",
  grandmother: "/gran-muh-thur/",
  home: "/hohm/",
  dinner: "/din-er/",
  kind: "/kynd/",
  funny: "/fun-ee/",
  friend: "/frend/",
  best: "/best/",
  laugh: "/laf/",
  game: "/gaym/",
  help: "/help/",
  park: "/park/",
  bike: "/byk/",
  share: "/shair/",
  story: "/stor-ee/",
  together: "/tuh-geth-er/",
  school: "/skool/",
  teacher: "/tee-cher/",
  classroom: "/klas-room/",
  lesson: "/les-uhn/",
  desk: "/desk/",
  pencil: "/pen-suhl/",
  book: "/book/",
  homework: "/hohm-wurk/",
  break: "/brayk/",
  answer: "/an-ser/",
  room: "/room/",
  bed: "/bed/",
  lamp: "/lamp/",
  chair: "/chair/",
  table: "/tay-buhl/",
  wall: "/wawl/",
  clean: "/kleen/",
  toy: "/toy/",
  floor: "/flor/",
  shelf: "/shelf/",
  rain: "/rayn/",
  umbrella: "/um-brel-uh/",
  coat: "/koht/",
  inside: "/in-syd/",
  wet: "/wet/",
  cloud: "/klowd/",
  cozy: "/koh-zee/",
  stop: "/stop/",
  excited: "/ik-sy-tid/",
  weekend: "/week-end/",
  plan: "/plan/",
  visit: "/viz-it/",
  picnic: "/pik-nik/",
  movie: "/moo-vee/",
  tomorrow: "/tuh-mor-oh/",
  notebook: "/noht-book/",
  bicycle: "/by-si-kuhl/",
  helmet: "/hel-mit/",
  bell: "/bel/",
  shiny: "/shy-nee/",
  ride: "/ryd/",
  safe: "/sayf/",
  turn: "/turn/",
  proud: "/prowd/",
  street: "/street/",
  wheel: "/weel/",
  nervous: "/nur-vuhs/",
  station: "/stay-shuhn/",
  ticket: "/tik-it/",
  platform: "/plat-form/",
  train: "/trayn/",
  cousin: "/kuh-zuhn/",
  announcement: "/uh-nowns-muhnt/",
  direction: "/duh-rek-shuhn/",
  confidence: "/kon-fi-duhns/",
  adventure: "/ad-ven-cher/",
  cafe: "/ka-fay/",
  phone: "/fohn/",
  pocket: "/pok-it/",
  worried: "/wur-eed/",
  waiter: "/way-ter/",
  explain: "/ik-splayn/",
  search: "/surch/",
  newspaper: "/nooz-pay-per/",
  rule: "/rool/",
  grateful: "/grayt-fuhl/",
  drive: "/dryv/",
  instructor: "/in-struk-ter/",
  mirror: "/meer-er/",
  brake: "/brayk/",
  traffic: "/traf-ik/",
  license: "/ly-suhns/",
  engine: "/en-jin/",
  calm: "/kahm/",
  mistake: "/mis-tayk/",
  busy: "/biz-ee/",
  schedule: "/skej-ool/",
  meeting: "/mee-ting/",
  errand: "/air-uhnd/",
  library: "/ly-brair-ee/",
  appointment: "/uh-poynt-muhnt/",
  rest: "/rest/",
  finish: "/fin-ish/",
  hurry: "/hur-ee/",
  evening: "/eev-ning/",
  hobby: "/hob-ee/",
  paint: "/paynt/",
  color: "/kul-er/",
  practice: "/prak-tis/",
  creative: "/kree-ay-tiv/",
  canvas: "/kan-vuhs/",
  gallery: "/gal-er-ee/",
  improve: "/im-proov/",
  surprise: "/ser-pryz/",
  birthday: "/burth-day/",
  invite: "/in-vyt/",
  decorate: "/dek-uh-rayt/",
  secret: "/see-krit/",
  cake: "/kayk/",
  candle: "/kan-duhl/",
  guest: "/gest/",
  memory: "/mem-er-ee/",
  airport: "/air-port/",
  flight: "/flyt/",
  passport: "/pas-port/",
  gate: "/gayt/",
  luggage: "/lug-ij/",
  boarding: "/bor-ding/",
  security: "/si-kyur-uh-tee/",
  delay: "/di-lay/",
  "window seat": "/win-doh seet/",
  move: "/moov/",
  city: "/sit-ee/",
  neighbor: "/nay-ber/",
  address: "/ad-res/",
  apartment: "/uh-part-muhnt/",
  map: "/map/",
  box: "/boks/",
  market: "/mar-kit/",
  hiking: "/hy-king/",
  trail: "/trayl/",
  forest: "/for-ist/",
  hill: "/hil/",
  view: "/vyoo/",
  backpack: "/bak-pak/",
  "water bottle": "/waw-ter bot-uhl/",
  keys: "/keez/",
  missing: "/mis-ing/",
  drawer: "/draw-er/",
  remember: "/ri-mem-ber/",
  found: "/fownd/",
  jacket: "/jak-it/",
  kitchen: "/kich-uhn/",
  sofa: "/soh-fuh/",
  calmly: "/kahm-lee/",
  door: "/dor/",
  colleague: "/kol-eeg/",
  interview: "/in-ter-vyoo/",
  responsibility: "/ri-spon-suh-bil-uh-tee/",
  confident: "/kon-fi-duhnt/",
  manager: "/man-ij-er/",
  urgent: "/ur-juhnt/",
  software: "/soft-wair/",
  pretend: "/pri-tend/",
  correct: "/kuh-rekt/",
  failure: "/fayl-yer/",
  meaningful: "/mee-ning-fuhl/",
  prepare: "/pri-pair/",
  tender: "/ten-der/",
  patience: "/pay-shuhns/",
  ordinary: "/or-duh-nair-ee/",
  label: "/lay-buhl/",
  ribbon: "/rib-uhn/",
  expensive: "/ik-spen-siv/",
  attention: "/uh-ten-shuhn/",
  university: "/yoo-nuh-vur-suh-tee/",
  campus: "/kam-puhs/",
  lecture: "/lek-cher/",
  orientation: "/or-ee-en-tay-shuhn/",
  independent: "/in-di-pen-duhnt/",
  major: "/may-jer/",
  deadline: "/ded-lyn/",
  notes: "/nohts/",
  roommate: "/room-mayt/",
  confusing: "/kuhn-fyoo-zing/",
  decision: "/di-sizh-uhn/",
  opportunity: "/op-er-too-nuh-tee/",
  choice: "/choys/",
  advice: "/ad-vys/",
  future: "/fyoo-cher/",
  accept: "/ak-sept/",
  refuse: "/ri-fyooz/",
  pressure: "/presh-er/",
  honest: "/on-ist/",
  priority: "/pry-or-uh-tee/",
  unexpected: "/un-ik-spek-tid/",
  message: "/mes-ij/",
  reply: "/ri-ply/",
  apology: "/uh-pol-uh-jee/",
  conversation: "/kon-ver-say-shuhn/",
  misunderstanding: "/mis-un-der-stan-ding/",
  honestly: "/on-ist-lee/",
  forgive: "/fer-giv/",
  silence: "/sy-luhns/",
  relief: "/ri-leef/",
  abroad: "/uh-brawd/",
  lost: "/lawst/",
  embassy: "/em-buh-see/",
  translate: "/trans-layt/",
  landmark: "/land-mark/",
  local: "/loh-kuhl/",
  route: "/root/",
  signal: "/sig-nuhl/",
  "surprise gift": "/ser-pryz gift/",
};

const supplementalVocabulary: SupplementalVocabularyItem[] = [
  {
    word: "phone",
    translation: "телефон",
    level: "A2",
    sourceStoryId: "lost-phone",
    example: "Mira looks for her phone in the cafe.",
    exampleRu: "Мира ищет свой телефон в кафе.",
    category: "objects",
  },
  {
    word: "interview",
    translation: "собеседование",
    level: "B1",
    sourceStoryId: "new-job",
    example: "Oleg has an interview for a new job.",
    exampleRu: "У Олега собеседование на новую работу.",
    category: "work",
  },
  {
    word: "next door",
    translation: "по соседству",
    level: "A1",
    sourceStoryId: "best-friend",
    example: "Tom lives next door to Leo.",
    exampleRu: "Том живет по соседству с Лео.",
    category: "daily life",
  },
  {
    word: "surprise gift",
    translation: "неожиданный подарок",
    level: "B1",
    sourceStoryId: "surprise-gift",
    example: "Sara prepares a surprise gift for her friend.",
    exampleRu: "Сара готовит неожиданный подарок для своей подруги.",
    category: "daily life",
  },
];

const exampleTranslations: Record<string, string> = {
  "wake up": "Я просыпаюсь в семь.",
  breakfast: "Завтрак - это теплый тост и чай.",
  ready: "Эмма готова к школе.",
  quiet: "Улица утром тихая.",
  supermarket: "Мила идет в супермаркет.",
  receipt: "Мила берет чек.",
  nervous: "Путешествие без родителей заставило Никиту нервничать.",
  platform: "Никита пытается найти третью платформу.",
  phone: "Телефон Миры был не там.",
  surprise: "Вечеринка - это сюрприз.",
  decision: "Сара должна принять решение.",
  meaningful: "Альбом был значимым.",
  university: "Сегодня начинается университет.",
  abroad: "Лео путешествует за границей.",
};

export function ipaForWord(word: string) {
  return ipaDictionary[word.toLowerCase()] ?? `/${word.toLowerCase()}/`;
}

export const vocabularyDatabase: VocabularyEntry[] = buildVocabularyDatabase();

export function getAllVocabulary() {
  return vocabularyDatabase;
}

export function getVocabularyByLevel(level: Level) {
  return vocabularyDatabase.filter((entry) => entry.level === level);
}

export function getVocabularyByStory(storyId: string) {
  return vocabularyDatabase.filter((entry) => entry.sourceStoryIds.includes(storyId));
}

export function getVocabularyByCategory(category: VocabularyCategory) {
  return vocabularyDatabase.filter((entry) => entry.category === category);
}

export function searchVocabulary(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return vocabularyDatabase;

  return vocabularyDatabase.filter((entry) =>
    [entry.word, entry.translation, entry.ipa, entry.category, ...entry.sourceStories]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function buildVocabularyDatabase() {
  const entries = new Map<string, VocabularyEntry>();

  for (const story of stories) {
    for (const item of story.vocabulary) {
      const key = item.word.toLowerCase();
      const existing = entries.get(key);

      if (existing) {
        if (!existing.sourceStories.includes(story.title)) existing.sourceStories.push(story.title);
        if (!existing.sourceStoryIds.includes(story.id)) existing.sourceStoryIds.push(story.id);
        existing.level = lowestLevel(existing.level, story.level);
        continue;
      }

      entries.set(key, {
        id: toVocabularyId(item.word),
        word: item.word,
        translation: item.translation,
        ipa: ipaForWord(item.word),
        level: story.level,
        sourceStory: story.title,
        sourceStories: [story.title],
        sourceStoryIds: [story.id],
        example: item.example,
        exampleRu: exampleTranslations[key] ?? buildExampleTranslation(item.translation),
        category: categoryForWord(item.word, story.id),
      });
    }
  }

  for (const item of supplementalVocabulary) {
    const story = stories.find((currentStory) => currentStory.id === item.sourceStoryId);
    if (!story) continue;

    const key = item.word.toLowerCase();
    const existing = entries.get(key);

    if (existing) {
      if (!existing.sourceStories.includes(story.title)) existing.sourceStories.push(story.title);
      if (!existing.sourceStoryIds.includes(story.id)) existing.sourceStoryIds.push(story.id);
      existing.level = lowestLevel(existing.level, item.level);
      continue;
    }

    entries.set(key, {
      id: toVocabularyId(item.word),
      word: item.word,
      translation: item.translation,
      ipa: ipaForWord(item.word),
      level: item.level,
      sourceStory: story.title,
      sourceStories: [story.title],
      sourceStoryIds: [story.id],
      example: item.example,
      exampleRu: item.exampleRu,
      category: item.category,
    });
  }

  return Array.from(entries.values()).sort((a, b) => a.level.localeCompare(b.level) || a.word.localeCompare(b.word));
}

function toVocabularyId(word: string) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildExampleTranslation(translation: string) {
  return `Пример со словом «${translation}».`;
}

function lowestLevel(current: Level, next: Level): Level {
  const order: Level[] = ["A1", "A2", "B1"];
  return order[Math.min(order.indexOf(current), order.indexOf(next))];
}

function categoryForWord(word: string, storyId: string): VocabularyCategory {
  const normalizedWord = word.toLowerCase();

  if (["my-first-trip", "airport", "moving-city", "weekend-hiking", "lost-abroad"].includes(storyId)) return "travel";
  if (["at-school", "first-day-university"].includes(storyId)) return "school";
  if (["new-job", "difficult-decision"].includes(storyId)) return "work";
  if (["lost-phone", "unexpected-message"].includes(storyId)) return "emotions";

  if (
    [
      "wake up",
      "brush",
      "prepare",
      "move",
      "visit",
      "share",
      "help",
      "search",
      "remember",
      "accept",
      "refuse",
      "reply",
      "forgive",
      "translate",
      "improve",
    ].includes(normalizedWord)
  ) {
    return "actions";
  }

  if (
    [
      "bag",
      "basket",
      "receipt",
      "phone",
      "keys",
      "passport",
      "ticket",
      "helmet",
      "bicycle",
      "desk",
      "book",
      "pencil",
      "lamp",
      "sofa",
      "ribbon",
      "album",
    ].includes(normalizedWord)
  ) {
    return "objects";
  }

  if (
    [
      "nervous",
      "worried",
      "happy",
      "tired",
      "confident",
      "grateful",
      "relief",
      "pressure",
      "honest",
      "meaningful",
      "unexpected",
    ].includes(normalizedWord)
  ) {
    return "emotions";
  }

  return "daily life";
}
