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

export type VocabularyLookupEntry = Pick<
  VocabularyEntry,
  "id" | "word" | "translation" | "ipa" | "sourceStories" | "sourceStoryIds" | "example" | "exampleRu" | "category" | "level" | "sourceStory"
>;

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

const manualWordForms: Record<string, { translation: string; ipa?: string; category?: VocabularyCategory }> = {
  a: { translation: "неопределенный артикль" },
  about: { translation: "о" },
  after: { translation: "после" },
  again: { translation: "снова" },
  all: { translation: "все" },
  also: { translation: "также" },
  always: { translation: "всегда" },
  an: { translation: "неопределенный артикль" },
  and: { translation: "и" },
  are: { translation: "являются" },
  as: { translation: "как" },
  at: { translation: "в, у" },
  be: { translation: "быть" },
  because: { translation: "потому что" },
  before: { translation: "до" },
  better: { translation: "лучше" },
  big: { translation: "большой" },
  blue: { translation: "синий" },
  both: { translation: "оба" },
  bring: { translation: "приносить" },
  brings: { translation: "приносит" },
  but: { translation: "но" },
  by: { translation: "у, около" },
  can: { translation: "мочь" },
  "can't": { translation: "не может" },
  cannot: { translation: "не может" },
  car: { translation: "машина" },
  day: { translation: "день" },
  did: { translation: "сделал" },
  do: { translation: "делать" },
  does: { translation: "делает" },
  "doesn't": { translation: "не делает" },
  down: { translation: "вниз" },
  during: { translation: "во время" },
  each: { translation: "каждый" },
  early: { translation: "рано" },
  easy: { translation: "легкий" },
  eat: { translation: "есть" },
  eats: { translation: "ест" },
  emma: { translation: "Эмма" },
  empty: { translation: "пустой" },
  english: { translation: "английский" },
  every: { translation: "каждый" },
  everyone: { translation: "все" },
  eyes: { translation: "глаза", ipa: "/eyez/", category: "objects" },
  face: { translation: "лицо" },
  felt: { translation: "почувствовал" },
  find: { translation: "находить" },
  first: { translation: "первый" },
  for: { translation: "для" },
  from: { translation: "из" },
  gets: { translation: "получает" },
  gift: { translation: "подарок" },
  give: { translation: "давать" },
  gives: { translation: "дает" },
  go: { translation: "идти" },
  goes: { translation: "идет" },
  good: { translation: "хороший" },
  green: { translation: "зеленый" },
  had: { translation: "имел" },
  has: { translation: "имеет" },
  have: { translation: "иметь" },
  he: { translation: "он" },
  heavy: { translation: "тяжелый" },
  hello: { translation: "привет" },
  her: { translation: "ее" },
  him: { translation: "его" },
  his: { translation: "его" },
  how: { translation: "как" },
  i: { translation: "я" },
  important: { translation: "важный" },
  in: { translation: "в" },
  into: { translation: "внутрь" },
  is: { translation: "является" },
  it: { translation: "это" },
  job: { translation: "работа" },
  keep: { translation: "держать" },
  know: { translation: "знать" },
  large: { translation: "большой" },
  late: { translation: "поздно" },
  later: { translation: "позже" },
  learn: { translation: "учить" },
  learning: { translation: "изучение" },
  left: { translation: "левый" },
  leo: { translation: "Лео" },
  like: { translation: "нравиться" },
  likes: { translation: "нравится" },
  little: { translation: "маленький" },
  live: { translation: "жить" },
  lives: { translation: "живет" },
  look: { translation: "смотреть" },
  looks: { translation: "смотрит" },
  many: { translation: "много" },
  max: { translation: "Макс" },
  meet: { translation: "встречать" },
  meets: { translation: "встречает" },
  mila: { translation: "Мила" },
  mira: { translation: "Мира" },
  morning: { translation: "утро" },
  my: { translation: "мой" },
  near: { translation: "рядом" },
  need: { translation: "нуждаться" },
  needs: { translation: "нуждается" },
  new: { translation: "новый" },
  next: { translation: "следующий" },
  nikita: { translation: "Никита" },
  no: { translation: "нет" },
  not: { translation: "не" },
  of: { translation: "из" },
  on: { translation: "на" },
  one: { translation: "один" },
  only: { translation: "только" },
  open: { translation: "открывать" },
  opens: { translation: "открывает" },
  or: { translation: "или" },
  other: { translation: "другой" },
  out: { translation: "наружу" },
  own: { translation: "собственный" },
  people: { translation: "люди" },
  play: { translation: "играть" },
  plays: { translation: "играет" },
  put: { translation: "класть" },
  puts: { translation: "кладет" },
  quickly: { translation: "быстро" },
  red: { translation: "красный" },
  right: { translation: "правильный" },
  sara: { translation: "Сара" },
  say: { translation: "говорить" },
  says: { translation: "говорит" },
  see: { translation: "видеть" },
  sees: { translation: "видит" },
  she: { translation: "она" },
  short: { translation: "короткий" },
  simple: { translation: "простой" },
  small: { translation: "маленький" },
  so: { translation: "так" },
  some: { translation: "несколько" },
  start: { translation: "начинать" },
  starts: { translation: "начинает" },
  stay: { translation: "оставаться" },
  stays: { translation: "остается" },
  still: { translation: "все еще" },
  take: { translation: "брать" },
  takes: { translation: "берет" },
  talk: { translation: "говорить" },
  ten: { translation: "десять" },
  than: { translation: "чем" },
  that: { translation: "что, тот" },
  the: { translation: "определенный артикль" },
  their: { translation: "их" },
  them: { translation: "их" },
  then: { translation: "затем" },
  there: { translation: "там" },
  they: { translation: "они", ipa: "/they/" },
  things: { translation: "вещи" },
  three: { translation: "три" },
  through: { translation: "через" },
  time: { translation: "время" },
  to: { translation: "к, чтобы" },
  today: { translation: "сегодня" },
  tom: { translation: "Том" },
  too: { translation: "тоже" },
  took: { translation: "взял" },
  towels: { translation: "полотенца", ipa: "/tow-uhlz/", category: "objects" },
  two: { translation: "два" },
  under: { translation: "под" },
  up: { translation: "вверх" },
  very: { translation: "очень" },
  walk: { translation: "гулять" },
  walks: { translation: "гуляет" },
  want: { translation: "хотеть" },
  wants: { translation: "хочет" },
  was: { translation: "был" },
  water: { translation: "вода" },
  way: { translation: "путь" },
  we: { translation: "мы" },
  were: { translation: "были" },
  what: { translation: "что" },
  when: { translation: "когда" },
  where: { translation: "где" },
  white: { translation: "белый" },
  who: { translation: "кто" },
  why: { translation: "почему" },
  will: { translation: "будет" },
  with: { translation: "с" },
  without: { translation: "без" },
  word: { translation: "слово" },
  words: { translation: "слова" },
  would: { translation: "бы" },
  your: { translation: "твой" },
};

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

