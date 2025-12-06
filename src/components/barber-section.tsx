import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export function BarberSection() {
  return (
    <section id="barber" className="py-24 bg-zinc-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-black mb-16 text-center">
          Conheça o Nosso Barbeiro
        </h2>

        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-black/10 shadow-xl overflow-hidden rounded-none">
            <div className="aspect-square relative bg-gradient-to-br from-zinc-200 to-zinc-100">
              <Image
                src="/assets/edgar.jpeg"
                alt="Edgar - Barbeiro Mestre"
                fill
                className="object-cover"
                priority
              />
            </div>
            <CardContent className="p-8 text-center bg-white">
              <h3 className="text-3xl font-bold text-black mb-2">Edgar</h3>
              <p className="text-xl text-black/60 mb-4 uppercase tracking-wider">
                Barbeiro Mestre | Proprietário
              </p>
              <div className="w-16 h-1 bg-black mx-auto mb-6"></div>
              <p className="text-lg text-black/70 leading-relaxed">
                Com mais de 15 anos de experiência na arte da barbearia, o Edgar traz 
                uma perícia e paixão incomparáveis a cada corte. Formado em técnicas 
                clássicas e contemporâneas, garante que cada cliente sai com a melhor 
                aparência e sensação.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

