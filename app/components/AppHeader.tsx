"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Icons ---

function Logo() {
  return (
    <div className="w-8 h-8 flex items-center justify-center">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8"
      >
        <path
          d="M16 4C16 4 12 8 12 14C12 20 16 28 16 28C16 28 20 20 20 14C20 8 16 4 16 4Z"
          stroke="#5B2D7D"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M8 12C8 12 10 14 16 14C22 14 24 12 24 12"
          stroke="#5B2D7D"
          strokeWidth="2"
          fill="none"
        />
        <circle cx="16" cy="10" r="2" fill="#5B2D7D" />
      </svg>
    </div>
  );
}

function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
    >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="3" y1="12" x2="21" y2="12" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="18" x2="21" y2="18" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    </button>
  );
}

function FlowerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
    >
      <path
        d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"
        fill="#A4C538"
        stroke="#A4C538"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CharmIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
    >
      <circle cx="12" cy="12" r="4" stroke="#5B2D7D" strokeWidth="2" />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="6"
        stroke="#5B2D7D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="18"
        x2="12"
        y2="22"
        stroke="#5B2D7D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="2"
        y1="12"
        x2="6"
        y2="12"
        stroke="#5B2D7D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="12"
        x2="22"
        y2="12"
        stroke="#5B2D7D"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
    >
      <polyline
        points="6,9 12,15 18,9"
        stroke="#5B2D7D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
    >
      <path
        d="M5 13L9 17L19 7"
        stroke="#5B2D7D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Menu Dropdown ---

function MenuDropdown({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isCharmDropdownOpen, setIsCharmDropdownOpen] = useState(false);
  const [selectedCharm, setSelectedCharm] = useState("Charm 1");
  const menuRef = useRef<HTMLDivElement>(null);

  const charms = ["Charm 1", "Charm 2", "Charm 3"];
  const menuItems = [
    { label: "SETTINGS", href: "/settings" },
    { label: "MANAGE CHARMS", href: "/manage-charms" },
    { label: "HELP", href: "/help" },
    { label: "EXPLORE PRODUCTS", href: "/products" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

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
              <CharmIcon />
              <span className="text-[#5B2D7D] font-medium">
                {selectedCharm}
              </span>
              <motion.div
                animate={{ rotate: isCharmDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDownIcon />
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
                    {charms.map((charm, index) => (
                      <motion.button
                        key={charm}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.05 }}
                        onClick={() => {
                          setSelectedCharm(charm);
                          setIsCharmDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-[#5B2D7D] hover:bg-[#D8CCE8]/50 rounded-lg transition-colors"
                      >
                        <span
                          className={
                            selectedCharm === charm
                              ? "font-medium"
                              : "opacity-70"
                          }
                        >
                          {charm}
                        </span>
                        {selectedCharm === charm && <CheckIcon />}
                      </motion.button>
                    ))}
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
                <FlowerIcon />
                <span className="text-[#5B2D7D] font-bold text-xl tracking-wide">
                  {item.label}
                </span>
              </motion.div>
              </Link>
            ))}
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
        <MenuButton onClick={() => setIsMenuOpen(true)} />
      </header>
      <MenuDropdown isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
