"use client";

import { useAuth } from "@/lib/auth-context";
import AppHeader from "./AppHeader";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProducts } from "@/app/actions/memories";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const charmId = searchParams.get('charmId');
  
  const [contextTitle, setContextTitle] = useState<string | undefined>(undefined);
  const [backHref, setBackHref] = useState<string | undefined>(undefined);

  // Define logic for contextual header
  useEffect(() => {
      if (!charmId) {
          setContextTitle(undefined);
          setBackHref(undefined);
          return;
      }

      // If we have a charmId, we want to show its name in the header
      getUserProducts().then(products => {
          const product = products.find(p => p.id === charmId);
          if (product) {
              setContextTitle(product.name);
              // Only show back button if we are NOT on the main dashboard
              if (pathname !== '/') {
                  setBackHref('/');
              } else {
                  setBackHref(undefined);
              }
          }
      });
  }, [charmId, pathname]);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isLoading) {
      return (
        <div className="h-dvh bg-[#FDF2EC] flex flex-col w-full md:max-w-7xl mx-auto relative shadow-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar relative w-full">
            {children}
          </div>
        </div>
      );
  }

  if (!user || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-dvh bg-[#FDF2EC] flex flex-col w-full md:max-w-7xl mx-auto relative shadow-2xl overflow-hidden isolate">
      {/* Global Background Decorations - High visibility */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FDF2EC]">
          <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-[#A4C538]/45 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#5B2D7D]/35 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }}></div>
          {/* Subtle center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#EADDDE]/30 rounded-full blur-[150px]"></div>
      </div>

      <div className="shrink-0 z-50 relative bg-transparent">
          <AppHeader 
            userName={user?.name || "User"} 
            userRole={user?.role} 
            contextTitle={contextTitle}
            backHref={backHref}
          />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar relative w-full z-10 bg-transparent">
          {children}
      </div>
    </div>
  );
}
