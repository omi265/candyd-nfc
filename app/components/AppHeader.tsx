"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, ChevronDown, Check, Sparkles, LifeBuoy, ChevronLeft, Heart, Zap } from "lucide-react";
import { haptics } from "@/lib/haptics";

// --- Icons ---

function Logo() {
  return (
    <div className="w-20 h-20 flex items-center justify-center relative">
      <Image
        src="/green_logo.png"
        alt="OUR DVE Logo"
        fill
        className="object-contain"
        priority
        loading="eager"
      />
    </div>
  );
}

function StarIcon() {
  return (
    <div className="w-6 h-6 flex items-center justify-center relative">
      <Image
        src="/green_logo.png"
        alt="Star"
        fill
        className="object-contain"
      />
    </div>
  );
}

// --- Menu Dropdown ---

import { logout } from "@/app/actions/auth";
import { getDashboardProducts } from "@/app/actions/memories";
import { useSearchParams } from "next/navigation";

function MenuDropdown({
  isOpen,
  onClose,
  toggleButtonRef,
  userRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  toggleButtonRef: React.RefObject<HTMLButtonElement | null>;
  userRole?: string;
}) {
  const [isCharmDropdownOpen, setIsCharmDropdownOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCharmId = searchParams.get('charmId');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [products, setProducts] = useState<{id: string, name: string, type: string}[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Fetch products on open
  useEffect(() => {
    if (isOpen && products.length === 0) {
        const timeoutId = setTimeout(() => {
            setIsLoadingProducts(true);
            getDashboardProducts().then((fetchedProducts) => {
                setProducts(fetchedProducts);
                setIsLoadingProducts(false);
            });
        }, 0);
        return () => clearTimeout(timeoutId);
    }
  }, [isOpen, products.length]);

  const currentProduct = products.find(p => p.id === currentCharmId);
  const displayLabel = currentProduct ? currentProduct.name : "All Charms";

  const menuItems = [
    ...(userRole === "ADMIN" ? [{ label: "ADMIN DASHBOARD", href: "/admin" }] : []),
    { label: "SETTINGS", href: "/settings" },
    { label: "MANAGE CHARMS", href: "/manage-charms" },
    { label: "HELP", href: "/support" },
    { label: "EXPLORE PRODUCTS", href: "/products" },
  ];

  const handleCharmSelect = (productId: string | null) => {
      const selected = products.find(p => p.id === productId);
      const params = new URLSearchParams(searchParams.toString());
      
      if (!productId || !selected) {
          params.delete('charmId');
          router.push('/');
      } else {
          params.set('charmId', productId);
          
          const route = selected.type === 'HABIT' ? '/habit-charm' : '/life-charm';
          
          router.push(`${route}?${params.toString()}`);
      }
      setIsCharmDropdownOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (toggleButtonRef.current && toggleButtonRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, toggleButtonRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute top-16 left-4 right-4 z-50 backdrop-blur-2xl bg-[#F6F2EC]/40 rounded-2xl p-4 shadow-lg border border-white/30"
        >
          {/* Charm selector */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="bg-[#F2E6DE]/60 backdrop-blur-sm rounded-2xl p-4 mb-4"
          >
            <button
              onClick={() => {
                  haptics.light();
                  setIsCharmDropdownOpen(!isCharmDropdownOpen);
              }}
              className="w-full flex items-center justify-center gap-2 py-2"
            >
              <Sparkles className="w-5 h-5 text-[#556B5A]" />
              <span className="text-[#556B5A] font-medium">
                {displayLabel}
              </span>
              <motion.div
                animate={{ rotate: isCharmDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-[#556B5A]" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isCharmDropdownOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 mt-2">
                    <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => {
                            haptics.light();
                            handleCharmSelect(null);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-[#556B5A] hover:bg-[#E6DED1]/50 rounded-lg transition-colors"
                    >
                        <span className={!currentCharmId ? "font-medium" : "opacity-70"}>
                            All Charms
                        </span>
                        {!currentCharmId && <Check className="w-4 h-4 text-[#556B5A]" />}
                    </motion.button>
                  
                    {products.map((product, index) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: (index + 1) * 0.05 }}
                        onClick={() => {
                            haptics.light();
                            handleCharmSelect(product.id);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-[#556B5A] hover:bg-[#E6DED1]/50 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {product.type !== "HABIT" && <Heart className="w-4 h-4 text-[#7C9A86] fill-[#7C9A86] shrink-0" />}
                          {product.type === "HABIT" && <Zap className="w-4 h-4 text-[#EA580C] fill-[#EA580C] shrink-0" />}
                          <span
                            className={`truncate ${
                              currentCharmId === product.id
                                ? "font-bold text-[#556B5A]"
                                : "opacity-80"
                            }`}
                          >
                            {product.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-[#556B5A]/70 uppercase tracking-wider">
                            {product.type === "HABIT" ? "Habit" : "Life Charm"}
                          </span>
                          {currentCharmId === product.id && <Check className="w-4 h-4 text-[#556B5A]" />}
                        </div>
                      </motion.button>
                    ))}
                    
                    {products.length === 0 && !isLoadingProducts && (
                        <div className="text-center text-[#556B5A]/60 text-sm py-2">
                            No charms found
                        </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Menu items */}
          <nav className="space-y-3">
            {menuItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className="block"
                onClick={() => {
                    haptics.light();
                    onClose();
                }}
              >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.1 + index * 0.05 }}
                className="flex items-center gap-3 px-2 py-1"
              >
                <StarIcon />
                <span className="text-[#556B5A] font-bold text-xl tracking-wide uppercase">
                  {item.label}
                </span>
              </motion.div>
              </Link>
            ))}

            <button
                onClick={() => {
                    haptics.light();
                    window.dispatchEvent(new CustomEvent("open-onboarding"));
                    onClose();
                }}
                className="w-full text-left"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.1 + menuItems.length * 0.05 }}
                className="flex items-center gap-3 px-2 py-1"
              >
                <StarIcon />
                <span className="text-[#556B5A] font-bold text-xl tracking-wide uppercase">
                  RESTART TOUR
                </span>
              </motion.div>
            </button>

            <button
                onClick={() => {
                    haptics.light();
                    logout();
                    onClose();
                }}
                className="w-full text-left"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.1 + (menuItems.length + 1) * 0.05 }}
                className="flex items-center gap-3 px-2 py-1"
              >
                <StarIcon />
                <span className="text-[#556B5A] font-bold text-xl tracking-wide uppercase">
                  LOGOUT
                </span>
              </motion.div>
            </button>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- AppHeader Component ---

interface AppHeaderProps {
    userName: string;
    userRole?: string;
    contextTitle?: string;
    backHref?: string;
    isLoading?: boolean;
}

export default function AppHeader({ userName, userRole, contextTitle, backHref, isLoading }: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata"
  });

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2 relative z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
              {backHref && (
                  <button 
                    onClick={() => {
                        haptics.light();
                        router.push(backHref);
                    }}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#556B5A] hover:bg-[#F6F2EC] transition-colors shrink-0"
                  >
                      <ChevronLeft className="w-6 h-6" />
                  </button>
              )}
              <div className="cursor-pointer shrink-0" onClick={() => {
                  haptics.light();
                  router.push('/');
              }}>
                <Logo />
              </div>
          </div>
          
          <div className="flex flex-col min-w-0">
            {isLoading ? (
                <div className="space-y-2">
                    <div className="h-3 w-20 bg-[#556B5A]/10 rounded-full animate-pulse" />
                    <div className="h-4 w-32 bg-[#556B5A]/20 rounded-full animate-pulse" />
                </div>
            ) : contextTitle ? (
                <h1 className="text-base font-bold text-[#556B5A] leading-tight line-clamp-1">{contextTitle}</h1>
            ) : (
                <>
                    <p className="text-[#556B5A] text-xs opacity-70">Hello, {userName}!</p>
                    <p className="text-[#556B5A] font-semibold text-sm">Today, {formattedDate}</p>
                </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
                <>
                    <div className="w-10 h-10 rounded-full bg-white animate-pulse" />
                    <div className="w-10 h-10 rounded-full bg-white animate-pulse" />
                </>
            ) : (
                <>
                    <button
                      onClick={() => {
                          haptics.light();
                          router.push('/support');
                      }}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#556B5A] hover:bg-[#F6F2EC] transition-colors"
                    >
                        <LifeBuoy className="w-5 h-5" />
                    </button>
                    <button
                      ref={menuButtonRef}
                      onClick={() => {
                          haptics.light();
                          setIsMenuOpen(!isMenuOpen);
                      }}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#556B5A] hover:bg-[#F6F2EC] transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </>
            )}
        </div>
      </header>
      <MenuDropdown isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} toggleButtonRef={menuButtonRef} userRole={userRole} />
    </>
  );
}
