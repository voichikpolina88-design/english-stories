import type { LearnerProgress, ReaderPosition, ReadingSession, ReadingSettings, SavedVocabularyWord } from "../types";
import { SAVED_VOCABULARY_STORAGE_KEY } from "./vocabularyStorage";

const PROGRESS_STORAGE_KEY = "english-stories-progress";
const READING_TIMER_STORAGE_KEY = "storylingo-reading-timer";
const READING_SETTINGS_KEY = "storylingo-reading-settings";
const READER_POSITION_KEY = "storylingo-reader-positions";

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: StoryLingoUser;
};

export type StoryLingoUser = {
  id: string;
  email: string;
};

export type AccountAuthResult = {
  session: SupabaseSession;
  snapshot: StoryLingoCloudSnapshot;
};

export type StoredAuthSessionResult =
  | {
      status: "authenticated";
      session: SupabaseSession;
    }
  | {
      status: "signedOut";
    };

export type StoryLingoCloudSnapshot = {
  progress?: Partial<LearnerProgress>;
  vocabulary?: SavedVocabularyWord[];
  readingSettings?: ReadingSettings;
  readerPositions?: Record<string, ReaderPosition>;
  readingSessions?: ReadingSession[];
};

export type LocalAccountSnapshot = {
  progress: Partial<LearnerProgress> | null;
  vocabulary: SavedVocabularyWord[];
  readingSettings: ReadingSettings | null;
  readerPositions: Record<string, ReaderPosition>;
  readingSessions: ReadingSession[];
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
  };
  id?: string;
  email?: string;
  error?: string;
  error_description?: string;
  msg?: string;
  code?: string;
};

const AUTH_STORAGE_KEY = "storylingo-supabase-session";

const supabaseConfig = readSupabaseConfig();

export function isSupabaseConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.publicKey);
}

export function getStoredSession(): SupabaseSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function storeSession(session: SupabaseSession | null) {
  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Auth stays in memory for the current page even if localStorage is blocked.
  }
}

export async function registerWithEmail(email: string, password: string): Promise<AccountAuthResult> {
  const session = await requestAuthSession("/auth/v1/signup", email, password);
  await upsertProfile(session);
  const snapshot = await loadCloudSnapshot(session);
  await migrateLocalDataToAccount(session, snapshot);
  return { session, snapshot: await loadCloudSnapshot(session) };
}

export async function loginWithEmail(email: string, password: string): Promise<AccountAuthResult> {
  const session = await requestAuthSession("/auth/v1/token?grant_type=password", email, password);
  await upsertProfile(session);
  const snapshot = await loadCloudSnapshot(session);
  await migrateLocalDataToAccount(session, snapshot);
  return { session, snapshot: await loadCloudSnapshot(session) };
}

export async function restoreStoredAuthSession(): Promise<StoredAuthSessionResult> {
  const savedSession = getStoredSession();
  if (!savedSession || !isSupabaseConfigured()) return { status: "signedOut" };

  try {
    const session = shouldRefreshSession(savedSession)
      ? await refreshAuthSession(savedSession.refresh_token)
      : savedSession;
    const user = await getCurrentUser(session);
    const nextSession = {
      ...session,
      user,
    };
    storeSession(nextSession);
    return {
      status: "authenticated",
      session: nextSession,
    };
  } catch (error) {
    console.error("[StoryLingo auth] Failed to restore Supabase session", error);
    storeSession(null);
    return { status: "signedOut" };
  }
}

export async function logoutFromSupabase(session: SupabaseSession | null) {
  if (!session || !isSupabaseConfigured()) return;

  await supabaseFetch("/auth/v1/logout", {
    method: "POST",
    token: session.access_token,
  });
}

export async function loadCloudSnapshot(session: SupabaseSession): Promise<StoryLingoCloudSnapshot> {
  if (!isSupabaseConfigured()) return {};

  const [progressRows, dictionaryRows, settingsRows, sessionRows] = await Promise.all([
    supabaseFetch<ReadingProgressRow[]>("/rest/v1/reading_progress?select=*&order=updated_at.asc", { token: session.access_token }),
    supabaseFetch<UserDictionaryRow[]>("/rest/v1/user_dictionary?select=*&order=created_at.asc", { token: session.access_token }),
    supabaseFetch<ReadingSettingsRow[]>("/rest/v1/reading_settings?select=*&limit=1", { token: session.access_token }),
    supabaseFetch<ReadingSessionRow[]>("/rest/v1/reading_sessions?select=*&order=created_at.asc", { token: session.access_token }),
  ]);

  return rowsToSnapshot(progressRows, dictionaryRows, settingsRows[0], sessionRows);
}

