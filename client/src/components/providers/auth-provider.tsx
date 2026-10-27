"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, isApiError, type LoginInput, type RegisterInput } from "@/lib/api";
import type { User } from "@/lib/types";

export interface AuthContextValue {
  /** null when logged out (or while the first check is running) */
  user: User | null;
  /** true until the initial GET /api/auth/me has settled */
  loading: boolean;
  /** POST /api/auth/login — throws ApiError (401 bad credentials, 429, 400 validation) */
  login: (input: LoginInput) => Promise<User>;
  /** POST /api/auth/register — throws ApiError (409 email exists, 400 validation) */
  register: (input: RegisterInput) => Promise<User>;
  /** POST /api/auth/logout — always clears the local user, even if the request fails */
  logout: () => Promise<void>;
  /** re-check the session (GET /api/auth/me); resolves to the current user or null */
  refresh: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await api.auth.me();
      setUser(me);
      return me;
    } catch (e) {
      // 401 = logged out. Network errors: treat as logged out for now; pages show their own API errors.
      if (!isApiError(e) || e.status !== 401) console.warn("[auth] session check failed", e);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.auth.me().then(
      ({ user: me }) => {
        if (cancelled) return;
        setUser(me);
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        if (!isApiError(e) || e.status !== 401) console.warn("[auth] session check failed", e);
        setUser(null);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user: me } = await api.auth.login({ email: input.email.trim(), password: input.password });
    setUser(me);
    setLoading(false);
    return me;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user: me } = await api.auth.register({
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
    });
    setUser(me);
    setLoading(false);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn("[auth] logout request failed", e);
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
