"use client";

import { useAuth } from "@/lib/auth-context";
import AppHeader from "./AppHeader";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getUserProducts } from "@/app/actions/memories";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import SplashScreen from "./SplashScreen";
import { RitualTimerProvider } from "@/lib/ritual-timer-context";

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
  
  // Initialize useScroll for parallax
  const { scrollYProgress } = useScroll({
    container: scrollRef,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const y1 = useTransform(smoothProgress, [0, 1], [0, -200]);
  const y2 = useTransform(smoothProgress, [0, 1], [0, 200]);
  const scale1 = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.2, 1]);
  const scale2 = useTransform(smoothProgress, [0, 0.5, 1], [1, 0.8, 1]);

  return (
    <div className="h-dvh bg-[#FDF2EC] flex flex-col w-full md:max-w-7xl mx-auto relative shadow-2xl overflow-hidden isolate">
      {/* Global Background Decorations - High intensity & Parallax */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FDF2EC]">
          {/* Top Right Green Glow */}
          <motion.div 
            style={{ y: y1, scale: scale1, animationDuration: '6s' }}
            className="absolute top-[-15%] right-[-15%] w-[800px] h-[800px] bg-[#A4C538]/65 rounded-full blur-[100px] animate-pulse" 
          />
          
          {/* Bottom Left Purple Glow */}
          <motion.div 
            style={{ y: y2, scale: scale2, animationDuration: '10s' }}
            className="absolute bottom-[-15%] left-[-15%] w-[800px] h-[800px] bg-[#5B2D7D]/55 rounded-full blur-[100px] animate-pulse" 
          />

          {/* Center Connector Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#EADDDE]/50 rounded-full blur-[120px]" />
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

      getUserProducts().then(products => {
          const product = products.find(p => p.id === charmId);
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
