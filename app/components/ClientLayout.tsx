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
    <div className="min-h-screen bg-[#FDF2EC] flex flex-col max-w-md mx-auto relative shadow-2xl">
      <AppHeader userName={user.name} />
      {/* 
        We use flex-1 to make sure the content takes available space.
        Note: Children pages should standardly not include their own min-h-screen if they want to flow within this.
        However, if they do, it might just stack. 
        Current pages have min-h-screen already. We might need to adjust them to avoid double scrollbars or huge heights. 
        Actually, the child pages like Home have `min-h-screen`. 
        If we wrap them in another div, and they are `min-h-screen`, it's fine.
      */}
      {children}
    </div>
  );
}
