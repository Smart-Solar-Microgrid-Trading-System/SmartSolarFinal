import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";

const AuthContext = createContext(null);
const storageKey = "smart-solar-microgrid-session";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  });
  const [profile, setProfile] = useState(null);

  const signOut = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSession(null);
    setProfile(null);
  }, []);

  const signIn = useCallback(async (identifier, password) => {
    const response = await api.login(identifier, password);
    const nextSession = { token: response.token, role: response.role, name: response.name };
    localStorage.setItem(storageKey, JSON.stringify(nextSession));
    setSession(nextSession);
    return nextSession;
  }, []);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    api.getMe(session.token).then(setProfile).catch(signOut);
  }, [session?.token, signOut]);

  const value = useMemo(() => ({ session, profile, signIn, signOut }), [profile, session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
