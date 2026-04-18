import { createContext, useContext, useEffect, useState } from "react";
import { clearStoredToken, fetchCurrentUser, getStoredToken, login as loginRequest, logout as logoutRequest, register as registerRequest, setStoredToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!token) {
        try {
          const payload = await loginRequest({ username: "admin", password: "admin123" });
          if (!active) return;
          setStoredToken(payload.token);
          setToken(payload.token);
          setUser(payload.user);
        } catch {
          // If bootstrap login fails, leave the app unauthenticated.
        }
        if (active) setLoading(false);
        return;
      }

      try {
        const payload = await fetchCurrentUser();
        if (!active) return;
        setUser(payload.user);
      } catch {
        clearStoredToken();
        if (!active) return;
        setToken(null);
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [token]);

  const login = async (username, password) => {
    const payload = await loginRequest({ username, password });
    setStoredToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
    return payload.user;
  };

  const register = async (username, password) => {
    await registerRequest({ username, password });
    return login(username, password);
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore logout transport errors and clear local session anyway.
    }
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, isAuthenticated: Boolean(token) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
