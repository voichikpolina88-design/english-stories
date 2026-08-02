import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyAccountSnapshotToLocalStorage,
  isSupabaseConfigured,
  loadCloudSnapshot,
  loginWithEmail,
  logoutFromSupabase,
  migrateLocalDataToAccount,
  registerWithEmail,
  restoreStoredAuthSession,
  storeSession,
  type StoryLingoCloudSnapshot,
  type StoryLingoUser,
  type SupabaseSession,
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
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [cloudSnapshot, setCloudSnapshot] = useState<StoryLingoCloudSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    restoreStoredAuthSession()
      .then((result) => {
        if (cancelled) return;
        if (result.status === "authenticated") {
          setSession(result.session);
        }
      })
      .catch((restoreError) => {
        console.error("[StoryLingo auth] Failed to check current user", restoreError);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      .catch((loadError) => {
        console.error("[StoryLingo auth] Failed to load account data", loadError);
        if (!cancelled) setError("Сервис временно недоступен.");
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
      console.error("[StoryLingo auth] Authorization failed", authError);
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
    } catch (logoutError) {
      console.error("[StoryLingo auth] Logout request failed", logoutError);
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
    } catch (syncError) {
      console.error("[StoryLingo auth] Failed to sync account data", syncError);
      setError("Сервис временно недоступен.");
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
    console.error("[StoryLingo auth] Supabase environment variables are not configured");
    return "Сервис временно недоступен.";
  }
  if (message === "EMAIL_CONFIRMATION_REQUIRED") {
    return "Аккаунт создан. Проверьте email и подтвердите регистрацию.";
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

  return "Сервис временно недоступен.";
}
