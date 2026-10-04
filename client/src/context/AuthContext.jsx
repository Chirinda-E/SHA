import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await AuthApi.me();
      setUser(data.user);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(body) {
    const data = await AuthApi.login(body);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(body) {
    const data = await AuthApi.register(body);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await AuthApi.logout();
    } catch {
      /* still clear locally */
    }
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, setUser, loading, login, register, logout, refresh }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
