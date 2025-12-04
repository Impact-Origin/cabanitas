"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const brands = [
  "/brands/Wahl_Clipper_Corporation_Logo.png",
  "/brands/Taylor_of_Old_Bond_Street_wordmark,_vertical.png",
  "/brands/morfose-ossion-logo-png_seeklogo-430320.png",
  "/brands/ec8dd61951caaf4ff2693d032973f95e.png",
  "/brands/2d760ff915721350c6e8c625c0a9643e0f7772ca.png",
  "/brands/d09a20f-122113-brand-logos_8-new-978x800.png",
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
          {[...brands, ...brands, ...brands].map((brandImage, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-64 h-48 bg-white hover:bg-zinc-50 transition-all duration-300 flex items-center justify-center p-8 group"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={brandImage}
                  alt="Brand logo"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 256px, 256px"
                />
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

