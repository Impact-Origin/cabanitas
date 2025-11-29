import { BookingWizard } from "@/components/booking-wizard";

export function BookingSection() {
  return (
    <section id="booking" className="py-24 bg-zinc-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
          Marcações Online
        </h2>

        <BookingWizard />

        {/* Contact Info */}
        <div className="mt-12 text-center">
          <p className="text-lg text-black/70 mb-4">
            Ou ligue-nos diretamente para marcar a sua consulta
          </p>
          <a
            href="tel:+351963242206"
            className="text-2xl font-bold text-black hover:opacity-60 transition-opacity"
          >
            +351 963 242 206
          </a>
        </div>
      </div>
    </section>
  );
}

