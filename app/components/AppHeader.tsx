"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, ChevronDown, Check, Sparkles, LifeBuoy, ChevronLeft } from "lucide-react";

// --- Icons ---

function Logo() {
  return (
    <div className="w-8 h-8 flex items-center justify-center relative">
      <Image
        src="/Candyd_logo.svg"
        alt="Candyd Logo"
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
        src="/Star.svg"
        alt="Star"
        fill
        className="object-contain"
      />
    </div>
  );
}

// --- Menu Dropdown ---

import { logout } from "@/app/actions/auth";
import { getUserProducts } from "@/app/actions/memories";
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
    if (isOpen) {
        const timeoutId = setTimeout(() => {
            setIsLoadingProducts(true);
            getUserProducts().then((fetchedProducts: any) => {
                setProducts(fetchedProducts);
                setIsLoadingProducts(false);
            });
        }, 0);
        return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

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
          
          let route = '/';
          if (selected.type === 'MEMORY') {
              route = '/memories';
          } else if (selected.type === 'LIFE') {
              route = '/life-charm';
          } else if (selected.type === 'HABIT') {
              route = '/habit-charm';
          }
          
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
          className="absolute top-16 left-4 right-4 z-50 backdrop-blur-2xl bg-[#FDF2EC]/40 rounded-2xl p-4 shadow-lg border border-white/30"
        >
          {/* Charm selector */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="bg-[#E8DCF0]/60 backdrop-blur-sm rounded-2xl p-4 mb-4"
          >
            <button
              onClick={() => setIsCharmDropdownOpen(!isCharmDropdownOpen)}
              className="w-full flex items-center justify-center gap-2 py-2"
            >
              <Sparkles className="w-5 h-5 text-[#5B2D7D]" />
              <span className="text-[#5B2D7D] font-medium">
                {displayLabel}
              </span>
              <motion.div
                animate={{ rotate: isCharmDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-[#5B2D7D]" />
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
                        onClick={() => handleCharmSelect(null)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-[#5B2D7D] hover:bg-[#D8CCE8]/50 rounded-lg transition-colors"
                    >
                        <span className={!currentCharmId ? "font-medium" : "opacity-70"}>
                            All Charms
                        </span>
                        {!currentCharmId && <Check className="w-4 h-4 text-[#5B2D7D]" />}
                    </motion.button>
                  
                    {products.map((product, index) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: (index + 1) * 0.05 }}
                        onClick={() => handleCharmSelect(product.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-[#5B2D7D] hover:bg-[#D8CCE8]/50 rounded-lg transition-colors"
                      >
                        <span
                          className={
                            currentCharmId === product.id
                              ? "font-medium"
                              : "opacity-70"
                          }
                        >
                          {product.name}
                        </span>
                        {currentCharmId === product.id && <Check className="w-4 h-4 text-[#5B2D7D]" />}
                      </motion.button>
                    ))}
                    
                    {products.length === 0 && !isLoadingProducts && (
                        <div className="text-center text-[#5B2D7D]/60 text-sm py-2">
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
                onClick={onClose}
              >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.1 + index * 0.05 }}
                className="flex items-center gap-3 px-2 py-1"
              >
                <StarIcon />
                <span className="text-[#5B2D7D] font-bold text-xl tracking-wide uppercase">
                  {item.label}
                </span>
              </motion.div>
              </Link>
            ))}

            <button
                onClick={() => {
                    logout();
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
                <span className="text-[#5B2D7D] font-bold text-xl tracking-wide uppercase">
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
}

export default function AppHeader({ userName, userRole, contextTitle, backHref }: AppHeaderProps) {
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
      <header className="flex items-center justify-between px-4 py-4 relative z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
              {backHref && (
                  <button 
                    onClick={() => router.push(backHref)}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#5B2D7D] hover:bg-[#FDF2EC] transition-colors shrink-0"
                  >
                      <ChevronLeft className="w-6 h-6" />
                  </button>
              )}
              <div className="cursor-pointer shrink-0" onClick={() => router.push('/')}>
                <Logo />
              </div>
          </div>
          
          <div className="flex flex-col min-w-0">
            {contextTitle ? (
                <h1 className="text-lg font-bold text-[#5B2D7D] leading-tight line-clamp-1">{contextTitle}</h1>
            ) : (
                <>
                    <p className="text-[#5B2D7D] text-xs opacity-70">Hello, {userName}!</p>
                    <p className="text-[#5B2D7D] font-semibold text-sm">Today, {formattedDate}</p>
                </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push('/support')}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#5B2D7D] hover:bg-[#FDF2EC] transition-colors"
            >
                <LifeBuoy className="w-5 h-5" />
            </button>
            <button
              ref={menuButtonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#5B2D7D] hover:bg-[#FDF2EC] transition-colors"
            >
                <Menu className="w-6 h-6" />
            </button>
        </div>
      </header>
      <MenuDropdown isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} toggleButtonRef={menuButtonRef} userRole={userRole} />
    </>
  );
}