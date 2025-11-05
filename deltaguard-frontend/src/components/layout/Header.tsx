"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "../ui/ThemeToggle";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Problem", href: "#problem" },
    { label: "Solution", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Docs", href: "/docs" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass shadow-lg" : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-linear-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              DeltaGuard
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/simulator")}
            >
              Try Simulator
            </Button>
            <Button onClick={() => (window.location.href = "/dashboard")}>
              Launch App
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-border"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    window.location.href = "/simulator";
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Try Simulator
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = "/dashboard";
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Launch App
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </nav>
    </motion.header>
  );
}
