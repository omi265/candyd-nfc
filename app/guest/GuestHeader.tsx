"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutGuest } from "@/app/actions/guest";

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

export default function GuestHeader() {
  const router = useRouter();

  const handleLogout = async () => {
      await logoutGuest();
      router.push('/guest/login');
  };

  return (
    <header className="flex items-center justify-between px-4 py-4 relative z-40 bg-[#FDF2EC]">
      <div className="flex items-center gap-3">
        <Logo />
        <div>
          <p className="text-[#5B2D7D] text-sm font-medium">Guest Access</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#5B2D7D] hover:bg-red-50 hover:text-red-500 transition-colors"
        title="Logout"
      >
          <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}