export function findVocabularyEntry(query: string) {
  const normalizedQuery = normalizeVocabularyKey(query);
  return vocabularyDatabase.find((entry) => normalizeVocabularyKey(entry.word) === normalizedQuery);
}

export function getVocabularyEntryForText(query: string): VocabularyLookupEntry | null {
  const normalizedQuery = normalizeVocabularyKey(query);
  if (!normalizedQuery) return null;

  const exactEntry = findVocabularyEntry(normalizedQuery);
  if (exactEntry) return exactEntry;

  const manualEntry = manualWordForms[normalizedQuery];
  if (manualEntry) return buildManualEntry(normalizedQuery, manualEntry);

  const derived = deriveKnownWordForm(normalizedQuery);
  if (derived) return derived;

  return null;
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
  return normalizeVocabularyKey(word).replace(/ /g, "-");
}

function normalizeVocabularyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExampleTranslation(translation: string) {
  return `Пример со словом «${translation}».`;
}

function buildManualEntry(word: string, data: { translation: string; ipa?: string; category?: VocabularyCategory }): VocabularyLookupEntry {
  return {
    id: toVocabularyId(word),
    word,
    translation: data.translation,
    ipa: data.ipa ?? ipaForWord(word),
    level: "A1",
    sourceStory: "Story text",
    sourceStories: ["Story text"],
    sourceStoryIds: [],
    example: word,
    exampleRu: data.translation,
    category: data.category ?? "daily life",
  };
}

function deriveKnownWordForm(word: string): VocabularyLookupEntry | null {
  const possessive = word.endsWith("'s") ? word.slice(0, -2) : "";
  if (possessive) {
    const owner = manualWordForms[possessive] ?? findVocabularyEntry(possessive);
    if (owner) return buildManualEntry(word, { translation: `${owner.translation} (принадлежность)`, ipa: ipaForWord(word) });
  }

  const pluralBase = word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.endsWith("es") ? word.slice(0, -2) : word.endsWith("s") ? word.slice(0, -1) : "";
  if (pluralBase) {
    const baseEntry = findVocabularyEntry(pluralBase);
    const manualBase = manualWordForms[pluralBase];
    if (baseEntry) return buildManualEntry(word, { translation: pluralizeRussian(baseEntry.translation), ipa: ipaForWord(word), category: baseEntry.category });
    if (manualBase) return buildManualEntry(word, { translation: pluralizeRussian(manualBase.translation), ipa: ipaForWord(word), category: manualBase.category });
  }

  const verbBase = word.endsWith("ing") ? word.slice(0, -3) : word.endsWith("ed") ? word.slice(0, -2) : "";
  if (verbBase) {
    const baseEntry = findVocabularyEntry(verbBase) ?? findVocabularyEntry(`${verbBase}e`);
    const manualBase = manualWordForms[verbBase] ?? manualWordForms[`${verbBase}e`];
    if (baseEntry) return buildManualEntry(word, { translation: baseEntry.translation, ipa: ipaForWord(word), category: baseEntry.category });
    if (manualBase) return buildManualEntry(word, { translation: manualBase.translation, ipa: ipaForWord(word), category: manualBase.category });
  }

  return null;
}

function pluralizeRussian(translation: string) {
  const knownPlurals: Record<string, string> = {
    полотенце: "полотенца",
    глаз: "глаза",
    книга: "книги",
    друг: "друзья",
    слово: "слова",
    история: "истории",
    комната: "комнаты",
    окно: "окна",
    ключи: "ключи",
  };

  return knownPlurals[translation] ?? translation;
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