export async function migrateLocalDataToAccount(session: SupabaseSession, cloudSnapshot: StoryLingoCloudSnapshot = {}) {
  const local = readLocalAccountSnapshot();
  const merged = mergeAccountSnapshots(local, cloudSnapshot);
  applyAccountSnapshotToLocalStorage(merged);
  await saveSnapshotToCloud(session, merged);
  return merged;
}

export async function saveSnapshotToCloud(session: SupabaseSession, snapshot: StoryLingoCloudSnapshot) {
  if (!isSupabaseConfigured()) return;

  await Promise.all([
    upsertReadingProgress(session, snapshot),
    upsertDictionary(session, snapshot.vocabulary ?? []),
    upsertReadingSettings(session, snapshot.readingSettings),
    upsertReadingSessions(session, snapshot.readingSessions ?? []),
  ]);
}

export function readLocalAccountSnapshot(): LocalAccountSnapshot {
  const vocabularyStorage = readJson<{ words?: SavedVocabularyWord[] } | SavedVocabularyWord[]>(SAVED_VOCABULARY_STORAGE_KEY, []);

  return {
    progress: readJson<Partial<LearnerProgress> | null>(PROGRESS_STORAGE_KEY, null),
    vocabulary: normalizeVocabularyStorage(vocabularyStorage),
    readingSettings: readJson<ReadingSettings | null>(READING_SETTINGS_KEY, null),
    readerPositions: readJson<Record<string, ReaderPosition>>(READER_POSITION_KEY, {}),
    readingSessions: readJson<{ sessions?: ReadingSession[] }>(READING_TIMER_STORAGE_KEY, {})?.sessions ?? [],
  };
}

export function applyAccountSnapshotToLocalStorage(snapshot: StoryLingoCloudSnapshot) {
  writeJson(PROGRESS_STORAGE_KEY, snapshot.progress);
  writeJson(SAVED_VOCABULARY_STORAGE_KEY, { version: 3, words: snapshot.vocabulary ?? [] });
  writeJson(READING_SETTINGS_KEY, snapshot.readingSettings);
  writeJson(READER_POSITION_KEY, snapshot.readerPositions ?? {});
  const timer = readJson<Record<string, unknown>>(READING_TIMER_STORAGE_KEY, {}) ?? {};
  writeJson(READING_TIMER_STORAGE_KEY, {
    ...timer,
    sessions: snapshot.readingSessions ?? [],
  });
  window.dispatchEvent(new CustomEvent("storylingo-account-data-merged"));
  window.dispatchEvent(new CustomEvent("storylingo-saved-vocabulary-change"));
}

export function mergeAccountSnapshots(local: LocalAccountSnapshot, cloud: StoryLingoCloudSnapshot): StoryLingoCloudSnapshot {
  const progress = mergeProgress(local.progress, cloud.progress);
  const vocabulary = mergeVocabulary(local.vocabulary, cloud.vocabulary ?? []);
  const readingSettings = chooseNewestSettings(local.readingSettings, cloud.readingSettings);
  const readerPositions = mergeReaderPositions(local.readerPositions, cloud.readerPositions ?? {});
  const readingSessions = mergeReadingSessions(local.readingSessions, cloud.readingSessions ?? []);

  return {
    progress,
    vocabulary,
    readingSettings,
    readerPositions,
    readingSessions,
  };
}

function readSupabaseConfig() {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    url: env.VITE_SUPABASE_URL || "",
    publicKey: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "",
  };
}

async function requestAuthSession(path: string, email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const response = await supabaseFetch<SupabaseAuthResponse>(path, {
    method: "POST",
    body: {
      email,
      password,
    },
  });
  const session = normalizeAuthResponse(response);
  storeSession(session);
  return session;
}

function normalizeAuthResponse(response: SupabaseAuthResponse): SupabaseSession {
  const user = normalizeAuthUser(response);
  if (user?.id && (!response.access_token || !response.refresh_token)) {
    throw new Error("EMAIL_CONFIRMATION_REQUIRED");
  }
  if (!response.access_token || !response.refresh_token || !user?.id) {
    throw new Error(response.error_description || response.error || response.msg || "AUTH_FAILED");
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_at: response.expires_at ?? (response.expires_in ? Math.floor(Date.now() / 1000) + response.expires_in : undefined),
    user,
  };
}

