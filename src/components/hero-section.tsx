"use client";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  const scrollToBooking = () => {
    const element = document.getElementById("booking");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-[url('/assets/barbearia_hero.jpg')] bg-cover bg-center bg-no-repeat"
          style={{ filter: 'brightness(0.4)' }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-2xl font-[family-name:var(--font-playfair)]">
          Clássicos atemporais
          <br />
          <span className="text-4xl md:text-6xl text-white">com uma atitude moderna</span>
        </h1>
        <p className="text-xl md:text-2xl text-white mb-12 max-w-3xl mx-auto drop-shadow-lg font-[family-name:var(--font-playfair)]">
          Para o cavalheiro que se orgulha da sua aparência
        </p>
        <Button
          onClick={scrollToBooking}
          size="lg"
          className="bg-white text-black hover:bg-white/90 text-lg px-8 py-6 rounded-none uppercase tracking-wider font-bold shadow-2xl"
        >
          Marque a Sua Consulta
        </Button>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-white drop-shadow-lg"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}

