"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

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
    // Wait for authentication and initial fetch to complete
    if (status === "authenticated" && !isLoading && !hasInitialized && !isImporting) {
      console.log("🔄 Checking if initialization needed...", { 
        holidaysLength: holidays.length,
        hasInitialized,
        isLoading,
        isImporting
      });
      
      // If no holidays exist, initialize them
      if (holidays.length === 0) {
        console.log("🔄 No holidays found, starting initialization...");
        initializeAllHolidays().then(() => {
          console.log("✅ Initialization completed");
          setHasInitialized(true);
        }).catch((error) => {
          console.error("❌ Initialization failed:", error);
          setHasInitialized(true); // Set to true to prevent infinite retries
        });
      } else {
        console.log("✅ Holidays already exist, skipping initialization");
        setHasInitialized(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isLoading]);

  // Filter holidays by selected year
  useEffect(() => {
    console.log("🔍 Filtering holidays:", { totalHolidays: holidays.length, selectedYear });
    if (holidays.length > 0) {
      const filtered = holidays.filter(holiday => {
        // Extract year from date string (YYYY-MM-DD format)
        const dateStr = holiday.date && holiday.date.includes('T') ? holiday.date.split('T')[0] : holiday.date;
        if (!dateStr || !dateStr.includes('-')) {
          console.warn("⚠️ Invalid date format:", holiday.date);
          return false;
        }
        const holidayYear = parseInt(dateStr.split('-')[0], 10);
        const matches = holidayYear === selectedYear;
        if (matches) {
          console.log("✅ Match:", holiday.name, dateStr, holidayYear);
        }
        return matches;
      });
      // Sort by date (using string comparison for YYYY-MM-DD format)
      filtered.sort((a, b) => {
        const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
        const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
        return dateA.localeCompare(dateB);
      });
      console.log("📅 Filtered holidays for", selectedYear, ":", filtered.length);
      setFilteredHolidays(filtered);
    } else {
      console.log("📅 No holidays to filter");
      setFilteredHolidays([]);
    }
  }, [holidays, selectedYear]);

  // Initialize all holidays from current year to 2030
  const initializeAllHolidays = async () => {
    try {
      setIsImporting(true);
      console.log("🔄 Starting holiday initialization...");
      
      // First, fetch current holidays to check what exists
      const response = await fetch("/api/holidays");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const currentHolidays = data.holidays || [];
      console.log("📅 Current holidays in DB:", currentHolidays.length);
      
      const currentYear = new Date().getFullYear();
      const endYear = 2030;
      
      // Normalize existing dates to YYYY-MM-DD format for comparison
      const existingDates = new Set(
        currentHolidays.map((h: Holiday) => {
          const date = h.date && h.date.includes('T') ? h.date.split('T')[0] : h.date;
          return date;
        })
      );
      console.log("📅 Existing dates:", Array.from(existingDates).slice(0, 5), "...");
      
      const holidaysToAdd: Array<{ name: string; date: string; is_working: boolean }> = [];

      // Generate holidays for all years from current to 2030
      for (let year = currentYear; year <= endYear; year++) {
        const yearHolidays = generatePortugueseHolidays(year);
        // Only add holidays that don't already exist (normalized comparison)
        yearHolidays.forEach(holiday => {
          if (!existingDates.has(holiday.date)) {
            holidaysToAdd.push(holiday);
            existingDates.add(holiday.date);
          }
        });
      }

      console.log("📅 Holidays to add:", holidaysToAdd.length);

      // Add missing holidays
      if (holidaysToAdd.length > 0) {
        let successCount = 0;
        let failCount = 0;
        for (const holiday of holidaysToAdd) {
          try {
            const response = await fetch("/api/holidays", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(holiday),
            });
            if (response.ok) {
              successCount++;
            } else {
              const errorData = await response.json();
              console.warn("⚠️ Failed to add holiday:", holiday, errorData);
              failCount++;
            }
          } catch (error) {
            console.error("❌ Error adding holiday:", holiday, error);
            failCount++;
          }
        }
        console.log(`✅ Added ${successCount} holidays, ${failCount} failed`);
        
        if (successCount > 0) {
          console.log("✅ Refreshing holidays list after adding", successCount, "holidays");
          // Refresh the list after a short delay to ensure DB has committed
          setTimeout(() => {
            fetchHolidays();
          }, 1500);
        } else {
          console.log("⚠️ No holidays were added, but refresh anyway");
          setTimeout(() => {
            fetchHolidays();
          }, 500);
        }
      } else {
        console.log("✅ All holidays already exist, refreshing list");
        // Still refresh to make sure we have the latest data
        fetchHolidays();
      }
    } catch (error) {
      console.error("❌ Error initializing holidays:", error);
      toast.error("Erro ao inicializar feriados");
    } finally {
      setIsImporting(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Fetching holidays from API...");
      const response = await fetch("/api/holidays");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("📅 API Response:", {
        hasData: !!data,
        hasHolidays: !!(data && data.holidays),
        holidaysType: Array.isArray(data?.holidays) ? 'array' : typeof data?.holidays,
        holidaysLength: data?.holidays?.length || 0,
        firstHoliday: data?.holidays?.[0],
        fullData: data
      });
      
      if (data && Array.isArray(data.holidays)) {
        console.log("✅ Valid holidays array received, setting state...");
        setHolidays(data.holidays);
        console.log("📅 State updated with", data.holidays.length, "holidays");
        if (data.holidays.length > 0) {
          console.log("📅 Sample holidays:", data.holidays.slice(0, 3).map(h => ({ name: h.name, date: h.date, year: h.date?.split('-')[0] })));
        }
      } else {
        console.error("❌ Invalid holidays data format:", {
          data,
          type: typeof data,
          hasHolidays: !!(data && data.holidays),
          holidaysType: typeof data?.holidays
        });
        setHolidays([]);
      }
    } catch (error) {
      console.error("❌ Error fetching holidays:", error);
      toast.error("Erro ao carregar feriados");
      setHolidays([]);
    } finally {
      setIsLoading(false);
      console.log("✅ Fetch completed, isLoading set to false");
    }
  };

  const handleToggleWorking = async (holiday: Holiday) => {
    try {
      // Normalize date to YYYY-MM-DD format
      const normalizedDate = holiday.date.includes('T') 
        ? holiday.date.split('T')[0] 
        : holiday.date;
      
      const response = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: holiday.id, // Include ID to ensure we update the correct holiday
          name: holiday.name,
          date: normalizedDate,
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

  const handleDeleteClick = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!holidayToDelete) return;

    try {
      const response = await fetch(`/api/holidays?id=${holidayToDelete.id}`, {
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
    } finally {
      setHolidayToDelete(null);
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
      // Extract year from date string (YYYY-MM-DD format)
      const dateStr = holiday.date.includes('T') ? holiday.date.split('T')[0] : holiday.date;
      const year = parseInt(dateStr.split('-')[0], 10);
      if (!isNaN(year)) {
        years.add(year);
      }
    });
    // If no years found, add current year and next few years as options
    if (years.size === 0) {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < 6; i++) {
        years.add(currentYear + i);
      }
    }
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
                {holidays.length === 0 && !isLoading && (
                  <Button
                    onClick={async () => {
                      setHasInitialized(false);
                      setIsImporting(true);
                      await initializeAllHolidays();
                      setHasInitialized(true);
                      setIsImporting(false);
                    }}
                    disabled={isImporting}
                    className="ml-auto"
                  >
                    {isImporting ? "A inicializar..." : "Inicializar Feriados"}
                  </Button>
                )}
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
                          {(() => {
                            // Parse YYYY-MM-DD string to Date in local timezone
                            const dateStr = holiday.date.includes('T') ? holiday.date.split('T')[0] : holiday.date;
                            const [year, month, day] = dateStr.split('-').map(Number);
                            return format(new Date(year, month - 1, day), "PPP", { locale: pt });
                          })()}
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
                          onClick={() => handleDeleteClick(holiday)}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Feriado"
        description={`Tem a certeza que deseja eliminar o feriado "${holidayToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
}

