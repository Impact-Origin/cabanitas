"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time - remove this in production or adjust as needed
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center justify-center gap-12">
        {/* Logo */}
        <div className="relative animate-pulse">
          <Image
            src="/assets/cabanitas_logo.png"
            alt="Barbearia Cabanitas"
            width={500}
            height={250}
            priority
            className="object-contain"
          />
        </div>
        
        {/* Loading Bar */}
        <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-black rounded-full animate-loading-bar"></div>
        </div>
      </div>
    </div>
  );
}

