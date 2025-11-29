"use client";

import { useEffect, useRef } from "react";

const brands = [
  { name: "American Crew", description: "Produtos Capilares Premium" },
  { name: "Depot", description: "Excelência Italiana" },
  { name: "Mühle", description: "Tradição Alemã" },
  { name: "Antiga Barbearia de Bairro", description: "Herança Portuguesa" },
  { name: "Papillon", description: "Estilo Londrino" },
];

export function BrandsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollAmount = 0;
    const scrollSpeed = 0.5;

    const scroll = () => {
      scrollAmount += scrollSpeed;
      if (scrollContainer) {
        scrollContainer.scrollLeft = scrollAmount;
        
        // Reset scroll when reaching the end (seamless loop)
        if (scrollAmount >= scrollContainer.scrollWidth / 2) {
          scrollAmount = 0;
        }
      }
    };

    const intervalId = setInterval(scroll, 20);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <section id="brands" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-black text-center">
          As Marcas que Escolhemos
        </h2>
        <p className="text-xl text-black/60 text-center mt-4 max-w-2xl mx-auto">
          Trabalhamos exclusivamente com marcas premium que partilham o nosso compromisso com a qualidade e excelência
        </p>
      </div>

      {/* Infinite Scroll Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-8 overflow-x-hidden"
          style={{ scrollBehavior: "auto" }}
        >
          {/* Duplicate brands for seamless infinite scroll */}
          {[...brands, ...brands, ...brands].map((brand, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-80 h-64 border-2 border-black/10 bg-zinc-50 hover:bg-white hover:border-black transition-all duration-300 flex flex-col items-center justify-center p-8 group"
            >
              <div className="text-center">
                <div className="text-6xl font-bold text-black/10 group-hover:text-black/20 transition-colors mb-4">
                  LOGO
                </div>
                <h3 className="text-xl font-bold text-black mb-2">{brand.name}</h3>
                <p className="text-sm text-black/60 uppercase tracking-wider">
                  {brand.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Gradient Overlays */}
        <div className="absolute top-0 left-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
      </div>
    </section>
  );
}

