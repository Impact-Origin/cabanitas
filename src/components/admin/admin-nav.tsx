"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActiveBarbers } from "@/config/barbers";

interface AdminNavProps {
  selectedBarber?: string;
  onBarberChange?: (barber: string) => void;
  showNewBookingButton?: boolean;
  onNewBookingClick?: () => void;
}

export function AdminNav({
  selectedBarber,
  onBarberChange,
  showNewBookingButton = false,
  onNewBookingClick,
}: AdminNavProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const barbers = getActiveBarbers();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Top Row: Logo and User Info */}
        <div className="flex items-center justify-between py-3 md:py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 md:gap-4 lg:gap-5">
            <Image
              src="/assets/cabanitas_logo.png"
              alt="Barbearia Cabanitas"
              width={150}
              height={75}
              className="h-10 md:h-14 lg:h-16 w-auto"
            />
            <div className="hidden md:block">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-black">Painel de Administração</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">

            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-xs md:text-sm lg:text-base text-gray-600 hidden lg:inline font-medium">
                Olá, {session?.user?.name}
              </span>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="outline"
                className="text-xs md:text-sm lg:text-base px-3 md:px-4 lg:px-5 py-2 h-[40px] md:h-[44px] border-gray-300 hover:bg-gray-50"
                size="sm"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Navigation */}
        <div className="flex items-center justify-between py-2 md:py-3">
          <nav className="flex items-center gap-1 md:gap-2 w-full">
            <Link href="/admin/dashboard" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className={`w-full text-xs md:text-sm lg:text-base px-3 md:px-4 py-2 md:py-2.5 h-[36px] md:h-[40px] font-medium rounded-md transition-all ${
                  isActive("/admin/dashboard")
                    ? "bg-black text-white hover:bg-black/90 shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/clients" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className={`w-full text-xs md:text-sm lg:text-base px-3 md:px-4 py-2 md:py-2.5 h-[36px] md:h-[40px] font-medium rounded-md transition-all ${
                  isActive("/admin/clients")
                    ? "bg-black text-white hover:bg-black/90 shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Clientes
              </Button>
            </Link>
            <Link href="/admin/vacations" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className={`w-full text-xs md:text-sm lg:text-base px-3 md:px-4 py-2 md:py-2.5 h-[36px] md:h-[40px] font-medium rounded-md transition-all ${
                  isActive("/admin/vacations")
                    ? "bg-black text-white hover:bg-black/90 shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Férias
              </Button>
            </Link>
            <Link href="/admin/holidays" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className={`w-full text-xs md:text-sm lg:text-base px-3 md:px-4 py-2 md:py-2.5 h-[36px] md:h-[40px] font-medium rounded-md transition-all ${
                  isActive("/admin/holidays")
                    ? "bg-black text-white hover:bg-black/90 shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Feriados
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

