import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReadingGoal, ReadingSession, ReadingStats, ReadingTimerState } from "../types";

type ActiveReadingContent = {
  contentType: "book" | "story";
  contentId: string;
  chapterId?: string | null;
};

type PauseReason = "manual" | "hidden" | "idle" | "leftReader" | null;

type ReadingTimerStorage = {
  goal: ReadingGoal;
  sessions: ReadingSession[];
  timer: ReadingTimerState;
  pauseReason: PauseReason;
  lastActivityAt: number;
  bestReadingStreak: number;
  lastContentId: string | null;
};

const STORAGE_KEY = "storylingo-reading-timer";
const DEFAULT_GOAL_MINUTES = 5;
const AUTOSAVE_MS = 15000;
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const MIN_SESSION_SECONDS = 10;
const MERGE_WINDOW_MS = 5 * 60 * 1000;

const emptyTimer: ReadingTimerState = {
  isRunning: false,
  startedAt: null,
  accumulatedSeconds: 0,
  contentId: null,
  chapterId: null,
};

const defaultStorage = (): ReadingTimerStorage => ({
  goal: {
    dailyGoalMinutes: DEFAULT_GOAL_MINUTES,
    updatedAt: new Date().toISOString(),
  },
  sessions: [],
  timer: emptyTimer,
  pauseReason: null,
  lastActivityAt: Date.now(),
  bestReadingStreak: 0,
  lastContentId: null,
});

