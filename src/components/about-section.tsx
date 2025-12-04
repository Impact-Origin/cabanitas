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
            <div className="relative h-[500px] lg:h-[600px] overflow-hidden rounded-lg">
              <Image
                src="/office/WhatsApp Image 2025-12-01 at 21.25.39.jpeg"
                alt="Interior da Barbearia Cabanitas"
                fill
                className="object-cover"
                priority
              />
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

