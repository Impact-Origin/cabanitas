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
                  Fundada a 15 de maio de 1977 na Rua Capitão João Francisco de Sousa, a Barbearia Cabanitas é um
                  símbolo de tradição e dedicação em Beja. O que começou com quatro barbeiros,
                  rapidamente cresceu para uma equipa de seis profissionais — tornando-se,
                  na altura, a única barbearia do país com seis barbeiros a trabalhar em simultâneo.
                </p>

                <p>
                  Com um legado construído ao longo de décadas, a nossa casa sempre se pautou pela
                  entrega total aos clientes. Durante anos, mantivemos as portas abertas das 08h00
                  às 20h00, estendendo-se muitas vezes até às 22h00 para garantir que cada cliente
                  recebia o cuidado e a atenção que merecia.
                </p>

                <p>
                  Em finais de 2019, renovámos o nosso elenco com "sangue novo", unindo a vasta
                  experiência de quem cá está desde o início com a energia e visão das novas
                  gerações. Hoje, continuamos a honrar este ofício artesanal, proporcionando um
                  serviço de excelência onde o clássico e o moderno se encontram num refúgio
                  atemporal de estética masculina.
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

