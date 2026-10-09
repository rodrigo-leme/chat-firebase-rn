import React, { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { login as loginService, logout as logoutService, observeSession, register as registerService } from '../services/authService';
import { disableDevice } from '../services/notificationService';
import type { RegisterInput } from '../types/user';

export type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ photoFailed: boolean }>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Recupera a sessão persistida e acompanha mudanças.
  useEffect(() => {
    const unsubscribe = observeSession((next) => {
      setUser(next);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback((email: string, password: string) => loginService(email, password), []);
  const register = useCallback((input: RegisterInput) => registerService(input), []);

  const logout = useCallback(async () => {
    if (user) await disableDevice(user.uid);
    await logoutService();
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
