import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyAccountSnapshotToLocalStorage,
  getStoredSession,
  isSupabaseConfigured,
  loadCloudSnapshot,
  loginWithEmail,
  logoutFromSupabase,
  migrateLocalDataToAccount,
  registerWithEmail,
  storeSession,
  type StoryLingoCloudSnapshot,
  type StoryLingoUser,
} from "./accountSync";

type AuthMode = "login" | "register";

type AuthContextValue = {
  user: StoryLingoUser | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  cloudSnapshot: StoryLingoCloudSnapshot | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncLocalData: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => getStoredSession());
  const [cloudSnapshot, setCloudSnapshot] = useState<StoryLingoCloudSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !isSupabaseConfigured()) return;
    let cancelled = false;

    setIsLoading(true);
    loadCloudSnapshot(session)
      .then((snapshot) => migrateLocalDataToAccount(session, snapshot))
      .then((snapshot) => {
        if (cancelled) return;
        applyAccountSnapshotToLocalStorage(snapshot);
        setCloudSnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить данные аккаунта. Локальные данные остались на месте.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  async function authorize(mode: AuthMode, email: string, password: string) {
    setError(null);
    setIsLoading(true);
    try {
      const result = mode === "register"
        ? await registerWithEmail(email, password)
        : await loginWithEmail(email, password);
      const merged = await migrateLocalDataToAccount(result.session, result.snapshot);
      applyAccountSnapshotToLocalStorage(merged);
      setSession(result.session);
      setCloudSnapshot(merged);
    } catch (authError) {
      setError(getReadableAuthError(authError));
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setError(null);
    setIsLoading(true);
    try {
      await logoutFromSupabase(session);
    } catch {
      // Local logout should still work if the network is unavailable.
    } finally {
      storeSession(null);
      setSession(null);
      setCloudSnapshot(null);
      setIsLoading(false);
    }
  }

  async function syncLocalData() {
    if (!session || !isSupabaseConfigured()) return;
    try {
      const snapshot = await migrateLocalDataToAccount(session, cloudSnapshot ?? {});
      setCloudSnapshot(snapshot);
    } catch {
      setError("Не удалось синхронизировать данные. Они сохранены локально и будут доступны на этом устройстве.");
    }
  }

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
    isConfigured: isSupabaseConfigured(),
    isLoading,
    error,
    cloudSnapshot,
    login: (email, password) => authorize("login", email, password),
    register: (email, password) => authorize("register", email, password),
    logout,
    syncLocalData,
    clearError: () => setError(null),
  }), [session, isLoading, error, cloudSnapshot]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

function getReadableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (message === "SUPABASE_NOT_CONFIGURED") {
    return "Supabase ещё не настроен. Добавьте SUPABASE_URL и SUPABASE_ANON_KEY в окружение.";
  }
  if (normalized.includes("already") || normalized.includes("registered")) {
    return "Этот email уже используется. Попробуйте войти.";
  }
  if (normalized.includes("password") && normalized.includes("weak")) {
    return "Пароль слишком слабый. Используйте минимум 6 символов.";
  }
  if (normalized.includes("invalid") && normalized.includes("email")) {
    return "Проверьте формат email.";
  }
  if (normalized.includes("invalid login") || normalized.includes("credentials")) {
    return "Неверный email или пароль.";
  }

  return "Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз.";
}
