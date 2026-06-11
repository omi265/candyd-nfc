"use client";

import { useAuth } from "@/lib/auth-context";
import AppHeader from "./AppHeader";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getProductHeader } from "@/app/actions/life-charm";
import SplashScreen from "./SplashScreen";
import { RitualTimerProvider } from "@/lib/ritual-timer-context";
import FullOnboardingTour from "./FullOnboardingTour";

function GlobalLayout({ 
    children, 
    user, 
    contextTitle, 
    backHref,
    hideHeader = false,
    isLoading = false
}: { 
    children: React.ReactNode, 
    user?: any, 
    contextTitle?: string, 
    backHref?: string,
    hideHeader?: boolean,
    isLoading?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-dvh bg-[#FDF2EC] flex flex-col w-full md:max-w-7xl mx-auto relative shadow-lg overflow-hidden isolate">
      <div
        className="absolute inset-0 pointer-events-none -z-10 bg-[#FDF2EC]"
        style={{
          contain: "strict",
          background:
            "radial-gradient(circle at 90% 6%, rgba(164,197,56,0.32), transparent 34%), radial-gradient(circle at 8% 94%, rgba(91,45,125,0.24), transparent 38%), linear-gradient(180deg, #FDF2EC 0%, #F9ECE8 100%)",
        }}
      >
          <div className="absolute inset-0 bg-[#EADDDE]/15" />
      </div>

      {!hideHeader && (
        <div className="shrink-0 z-50 relative bg-transparent">
            <AppHeader 
                userName={user?.name || "User"} 
                userRole={user?.role} 
                contextTitle={contextTitle}
                backHref={backHref}
                isLoading={isLoading}
            />
        </div>
      )}
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar relative w-full z-10 bg-transparent"
      >
          {children}
      </div>
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const charmId = searchParams.get('charmId');
  
  const [contextTitle, setContextTitle] = useState<string | undefined>(undefined);
  const [backHref, setBackHref] = useState<string | undefined>(undefined);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    document.documentElement.classList.toggle("safari-performance", isIOS || isSafari);

    return () => {
      document.documentElement.classList.remove("safari-performance");
    };
  }, []);

  // Define logic for contextual header
  useEffect(() => {
      if (pathname === "/settings") {
          setContextTitle("Settings");
          setBackHref("/");
          return;
      }

      if (pathname === "/manage-charms") {
          setContextTitle("Manage Charms");
          setBackHref("/");
          return;
      }

      if (!charmId) {
          setContextTitle(prev => prev !== undefined ? undefined : prev);
          setBackHref(prev => prev !== undefined ? undefined : prev);
          return;
      }

      getProductHeader(charmId).then(product => {
          if (product) {
              setContextTitle(product.name);
              setBackHref(pathname !== '/' ? '/' : undefined);
          }
      });
  }, [charmId, pathname]);

  // Service Worker Registration & PWA Diagnostics
  useEffect(() => {
    // 1. Diagnostics
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    console.log(`[PWA] App is running in ${isStandalone ? 'Standalone' : 'Browser'} mode.`);

    // 2. Service Worker
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('[PWA] Service Worker registration failed:', error);
          });
      });
    }

    // 3. Launch Handler (Receiver for NFC/Link Taps)
    if ('launchQueue' in window) {
        (window as any).launchQueue.setConsumer((launchParams: any) => {
            if (launchParams.targetURL) {
                const urlString = launchParams.targetURL;
                console.log("[PWA] App launched with URL:", urlString);

                // Check for custom protocol: web+candyd://[TOKEN]
                if (urlString.startsWith('web+candyd://')) {
                    const token = urlString.replace('web+candyd://', '');
                    if (token) {
                        router.push(`/nfc/login?token=${token}`);
                    }
                } 
                // Fallback for standard web paths
                else {
                    const url = new URL(urlString);
                    if (url.pathname.startsWith('/nfc/login')) {
                        router.push(`${url.pathname}${url.search}`);
                    }
                }
            }
        });
    }
  }, [router]);

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/nfc/login");

  // Always use the GlobalLayout but hide header on login/register pages
  return (
    <RitualTimerProvider>
      <SplashScreen isLoading={isLoading} />
      {user && !isAuthPage && <FullOnboardingTour />}
      <GlobalLayout 
          user={user} 
          contextTitle={contextTitle} 
          backHref={backHref}
          hideHeader={isAuthPage}
          isLoading={isLoading}
      >
          {children}
      </GlobalLayout>
    </RitualTimerProvider>
  );
}
