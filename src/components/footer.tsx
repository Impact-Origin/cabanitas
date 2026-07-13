import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-black text-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
          {/* About Column */}
          <div>
            <div className="mb-6">
              <Image
                src="/assets/cabanitas_logo.png"
                alt="Barbearia Cabanitas"
                width={200}
                height={100}
                className="h-14 md:h-16 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-white/80 leading-relaxed text-sm md:text-base">
              Clássicos atemporais com uma atitude moderna para o cavalheiro 
              que se orgulha da sua aparência.
            </p>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-lg md:text-xl font-bold mb-5 uppercase tracking-wider text-white">Contacto</h3>
            <div className="space-y-2.5 text-white/80 text-sm md:text-base">
              <p className="leading-relaxed">Rua Capitão João Francisco de Sousa nº36</p>
              <p className="leading-relaxed">7800-451 Beja</p>
              <a
                href="tel:+351963242206"
                className="block hover:text-white transition-colors mt-3"
              >
                +351 963 242 206
              </a>
            </div>
          </div>

          {/* Hours Column */}
          <div className="relative">
            <h3 className="text-lg md:text-xl font-bold mb-5 uppercase tracking-wider text-white">Horário de Funcionamento</h3>
            <div className="text-white space-y-1.5 text-base">
              <div className="font-medium">Segunda - Sexta</div>
              <div className="text-white/90">8:00 - 13:00</div>
              <div className="text-white/90">15:30 - 19:00</div>
              <div className="pt-2 font-medium">Sábado</div>
              <div className="text-white/90">8:00 - 13:00</div>
              <div className="pt-2 font-medium">Domingo</div>
              <div className="text-white/90">Fechado</div>
            </div>
            
            {/* Social Icons - Bottom Right */}
            <div className="flex gap-3 justify-end mt-8">
              <a
                href="https://www.facebook.com/p/Barbearia-Cabanitas-100077292266816/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 group"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/edgarseverino_barber/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 group"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <Separator className="bg-white/10 mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-white/60 text-xs md:text-sm text-center md:text-left">
            © {new Date().getFullYear()} Barbearia Cabanitas. Todos os direitos reservados.
          </p>
          <p className="text-white/60 text-xs md:text-sm text-center md:text-right">
            Website desenvolvido por{" "}
            <a
              href="https://impact-origin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white font-medium underline-offset-2 hover:underline transition-colors"
            >
              Impact
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

