"use client";

import { useAuth } from "@/lib/auth-context";
import AppHeader from "./AppHeader";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // If loading, you might want to show a spinner or nothing
  // But since page.tsx also handles loading, we can just pass children if logic requires
  // logic: If user is authenticated, we show the AppHeader.
  // Exception: Login and Register pages should NOT show the AppHeader even if there is a stale user?
  // Usually if on /login and user is present, they get redirected to / (handled in page.tsx).
  
  const isPublicPage = pathname === "/login" || pathname === "/register";

  if (isLoading) {
      // Return bare children or loading state. 
      // Using children allows page components to handle their own loading skeleton if they want, 
      // OR we can blockade here. 
      // Let's blockade here for a cleaner "app" feel, but login page needs to load.
      return <>{children}</>;
  }

  if (!user || isPublicPage) {
    // Render children without the authenticated layout wrapper
    return <>{children}</>;
  }

  // Authenticated Layout
  return (
    <div className="h-dvh bg-[#FDF2EC] flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <div className="shrink-0 z-50 relative bg-[#FDF2EC]">
          <AppHeader userName={user.name} />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar relative w-full">
          {children}
      </div>
    </div>
  );
}
