"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false); // Close mobile menu after navigation
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="hover:opacity-80 transition-opacity"
          >
            <Image
              src={isScrolled ? "/assets/cabanitas_logo.png" : "/assets/topnav_logo.png"}
              alt="Barbearia Cabanitas"
              width={200}
              height={100}
              priority
              className="h-12 w-auto object-contain"
            />
          </button>

          {/* Navigation Links */}
          <ul className="hidden md:flex items-center gap-8">
            <li>
              <button
                onClick={() => scrollToSection("about")}
                className={`text-sm font-medium hover:opacity-60 transition-all uppercase tracking-wider ${
                  isScrolled ? "text-black" : "text-white"
                }`}
              >
                Sobre
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("barber")}
                className={`text-sm font-medium hover:opacity-60 transition-all uppercase tracking-wider ${
                  isScrolled ? "text-black" : "text-white"
                }`}
              >
                Barbeiro
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("services")}
                className={`text-sm font-medium hover:opacity-60 transition-all uppercase tracking-wider ${
                  isScrolled ? "text-black" : "text-white"
                }`}
              >
                Serviços
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("booking")}
                className={`text-sm font-medium hover:opacity-60 transition-all uppercase tracking-wider ${
                  isScrolled ? "text-black" : "text-white"
                }`}
              >
                Marcações
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("brands")}
                className={`text-sm font-medium hover:opacity-60 transition-all uppercase tracking-wider ${
                  isScrolled ? "text-black" : "text-white"
                }`}
              >
                Marcas
              </button>
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden transition-colors ${
              isScrolled ? "text-black" : "text-white"
            }`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Sheet/Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop/Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-50 md:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <Image
                  src="/assets/cabanitas_logo.png"
                  alt="Barbearia Cabanitas"
                  width={150}
                  height={75}
                  className="h-10 w-auto object-contain"
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-black hover:opacity-60 transition-opacity"
                  aria-label="Fechar menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Menu Items */}
              <nav className="p-6">
                <ul className="space-y-1">
                  {[
                    { id: "about", label: "Sobre" },
                    { id: "barber", label: "Barbeiro" },
                    { id: "services", label: "Serviços" },
                    { id: "booking", label: "Marcações" },
                    { id: "brands", label: "Marcas" },
                  ].map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className="w-full text-left px-4 py-4 text-lg font-medium text-black hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {item.label}
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                <div className="text-center text-sm text-gray-500">
                  <p className="mb-2">📞 +351 963 242 206</p>
                  <p>Segunda - Sábado: 9:00 - 20:00</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

