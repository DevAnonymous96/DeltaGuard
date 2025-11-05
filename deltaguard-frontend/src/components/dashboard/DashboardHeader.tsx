"use client";

import { Shield, Menu } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { ThemeToggle } from "../ui/ThemeToggle";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  // const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:block text-lg font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              DeltaGuard
            </span>
          </Link>
        </div>

        {/* Right: Theme Toggle + Wallet */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
