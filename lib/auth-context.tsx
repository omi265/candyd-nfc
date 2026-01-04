"use client";

import { createContext, useContext, ReactNode } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";

interface User {
  id?: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<boolean>; // Deprecated: used server actions
  register: () => Promise<boolean>; // Deprecated: used server actions
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  
  const isLoading = status === "loading";
  
  // Map session user to our interface
  const user = session?.user ? {
      name: session.user.name || "",
      email: session.user.email || "",
      image: session.user.image,
      id: session.user.id,
      role: session.user.role
  } : null;

  const login = async (): Promise<boolean> => {
    console.warn("Login should be handled by server actions");
    return false;
  };

  const register = async (): Promise<boolean> => {
     console.warn("Register should be handled by server actions");
     return false;
  };

  const logout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextInner>{children}</AuthContextInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