export function useReadingTimer(activeContent: ActiveReadingContent | null) {
  const [storage, setStorage] = useState<ReadingTimerStorage>(() => readStorage());
  const [now, setNow] = useState(() => Date.now());
  const activeContentRef = useRef<ActiveReadingContent | null>(activeContent);
  const storageRef = useRef(storage);
  const lastRecordedActivityRef = useRef(0);

  useEffect(() => {
    storageRef.current = storage;
    writeStorage(storage);
  }, [storage]);

  useEffect(() => {
    activeContentRef.current = activeContent;
  }, [activeContent]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const pauseTimer = useCallback((reason: PauseReason = "manual") => {
    setStorage((current) => pauseStorageTimer(current, reason));
  }, []);

  const resumeTimer = useCallback(() => {
    const active = activeContentRef.current;
    if (!active || document.visibilityState === "hidden") return;
    setStorage((current) => resumeStorageTimer(current, active));
  }, []);

  const finishSession = useCallback((reason: PauseReason = "leftReader") => {
    setStorage((current) => finishStorageSession(current, reason));
  }, []);

  const recordActivity = useCallback(() => {
    const active = activeContentRef.current;
    const timestamp = Date.now();
    const shouldResumeFromIdle = storageRef.current.pauseReason === "idle";
    if (!shouldResumeFromIdle && timestamp - lastRecordedActivityRef.current < 1000) return;
    lastRecordedActivityRef.current = timestamp;

    setStorage((current) => {
      const next = {
        ...current,
        lastActivityAt: timestamp,
      };

      if (active && current.pauseReason === "idle" && document.visibilityState !== "hidden") {
        return resumeStorageTimer(next, active);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (!activeContent) {
      setStorage((current) => finishStorageSession(current, "leftReader"));
      return;
    }

    setStorage((current) => {
      const timer = current.timer;
      const isSameContent = timer.contentId === activeContent.contentId;
      const isSameChapter = (timer.chapterId ?? null) === (activeContent.chapterId ?? null);

      if (timer.contentId && !isSameContent) {
        const finished = finishStorageSession(current, "leftReader");
        return resumeStorageTimer(
          {
            ...finished,
            pauseReason: null,
            lastActivityAt: Date.now(),
            lastContentId: activeContent.contentId,
          },
          activeContent,
        );
      }

      if (isSameContent && !isSameChapter) {
        return {
          ...current,
          timer: {
            ...timer,
            chapterId: activeContent.chapterId ?? null,
          },
          lastContentId: activeContent.contentId,
        };
      }

      if (timer.contentId === activeContent.contentId && current.pauseReason === "manual") {
        return {
          ...current,
          lastContentId: activeContent.contentId,
        };
      }

      return resumeStorageTimer(
        {
          ...current,
          lastContentId: activeContent.contentId,
          lastActivityAt: Date.now(),
        },
        activeContent,
      );
    });
  }, [activeContent?.contentId, activeContent?.chapterId, activeContent?.contentType]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setStorage((current) => pauseStorageTimer(current, "hidden"));
        return;
      }

      const active = activeContentRef.current;
      if (active && storageRef.current.pauseReason === "hidden") {
        setStorage((current) => resumeStorageTimer(current, active));
      }
    };

    const handleBeforeUnload = () => {
      const paused = pauseStorageTimer(storageRef.current, "hidden");
      writeStorage(paused);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStorage((current) => {
        if (!current.timer.isRunning) return current;
        if (Date.now() - current.lastActivityAt > IDLE_TIMEOUT_MS) {
          return pauseStorageTimer(current, "idle");
        }
        return current;
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      writeStorage(storageRef.current);
    }, AUTOSAVE_MS);

    return () => window.clearInterval(interval);
  }, []);

  const setDailyGoal = useCallback((minutes: number) => {
    const normalized = Math.min(240, Math.max(1, Math.round(minutes)));
    setStorage((current) => ({
      ...current,
      goal: {
        dailyGoalMinutes: normalized,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const currentSessionSeconds = getTimerSeconds(storage.timer, now);
  const stats = useMemo(() => getReadingStats(storage.sessions, storage.goal, storage.bestReadingStreak, storage.timer, now), [storage, now]);

  useEffect(() => {
    if (stats.bestReadingStreak > storage.bestReadingStreak) {
      setStorage((current) => ({
        ...current,
        bestReadingStreak: stats.bestReadingStreak,
      }));
    }
  }, [stats.bestReadingStreak, storage.bestReadingStreak]);

  return {
    goal: storage.goal,
    sessions: storage.sessions,
    timer: storage.timer,
    pauseReason: storage.pauseReason,
    stats,
    currentSessionSeconds,
    lastContentId: storage.lastContentId,
    isGoalCompleteToday: stats.todaySeconds >= storage.goal.dailyGoalMinutes * 60,
    setDailyGoal,
    pauseTimer: () => pauseTimer("manual"),
    resumeTimer,
    finishSession: () => finishSession("leftReader"),
    recordActivity,
  };
}

function pauseStorageTimer(storage: ReadingTimerStorage, reason: PauseReason): ReadingTimerStorage {
  if (!storage.timer.isRunning || storage.timer.startedAt === null) {
    return {
      ...storage,
      pauseReason: reason,
      timer: {
        ...storage.timer,
        isRunning: false,
        startedAt: null,
      },
    };
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - storage.timer.startedAt) / 1000));

  return {
    ...storage,
    pauseReason: reason,
    timer: {
      ...storage.timer,
      isRunning: false,
      startedAt: null,
      accumulatedSeconds: storage.timer.accumulatedSeconds + elapsedSeconds,
    },
  };
}

function resumeStorageTimer(storage: ReadingTimerStorage, content: ActiveReadingContent): ReadingTimerStorage {
  if (storage.timer.isRunning && storage.timer.contentId === content.contentId) {
    return {
      ...storage,
      timer: {
        ...storage.timer,
        chapterId: content.chapterId ?? null,
      },
      pauseReason: null,
      lastContentId: content.contentId,
    };
  }

  return {
    ...storage,
    pauseReason: null,
    lastActivityAt: Date.now(),
    lastContentId: content.contentId,
    timer: {
      isRunning: true,
      startedAt: Date.now(),
      accumulatedSeconds: storage.timer.contentId === content.contentId ? storage.timer.accumulatedSeconds : 0,
      contentId: content.contentId,
      chapterId: content.chapterId ?? null,
    },
  };
}

function finishStorageSession(storage: ReadingTimerStorage, reason: PauseReason): ReadingTimerStorage {
  if (!storage.timer.contentId) {
    return {
      ...storage,
      pauseReason: reason,
      timer: emptyTimer,
    };
  }

  const paused = pauseStorageTimer(storage, reason);
  const durationSeconds = paused.timer.accumulatedSeconds;
  const endedAt = new Date().toISOString();

  if (durationSeconds < MIN_SESSION_SECONDS) {
    return {
      ...paused,
      timer: emptyTimer,
    };
  }

  const startedAt = new Date(Date.now() - durationSeconds * 1000).toISOString();
  const contentId = paused.timer.contentId;
  if (!contentId) {
    return {
      ...paused,
      timer: emptyTimer,
    };
  }

  const nextSession: ReadingSession = {
    id: `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    contentType: getContentTypeFromId(contentId),
    contentId,
    chapterId: paused.timer.chapterId ?? undefined,
    startedAt,
    endedAt,
    durationSeconds,
    dateKey: getDateKey(new Date(startedAt)),
    completed: true,
  };

  const sessions = mergeSession(paused.sessions, nextSession);

  return {
    ...paused,
    sessions,
    timer: emptyTimer,
  };
}

function mergeSession(sessions: ReadingSession[], nextSession: ReadingSession) {
  const previous = sessions.at(-1);
  if (!previous) return [...sessions, nextSession];

  const sameContent =
    previous.contentId === nextSession.contentId &&
    (previous.chapterId ?? null) === (nextSession.chapterId ?? null) &&
    previous.dateKey === nextSession.dateKey;
  const closeEnough = new Date(nextSession.startedAt).getTime() - new Date(previous.endedAt).getTime() <= MERGE_WINDOW_MS;

  if (!sameContent || !closeEnough) return [...sessions, nextSession];

  return [
    ...sessions.slice(0, -1),
    {
      ...previous,
      endedAt: nextSession.endedAt,
      durationSeconds: previous.durationSeconds + nextSession.durationSeconds,
    },
  ];
}

function getReadingStats(
  sessions: ReadingSession[],
  goal: ReadingGoal,
  savedBestStreak: number,
  timer: ReadingTimerState,
  now: number,
): ReadingStats {
  const today = getDateKey(new Date(now));
  const todaySecondsFromSessions = getSecondsForDate(sessions, today);
  const currentSeconds = timer.contentId && getDateKey(new Date(now)) === today ? getTimerSeconds(timer, now) : 0;
  const todaySeconds = todaySecondsFromSessions + currentSeconds;
  const last7DaysSeconds = getSecondsForRange(sessions, 7, now) + currentSeconds;
  const last30DaysSeconds = getSecondsForRange(sessions, 30, now) + currentSeconds;
  const totalSeconds = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const completedGoalDays = getGoalCompletedDays(sessions, goal).size;
  const currentReadingStreak = getCurrentReadingStreak(sessions, goal, now);
  const bestReadingStreak = Math.max(savedBestStreak, getBestReadingStreak(sessions, goal), currentReadingStreak);

  return {
    todaySeconds,
    last7DaysSeconds,
    last30DaysSeconds,
    sessionCount: sessions.length,
    averageSessionSeconds: sessions.length ? Math.round(totalSeconds / sessions.length) : 0,
    completedGoalDays,
    currentReadingStreak,
    bestReadingStreak,
  };
}

function getSecondsForDate(sessions: ReadingSession[], dateKey: string) {
  return sessions
    .filter((session) => session.dateKey === dateKey)
    .reduce((sum, session) => sum + session.durationSeconds, 0);
}

function getSecondsForRange(sessions: ReadingSession[], days: number, now: number) {
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  const startKey = getDateKey(start);
  return sessions
    .filter((session) => session.dateKey >= startKey)
    .reduce((sum, session) => sum + session.durationSeconds, 0);
}

function getGoalCompletedDays(sessions: ReadingSession[], goal: ReadingGoal) {
  const secondsByDay = new Map<string, number>();
  sessions.forEach((session) => {
    secondsByDay.set(session.dateKey, (secondsByDay.get(session.dateKey) ?? 0) + session.durationSeconds);
  });

  return new Set([...secondsByDay.entries()].filter(([, seconds]) => seconds >= goal.dailyGoalMinutes * 60).map(([dateKey]) => dateKey));
}

function getCurrentReadingStreak(sessions: ReadingSession[], goal: ReadingGoal, now: number) {
  const completedDays = getGoalCompletedDays(sessions, goal);
  const cursor = new Date(now);
  const todayKey = getDateKey(cursor);
  if (!completedDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedDays.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getBestReadingStreak(sessions: ReadingSession[], goal: ReadingGoal) {
  const completedDays = [...getGoalCompletedDays(sessions, goal)].sort();
  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  completedDays.forEach((dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (previous && daysBetween(previous, date) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = date;
  });

  return best;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function getTimerSeconds(timer: ReadingTimerState, now: number) {
  if (!timer.contentId) return 0;
  if (!timer.isRunning || timer.startedAt === null) return timer.accumulatedSeconds;
  return timer.accumulatedSeconds + Math.max(0, Math.floor((now - timer.startedAt) / 1000));
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getContentTypeFromId(contentId: string): "book" | "story" {
  const storyIds = new Set([
    "seen-217",
    "gift-of-magi",
    "last-leaf",
    "open-door",
    "wrong-message",
    "last-train",
    "coffee-shop-girl",
    "happy-prince",
    "tell-tale-heart",
  ]);

  return storyIds.has(contentId) ? "story" : "book";
}

function readStorage(): ReadingTimerStorage {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultStorage();
    const parsed = JSON.parse(saved) as Partial<ReadingTimerStorage>;
    const defaults = defaultStorage();
    return {
      ...defaults,
      ...parsed,
      goal: {
        ...defaults.goal,
        ...(parsed.goal ?? {}),
      },
      sessions: parsed.sessions ?? [],
      timer: {
        ...defaults.timer,
        ...(parsed.timer ?? {}),
        isRunning: false,
        startedAt: null,
      },
    };
  } catch {
    return defaultStorage();
  }
}

function writeStorage(storage: ReadingTimerStorage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // The app should remain usable if storage is unavailable.
  }
}
