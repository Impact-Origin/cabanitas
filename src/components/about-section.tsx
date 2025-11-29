import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { AnimatedSection } from "@/components/animated-section";

export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-16 text-center">
            Sobre a Nossa Barbearia
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Image Column */}
          <AnimatedSection delay={0.2}>
            <div className="relative h-[500px] lg:h-[600px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-100 flex items-center justify-center">
              {/* Placeholder - replace with actual barbershop photo */}
              <div className="text-center">
                <svg
                  className="w-24 h-24 mx-auto mb-4 text-black/20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-black/40 text-sm uppercase tracking-wider">
                  Foto da Barbearia
                </p>
              </div>
            </div>
            </div>
          </AnimatedSection>

          {/* Text Column */}
          <AnimatedSection delay={0.4}>
            <div>
            <Separator className="mb-8 bg-black/10" />

            <div className="space-y-6 text-lg text-black/80 leading-relaxed">
              <p>
                Situada no seu bairro tradicional, encontrará o seu refúgio de estética e beleza 
                masculina. Um lugar onde o artesanato atemporal encontra o estilo moderno.
              </p>
              
              <p>
                Fundada por cabeleireiros distintos com décadas de experiência, a nossa barbearia 
                reinventa-se mantendo-se fiel a um dos ofícios mais antigos do mundo. Trazemos-lhe 
                estilo atemporal com um toque contemporâneo.
              </p>
              
              <p>
                A nossa equipa cuidadosamente selecionada proporciona cuidados capilares incomparáveis 
                aliados a um serviço de excelência. Do moderno ao clássico, dominamos todos os tipos 
                e texturas de cabelo, e todas as técnicas e ferramentas de corte – que pode levar 
                para casa e rejuvenescer o seu visual com um toque profissional.
              </p>
            </div>

            {/* Feature Tags */}
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="px-6 py-3 border-2 border-black text-black font-medium uppercase tracking-wider text-sm">
                Serviço Premium
              </div>
              <div className="px-6 py-3 border-2 border-black text-black font-medium uppercase tracking-wider text-sm">
                Barbeiros Especialistas
              </div>
              <div className="px-6 py-3 border-2 border-black text-black font-medium uppercase tracking-wider text-sm">
                Estilo Clássico
              </div>
            </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

