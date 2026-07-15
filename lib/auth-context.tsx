"use client";

import { createContext, useContext, ReactNode } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import type { Session } from "next-auth";

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
  updateSession: (data: any) => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextInner({ children, serverSession }: { children: ReactNode, serverSession?: Session | null }) {
  const { data: clientSession, status, update } = useSession();
  
  const session = serverSession || clientSession;
  const isLoading = status === "loading" && !serverSession;
  
  // Map session user to our interface
  const user = session?.user ? {
      name: session.user.name || "",
      email: session.user.email || "",
      image: session.user.image,
      id: session.user.id,
      role: (session.user as any).role,
      contact: (session.user as any).contact
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
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateSession: update }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children, session }: { children: ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      <AuthContextInner serverSession={session}>{children}</AuthContextInner>
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

