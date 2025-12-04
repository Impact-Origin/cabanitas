"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { AnimatedSection } from "@/components/animated-section";

const services = [
  {
    id: 1,
    name: "Corte Simples de Cabelo",
    duration: "30 min",
    description:
      "Corte de cabelo clássico e profissional, adaptado ao seu estilo pessoal.",
    category: "haircut",
  },
  {
    id: 2,
    name: "Corte, Lavagem e Penteado",
    duration: "30 min",
    description: "Serviço completo incluindo corte, lavagem e finalização com penteado.",
    category: "haircut",
  },
  {
    id: 3,
    name: "Corte com Máquina (pentes 1, 2, 3 e 4)",
    duration: "30 min",
    description:
      "Corte prático e moderno com máquina, utilizando pentes de diferentes tamanhos.",
    category: "haircut",
  },
  {
    id: 4,
    name: "Corte com Máquina, Pente 0",
    duration: "30 min",
    description:
      "Corte rente com máquina, pente 0, para um visual clean e prático.",
    category: "haircut",
  },
  {
    id: 5,
    name: "Degradé",
    duration: "30 min",
    description: "Corte degradê moderno com transições suaves e acabamento impecável.",
    category: "haircut",
  },
  {
    id: 6,
    name: "Barba à Tesoura e Máquina",
    duration: "30 min",
    description: "Aparar e modelar a barba com tesoura e máquina para um visual cuidado.",
    category: "beard",
  },
  {
    id: 7,
    name: "Barba / Cabelo à Navalha",
    duration: "45 min",
    description: "Acabamento tradicional à navalha para barba ou cabelo, proporcionando precisão e estilo clássico.",
    category: "beard",
  },
];

export function ServicesSection() {
  const [filter, setFilter] = useState<"all" | "haircut" | "beard">("all");

  const filteredServices =
    filter === "all" ? services : services.filter((s) => s.category === filter);

  return (
    <section id="services" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Os Nossos Serviços
          </h2>
        </AnimatedSection>

        {/* Filter Buttons */}
        <AnimatedSection delay={0.2}>
          <div className="flex justify-center gap-4 mb-16">
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-3 font-medium uppercase tracking-wider transition-all text-sm ${
              filter === "all"
                ? "text-black border-b-2 border-black"
                : "text-black/50 hover:text-black"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter("haircut")}
            className={`px-6 py-3 font-medium uppercase tracking-wider transition-all text-sm ${
              filter === "haircut"
                ? "text-black border-b-2 border-black"
                : "text-black/50 hover:text-black"
            }`}
          >
            Cortes
          </button>
          <button
            onClick={() => setFilter("beard")}
            className={`px-6 py-3 font-medium uppercase tracking-wider transition-all text-sm ${
              filter === "beard"
                ? "text-black border-b-2 border-black"
                : "text-black/50 hover:text-black"
            }`}
          >
            Barba
          </button>
          </div>
        </AnimatedSection>

        {/* Services Grid - 2 columns */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            <AnimatePresence mode="wait">
              {filteredServices.map((service, index) => (
                <motion.div
                  key={`${filter}-${service.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: [0.21, 0.47, 0.32, 0.98],
                  }}
                  className="border-b border-black/10 pb-8"
                >
                  {/* Header with name and duration */}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-bold text-black pr-4">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-2 text-black/60 whitespace-nowrap">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm">{service.duration}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-black/70 leading-relaxed">
                    {service.description}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

