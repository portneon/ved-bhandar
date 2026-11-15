import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { getAuthToken, setAuthToken } from "../api/client";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await authApi.login({ email, password });
    setAuthToken(result.token);
    setUser(result.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    const result = await authApi.register({ name, email, password });
    setAuthToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback((): void => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