function normalizeAuthUser(response: SupabaseAuthResponse): StoryLingoUser | null {
  const user = response.user ?? (response.id ? response : undefined);
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

function shouldRefreshSession(session: SupabaseSession) {
  if (!session.expires_at) return false;
  return session.expires_at - Math.floor(Date.now() / 1000) < 60;
}

async function refreshAuthSession(refreshToken: string) {
  const response = await supabaseFetch<SupabaseAuthResponse>("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: {
      refresh_token: refreshToken,
    },
  });
  return normalizeAuthResponse(response);
}

async function getCurrentUser(session: SupabaseSession): Promise<StoryLingoUser> {
  const response = await supabaseFetch<SupabaseAuthResponse>("/auth/v1/user", {
    token: session.access_token,
  });
  const user = normalizeAuthUser(response);
  if (!user) throw new Error("AUTH_SESSION_INVALID");
  return user;
}

function normalizeSession(value: unknown): SupabaseSession | null {
  if (!value || typeof value !== "object") return null;
  const session = value as SupabaseSession;
  if (!session.access_token || !session.refresh_token || !session.user?.id) return null;
  return session;
}

async function upsertProfile(session: SupabaseSession) {
  await supabaseFetch("/rest/v1/profiles", {
    method: "POST",
    token: session.access_token,
    prefer: "resolution=merge-duplicates",
    query: "on_conflict=id",
    body: {
      id: session.user.id,
      email: session.user.email,
      subscription_status: "free",
    },
  });
}

async function upsertReadingProgress(session: SupabaseSession, snapshot: StoryLingoCloudSnapshot) {
  const progress = snapshot.progress;
  if (!progress?.readingProgress) return;

  const readerPositions = snapshot.readerPositions ?? {};
  const rows = Object.entries(progress.readingProgress).map(([bookId, progressPercent]) => {
    const position = readerPositions[bookId];
    return {
      user_id: session.user.id,
      book_id: bookId,
      chapter_id: position?.chapterId ?? progress.lastOpenedContent?.chapterId ?? null,
      current_position: position ?? progress.lastOpenedContent ?? {},
      progress_percent: Math.max(0, Math.min(100, Math.round(progressPercent))),
      completed: Boolean(progress.bookCompletions?.[bookId]?.completed),
      updated_at: new Date().toISOString(),
    };
  });

  if (!rows.length) return;
  await supabaseFetch("/rest/v1/reading_progress", {
    method: "POST",
    token: session.access_token,
    prefer: "resolution=merge-duplicates",
    query: "on_conflict=user_id,book_id",
    body: rows,
  });
}

async function upsertDictionary(session: SupabaseSession, words: SavedVocabularyWord[]) {
  const rows = words.map((word) => {
    const firstContext = word.contexts[0];
    return {
      user_id: session.user.id,
      lexical_entry_id: word.lexicalEntryId,
      word: word.word,
      translation: word.translation,
      contextual_translation: word.contextualTranslation ?? null,
      transcription: word.transcription ?? null,
      part_of_speech: word.partOfSpeech ?? null,
      book_id: firstContext?.bookId ?? null,
      chapter_id: firstContext?.chapterId ?? null,
      contexts: word.contexts,
      progress: word.progress,
      status: word.progress.status,
      created_at: word.createdAt,
    };
  });

  if (!rows.length) return;
  await supabaseFetch("/rest/v1/user_dictionary", {
    method: "POST",
    token: session.access_token,
    prefer: "resolution=merge-duplicates",
    query: "on_conflict=user_id,lexical_entry_id",
    body: rows,
  });
}

async function upsertReadingSettings(session: SupabaseSession, settings?: ReadingSettings | null) {
  if (!settings) return;
  await supabaseFetch("/rest/v1/reading_settings", {
    method: "POST",
    token: session.access_token,
    prefer: "resolution=merge-duplicates",
    query: "on_conflict=user_id",
    body: {
      user_id: session.user.id,
      font: settings.fontFamily,
      font_size: settings.textSize,
      line_height: settings.lineHeight,
      theme: settings.theme,
      text_align: settings.textAlign,
      text_width: settings.textWidth,
      accented_reading: settings.accentedReading,
      updated_at: new Date().toISOString(),
    },
  });
}

