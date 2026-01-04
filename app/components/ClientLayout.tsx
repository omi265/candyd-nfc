"use client";

import { useAuth } from "@/lib/auth-context";
import AppHeader from "./AppHeader";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
  isGuest,
}: {
  children: React.ReactNode;
  isGuest?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // If loading, you might want to show a spinner or nothing
  // But since page.tsx also handles loading, we can just pass children if logic requires
  // logic: If user is authenticated, we show the AppHeader.
  // Exception: Login and Register pages should NOT show the AppHeader even if there is a stale user?
  // Usually if on /login and user is present, they get redirected to / (handled in page.tsx).
  
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isLoading) {
      // Render with full-height container to prevent layout shift
      return (
        <div className="h-dvh bg-[#FDF2EC] flex flex-col w-full md:max-w-7xl mx-auto relative shadow-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar relative w-full">
            {children}
          </div>
        </div>
      );
  }

  if ((!user && !isGuest) || isAuthPage) {
    // Render children without the authenticated layout wrapper
    return <>{children}</>;
  }

  // Authenticated Layout (User or Guest)
  return (
    <div className="h-dvh bg-[#FDF2EC] flex flex-col w-full md:max-w-7xl mx-auto relative shadow-2xl overflow-hidden">
      {!isGuest && (
        <div className="shrink-0 z-50 relative bg-[#FDF2EC]">
            <AppHeader userName={user?.name || "User"} userRole={user?.role} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto no-scrollbar relative w-full">
          {children}
      </div>
    </div>
  );
}
