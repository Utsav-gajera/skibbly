import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

const AuthContext = createContext(null);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveAuth = (payload) => {
    setUser(payload?.user || null);
    setAccessToken(payload?.accessToken || null);
  };

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("refresh failed");
      const data = await res.json();
      saveAuth(data);
    } catch (err) {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Login failed");
    saveAuth(data);
  };

  const register = async (name, email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Registration failed");
    saveAuth(data);
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const authFetch = async (input, init = {}) => {
    const headers = { ...(init.headers || {}) };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(input, { ...init, headers, credentials: "include" });
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, loading, login, register, logout, refresh, authFetch }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthGuard = ({ children, publicPaths = [] }) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // While loading, don't redirect (let auth finish)
    if (loading) return;

    // If user is not logged in and page is not public, redirect to login
    if (!user && !publicPaths.includes(router.pathname)) {
      router.replace("/login");
    }
  }, [user, loading, router, publicPaths]);

  // Show nothing while loading OR while user is not authenticated on protected pages
  const isPublic = publicPaths.includes(router.pathname);
  
  if (loading || (!isPublic && !user)) {
    return null;
  }

  return children;
};
