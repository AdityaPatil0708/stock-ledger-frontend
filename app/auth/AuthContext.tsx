"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, ApiError, getToken, setToken, type AuthUser, type Role } from "../lib/api";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: Role) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // One-shot check of a stored token (external, browser-only) on mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed.");
      throw e;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: Role) => {
    setError(null);
    try {
      const res = await authApi.signup({ email, password, name, role });
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Signup failed.");
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, signup, logout }), [user, loading, error, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
