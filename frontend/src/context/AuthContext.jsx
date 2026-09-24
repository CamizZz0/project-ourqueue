import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

function safeParseUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(safeParseUser);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Validasi token ke backend saat aplikasi pertama kali dibuka.
  // Sekaligus sinkronisasi role/is_active terbaru (misal kalau baru saja dinonaktifkan superadmin).
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        const freshUser = res.data.user;
        localStorage.setItem("user", JSON.stringify(freshUser));
        setUser(freshUser);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const login = useCallback(async (email, password, rememberMe = false) => {
    const res = await api.post("/auth/login", { email, password, remember_me: rememberMe });
    const { token, user: loggedInUser } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (nama, email, password) => {
    const res = await api.post("/auth/register", { nama, email, password });
    const { token, user: newUser } = res.data;
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
    }
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const role = user?.role;
  const isAdmin = role === "admin";
  const isSuperadmin = role === "superadmin";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isSuperadmin,
        is_active: user?.is_active,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        checkingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}