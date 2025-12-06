"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Holiday {
  id: number;
  name: string;
  date: string;
  is_working: boolean;
  created_at: string;
}

export default function HolidaysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [filteredHolidays, setFilteredHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchHolidays();
    }
  }, [status]);

  // Initialize holidays automatically until 2030 (only once after holidays are loaded)
  useEffect(() => {
    if (status === "authenticated" && !hasInitialized && !isLoading && holidays.length >= 0) {
      initializeAllHolidays();
      setHasInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isLoading, holidays.length, hasInitialized]);

  // Filter holidays by selected year
  useEffect(() => {
    if (holidays.length > 0) {
      const filtered = holidays.filter(holiday => {
        const holidayYear = new Date(holiday.date).getFullYear();
        return holidayYear === selectedYear;
      });
      // Sort by date
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setFilteredHolidays(filtered);
    } else {
      setFilteredHolidays([]);
    }
  }, [holidays, selectedYear]);

  // Initialize all holidays from current year to 2030
  const initializeAllHolidays = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const endYear = 2030;
      const existingDates = new Set(holidays.map(h => h.date));
      const holidaysToAdd: Array<{ name: string; date: string; is_working: boolean }> = [];

      // Generate holidays for all years from current to 2030
      for (let year = currentYear; year <= endYear; year++) {
        const yearHolidays = generatePortugueseHolidays(year);
        // Only add holidays that don't already exist
        yearHolidays.forEach(holiday => {
          if (!existingDates.has(holiday.date)) {
            holidaysToAdd.push(holiday);
            existingDates.add(holiday.date);
          }
        });
      }

      // Add missing holidays silently
      if (holidaysToAdd.length > 0) {
        let successCount = 0;
        for (const holiday of holidaysToAdd) {
          try {
            const response = await fetch("/api/holidays", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(holiday),
            });
            if (response.ok) {
              successCount++;
            }
          } catch (error) {
            // Silent fail
          }
        }
        if (successCount > 0) {
          // Refresh the list after a short delay
          setTimeout(() => {
            fetchHolidays();
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error initializing holidays:", error);
    }
  };

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/holidays");
      const data = await response.json();
      if (response.ok) {
        setHolidays(data.holidays || []);
      } else {
        toast.error("Erro ao carregar feriados");
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      toast.error("Erro ao carregar feriados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWorking = async (holiday: Holiday) => {
    try {
      const response = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: holiday.name,
          date: holiday.date,
          is_working: !holiday.is_working,
        }),
      });

      if (response.ok) {
        toast.success("Estado do feriado atualizado!");
        fetchHolidays();
      } else {
        const data = await response.json();
        toast.error(data.message || "Erro ao atualizar feriado");
      }
    } catch (error) {
      console.error("Error updating holiday:", error);
      toast.error("Erro ao atualizar feriado");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem a certeza que deseja eliminar este feriado?")) {
      return;
    }

    try {
      const response = await fetch(`/api/holidays?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Feriado eliminado com sucesso!");
        fetchHolidays();
      } else {
        toast.error("Erro ao eliminar feriado");
      }
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast.error("Erro ao eliminar feriado");
    }
  };

  // Calculate Easter date (using algorithm for years 1900-2099)
  const calculateEaster = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  // Generate Portuguese holidays for a given year
  const generatePortugueseHolidays = (year: number): Array<{ name: string; date: string; is_working: boolean }> => {
    const holidays: Array<{ name: string; date: string; is_working: boolean }> = [];
    const easter = calculateEaster(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);

    // Fixed holidays (default: não trabalha)
    holidays.push(
      { name: "Ano Novo", date: `${year}-01-01`, is_working: false },
      { name: "Dia da Liberdade", date: `${year}-04-25`, is_working: false },
      { name: "Dia do Trabalhador", date: `${year}-05-01`, is_working: false },
      { name: "Dia de Portugal", date: `${year}-06-10`, is_working: false },
      { name: "Assunção de Nossa Senhora", date: `${year}-08-15`, is_working: false },
      { name: "Implantação da República", date: `${year}-10-05`, is_working: false },
      { name: "Todos os Santos", date: `${year}-11-01`, is_working: false },
      { name: "Restauração da Independência", date: `${year}-12-01`, is_working: false },
      { name: "Imaculada Conceição", date: `${year}-12-08`, is_working: false },
      { name: "Natal", date: `${year}-12-25`, is_working: false }
    );

    // Variable holidays
    holidays.push(
      { name: "Sexta-feira Santa", date: format(goodFriday, "yyyy-MM-dd"), is_working: false },
      { name: "Páscoa", date: format(easter, "yyyy-MM-dd"), is_working: false },
      { name: "Corpo de Deus", date: format(corpusChristi, "yyyy-MM-dd"), is_working: false }
    );

    return holidays;
  };


  // Get available years from holidays
  const getAvailableYears = (): number[] => {
    const years = new Set<number>();
    holidays.forEach(holiday => {
      const year = new Date(holiday.date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => a - b);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8 lg:mb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-black mb-2 md:mb-3">
                  Gestão de Feriados
                </h1>
                <p className="text-gray-600 text-sm md:text-lg lg:text-xl">
                  Gerir se a barbearia trabalha nos feriados nacionais de Portugal. Os feriados são calculados automaticamente até 2030.
                </p>
              </div>
            </div>

            {/* Year Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className="text-sm md:text-base lg:text-lg font-medium text-gray-700 whitespace-nowrap">
                  Filtrar por Ano:
                </label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-full sm:w-[200px] md:w-[220px] h-[44px] md:h-[48px] text-sm md:text-base">
                    <SelectValue placeholder="Selecionar ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm md:text-base text-gray-600">
                  {filteredHolidays.length} feriado{filteredHolidays.length !== 1 ? "s" : ""} em {selectedYear}
                </div>
              </div>
            </div>
          </div>

        {/* Holidays List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              A carregar feriados...
            </div>
          ) : filteredHolidays.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum feriado encontrado para {selectedYear}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Alterar Estado
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHolidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg font-medium text-gray-900">
                          {holiday.name}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {format(new Date(holiday.date), "PPP", { locale: pt })}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg">
                          {holiday.is_working ? (
                            <span className="text-green-600 font-medium">✓ Aberto</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗ Fechado</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <Button
                          onClick={() => handleToggleWorking(holiday)}
                          variant="outline"
                          size="sm"
                          className="text-xs md:text-sm lg:text-base px-3 md:px-5 lg:px-6 py-2 md:py-3 min-h-[44px] md:min-h-[48px]"
                        >
                          {holiday.is_working ? "Fechar" : "Abrir"}
                        </Button>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <Button
                          onClick={() => handleDelete(holiday.id!)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 min-h-[44px] md:min-h-[48px]"
                        >
                          <Trash2 className="h-5 w-5 md:h-6 md:w-6" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

