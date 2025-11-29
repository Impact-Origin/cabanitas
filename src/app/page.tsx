"use client";

import { LoadingScreen } from "@/components/loading-screen";
import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { AboutSection } from "@/components/about-section";
import { BarberSection } from "@/components/barber-section";
import { ServicesSection } from "@/components/services-section";
import { BookingSection } from "@/components/booking-section";
import { BrandsSection } from "@/components/brands-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <div className="min-h-screen bg-white">
        <Navigation />
        <HeroSection />
        <AboutSection />
        <BarberSection />
        <ServicesSection />
        <BookingSection />
        <BrandsSection />
        <Footer />
      </div>
    </>
  );
}
