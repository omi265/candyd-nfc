"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Icons ---

function Logo() {
  return (
    <div className="w-8 h-8 flex items-center justify-center relative">
      <img
        src="/Candyd_logo.svg"
        alt="Candyd Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

import { Menu, ChevronDown, Check, Sparkles } from "lucide-react";

function StarIcon() {
  return (
    <div className="w-6 h-6 flex items-center justify-center relative">
      <img
        src="/Star.svg"
        alt="Star"
        className="w-full h-full object-contain"
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
}: {
  isOpen: boolean;
  onClose: () => void;
  toggleButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [isCharmDropdownOpen, setIsCharmDropdownOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCharmId = searchParams.get('charmId');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [products, setProducts] = useState<{id: string, name: string}[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Fetch products on open
  useEffect(() => {
    if (isOpen) {
        setIsLoadingProducts(true);
        getUserProducts().then(fetchedProducts => {
            setProducts(fetchedProducts);
            setIsLoadingProducts(false);
        });
    }
  }, [isOpen]);

  // Derived state for display
  const currentProduct = products.find(p => p.id === currentCharmId);
  const displayLabel = currentProduct ? currentProduct.name : "All Charms";

  const menuItems = [
    { label: "SETTINGS", href: "/settings" },
    { label: "MANAGE CHARMS", href: "/manage-charms" },
    { label: "HELP", href: "/help" },
    { label: "EXPLORE PRODUCTS", href: "/products" },
  ];

  const handleCharmSelect = (productId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (productId) {
          params.set('charmId', productId);
      } else {
          params.delete('charmId');
      }
      router.push(`/?${params.toString()}`);
      setIsCharmDropdownOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Ignore clicks on the toggle button (let the button handle its own toggle)
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
                    {/* All Charms Option */}
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
                  
                    {/* Product List */}
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
                <span className="text-[#5B2D7D] font-bold text-xl tracking-wide">
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
                <span className="text-[#5B2D7D] font-bold text-xl tracking-wide">
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

export default function AppHeader({ userName }: { userName: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <header className="flex items-center justify-between px-4 py-4 relative z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <Logo />
          <div>
            <p className="text-[#5B2D7D] text-sm">Hello, {userName}!</p>
            <p className="text-[#5B2D7D] font-semibold">Today, {formattedDate}</p>
          </div>
        </div>
        <button
          ref={menuButtonRef}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
            <Menu className="w-6 h-6 text-[#5B2D7D]" />
        </button>
      </header>
      <MenuDropdown isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} toggleButtonRef={menuButtonRef} />
    </>
  );
}