async function upsertReadingSessions(session: SupabaseSession, sessions: ReadingSession[]) {
  const rows = sessions.map((item) => ({
    id: item.id,
    user_id: session.user.id,
    book_id: item.contentId,
    chapter_id: item.chapterId ?? null,
    duration_seconds: item.durationSeconds,
    created_at: item.endedAt,
  }));

  if (!rows.length) return;
  await supabaseFetch("/rest/v1/reading_sessions", {
    method: "POST",
    token: session.access_token,
    prefer: "resolution=merge-duplicates",
    body: rows,
  });
}

async function supabaseFetch<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST";
    token?: string;
    prefer?: string;
    query?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  if (!supabaseConfig.url || !supabaseConfig.publicKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const separator = path.includes("?") ? "&" : "?";
  const url = options.query ? `${supabaseConfig.url}${path}${separator}${options.query}` : `${supabaseConfig.url}${path}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      apikey: supabaseConfig.publicKey,
      Authorization: `Bearer ${options.token ?? supabaseConfig.publicKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `SUPABASE_${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

type ReadingProgressRow = {
  book_id: string;
  chapter_id?: string | null;
  current_position?: ReaderPosition | null;
  progress_percent?: number | null;
  completed?: boolean | null;
  updated_at?: string | null;
};

type UserDictionaryRow = {
  lexical_entry_id: string;
  word: string;
  translation: string;
  contextual_translation?: string | null;
  transcription?: string | null;
  part_of_speech?: string | null;
  contexts?: SavedVocabularyWord["contexts"] | null;
  progress?: SavedVocabularyWord["progress"] | null;
  status?: SavedVocabularyWord["progress"]["status"] | null;
  created_at?: string | null;
};

type ReadingSettingsRow = {
  font?: ReadingSettings["fontFamily"] | null;
  font_size?: number | null;
  line_height?: number | null;
  theme?: ReadingSettings["theme"] | null;
  text_align?: ReadingSettings["textAlign"] | null;
  text_width?: number | null;
  accented_reading?: boolean | null;
};

type ReadingSessionRow = {
  id: string;
  book_id: string;
  chapter_id?: string | null;
  duration_seconds: number;
  created_at?: string | null;
};

function rowsToSnapshot(
  progressRows: ReadingProgressRow[],
  dictionaryRows: UserDictionaryRow[],
  settingsRow: ReadingSettingsRow | undefined,
  sessionRows: ReadingSessionRow[],
): StoryLingoCloudSnapshot {
  const readingProgress: Record<string, number> = {};
  const readerPositions: Record<string, ReaderPosition> = {};
  const bookCompletions: LearnerProgress["bookCompletions"] = {};
  const lastOpened = progressRows.at(-1);

  progressRows.forEach((row) => {
    readingProgress[row.book_id] = Math.max(readingProgress[row.book_id] ?? 0, Math.round(row.progress_percent ?? 0));
    if (row.current_position) readerPositions[row.book_id] = row.current_position;
    if (row.completed) {
      bookCompletions[row.book_id] = {
        bookId: row.book_id,
        completed: true,
        completedAt: row.updated_at ?? new Date().toISOString(),
        totalChapterCount: 0,
      };
    }
  });

  return {
    progress: {
      selectedLanguage: "Russian",
      readingProgress,
      bookCompletions,
      lastOpenedContent: lastOpened
        ? {
            contentId: lastOpened.book_id,
            contentType: "book",
            chapterId: lastOpened.chapter_id ?? undefined,
            openedAt: lastOpened.updated_at ?? new Date().toISOString(),
            readingProgress: Math.round(lastOpened.progress_percent ?? 0),
            scrollPosition: 0,
            lastPosition: 0,
          }
        : null,
      lastVisitDate: new Date().toISOString().slice(0, 10),
    },
    vocabulary: dictionaryRows.map(dictionaryRowToSavedWord),
    readingSettings: settingsRow ? readingSettingsRowToSettings(settingsRow) : undefined,
    readerPositions,
    readingSessions: sessionRows.map((row) => ({
      id: row.id,
      contentType: "book",
      contentId: row.book_id,
      chapterId: row.chapter_id ?? undefined,
      startedAt: row.created_at ?? new Date().toISOString(),
      endedAt: row.created_at ?? new Date().toISOString(),
      durationSeconds: row.duration_seconds,
      dateKey: (row.created_at ?? new Date().toISOString()).slice(0, 10),
      completed: true,
    })),
  };
}

function dictionaryRowToSavedWord(row: UserDictionaryRow): SavedVocabularyWord {
  return {
    id: row.lexical_entry_id,
    lexicalEntryId: row.lexical_entry_id,
    word: row.word,
    lemma: row.word,
    translation: row.translation,
    contextualTranslation: row.contextual_translation ?? undefined,
    transcription: row.transcription ?? undefined,
    partOfSpeech: row.part_of_speech ?? undefined,
    contexts: row.contexts ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
    progress: row.progress ?? {
      correctCount: 0,
      incorrectCount: 0,
      sessionsCorrect: 0,
      status: row.status ?? "new",
      unresolvedIncorrectCount: 0,
    },
  };
}

function readingSettingsRowToSettings(row: ReadingSettingsRow): ReadingSettings {
  return {
    fontFamily: row.font ?? "Literata",
    textSize: row.font_size ?? 20,
    lineHeight: row.line_height ?? 1.55,
    theme: row.theme ?? "cream",
    textAlign: row.text_align ?? "left",
    textWidth: row.text_width ?? 720,
    accentedReading: Boolean(row.accented_reading),
    showWordTranslation: false,
  };
}

function normalizeVocabularyStorage(value: { words?: SavedVocabularyWord[] } | SavedVocabularyWord[] | null): SavedVocabularyWord[] {
  if (Array.isArray(value)) return value;
  return value?.words ?? [];
}

function mergeProgress(local: Partial<LearnerProgress> | null, cloud?: Partial<LearnerProgress>): Partial<LearnerProgress> {
  const readingProgress = { ...(cloud?.readingProgress ?? {}) };
  Object.entries(local?.readingProgress ?? {}).forEach(([bookId, value]) => {
    readingProgress[bookId] = Math.max(readingProgress[bookId] ?? 0, value);
  });

  return {
    ...cloud,
    ...local,
    readingProgress,
    chapterCompletions: {
      ...(cloud?.chapterCompletions ?? {}),
      ...(local?.chapterCompletions ?? {}),
    },
    bookCompletions: {
      ...(cloud?.bookCompletions ?? {}),
      ...(local?.bookCompletions ?? {}),
    },
    lastOpenedContent: chooseLatestLastOpened(local?.lastOpenedContent, cloud?.lastOpenedContent),
    lastVisitDate: new Date().toISOString().slice(0, 10),
  };
}

function mergeVocabulary(local: SavedVocabularyWord[], cloud: SavedVocabularyWord[]) {
  const byId = new Map<string, SavedVocabularyWord>();
  [...cloud, ...local].forEach((word) => {
    const existing = byId.get(word.lexicalEntryId);
    if (!existing) {
      byId.set(word.lexicalEntryId, word);
      return;
    }

    byId.set(word.lexicalEntryId, {
      ...existing,
      ...word,
      contexts: [...existing.contexts, ...word.contexts.filter((context) => (
        !existing.contexts.some((existingContext) => existingContext.bookId === context.bookId && existingContext.sentenceId === context.sentenceId)
      ))],
      progress: {
        ...existing.progress,
        ...word.progress,
        correctCount: Math.max(existing.progress.correctCount, word.progress.correctCount),
        incorrectCount: Math.max(existing.progress.incorrectCount, word.progress.incorrectCount),
        sessionsCorrect: Math.max(existing.progress.sessionsCorrect, word.progress.sessionsCorrect),
      },
    });
  });
  return Array.from(byId.values());
}

function chooseNewestSettings(local: ReadingSettings | null, cloud?: ReadingSettings) {
  return local ?? cloud;
}

function mergeReaderPositions(local: Record<string, ReaderPosition>, cloud: Record<string, ReaderPosition>) {
  const result = { ...cloud };
  Object.entries(local).forEach(([bookId, position]) => {
    const cloudPosition = result[bookId];
    if (!cloudPosition || position.progressRatio >= cloudPosition.progressRatio) {
      result[bookId] = position;
    }
  });
  return result;
}

function mergeReadingSessions(local: ReadingSession[], cloud: ReadingSession[]) {
  const byId = new Map<string, ReadingSession>();
  [...cloud, ...local].forEach((session) => byId.set(session.id, session));
  return Array.from(byId.values()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function chooseLatestLastOpened(local?: LearnerProgress["lastOpenedContent"], cloud?: LearnerProgress["lastOpenedContent"]) {
  if (!local) return cloud ?? null;
  if (!cloud) return local;
  return local.openedAt >= cloud.openedAt ? local : cloud;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === undefined || value === null) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local mode continues if storage is unavailable.
  }
}
