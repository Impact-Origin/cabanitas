"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { getActiveBarbers } from "@/config/barbers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Client {
  name: string;
  email: string | null;
  phone: string;
  barber: string;
  first_booking_date: string;
  last_booking_date: string;
  total_bookings: number;
}

// Parse a "YYYY-MM-DD" (or ISO) date string to a local Date, avoiding timezone shifts
function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateStr = String(value).split("T")[0];
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
}

// Friendly average interval label (e.g. "12 dias", "~5 semanas", "~3 meses")
function formatInterval(days: number): string {
  if (days < 14) return `${Math.max(1, Math.round(days))} dias`;
  if (days < 75) return `~${Math.round(days / 7)} semanas`;
  const months = Math.round(days / 30.44);
  return months <= 1 ? "~1 mês" : `~${months} meses`;
}

// Average visits per year as a pt-PT label (e.g. "~10/ano", "~2,5/ano")
function formatPerYear(value: number): string {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `~${rounded.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}/ano`;
}

// Thresholds for the client segments
const INACTIVE_DAYS = 60; // última visita há mais de 2 meses → "a recuperar"
const FREQUENT_VISITS = 5; // nº de visitas para ser considerado "frequente"

// Average gap (in days) between consecutive visits; null if fewer than 2 visits.
function avgIntervalDays(client: Client): number | null {
  const total = Number(client.total_bookings) || 0;
  const first = parseLocalDate(client.first_booking_date);
  const last = parseLocalDate(client.last_booking_date);
  if (!first || !last || total < 2) return null;
  const spanDays = (last.getTime() - first.getTime()) / 86400000;
  return spanDays > 0 ? spanDays / (total - 1) : null;
}

// Numeric average visits per year (null if not enough data). Used for sorting.
function visitsPerYear(client: Client): number | null {
  const interval = avgIntervalDays(client);
  return interval ? 365.25 / interval : null;
}

// Whole days since the client's last visit (null if no valid date).
function daysSinceLastVisit(client: Client, now: Date): number | null {
  const last = parseLocalDate(client.last_booking_date);
  if (!last) return null;
  return Math.floor((now.getTime() - last.getTime()) / 86400000);
}

// Derive visit frequency labels. Both metrics are reciprocals of the average
// gap, so they never contradict.
function getClientStats(client: Client): { perYear: string | null; interval: string | null } {
  const interval = avgIntervalDays(client);
  if (!interval) return { perYear: null, interval: null };
  return {
    perYear: formatPerYear(365.25 / interval),
    interval: formatInterval(interval),
  };
}

export default function ClientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [segment, setSegment] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [isLoading, setIsLoading] = useState(true);

  const barbers = getActiveBarbers();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchClients();
    }
  }, [status, selectedBarber]);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, segment, sortBy]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/clients?barber=${selectedBarber}`);
      const data = await response.json();
      if (response.ok) {
        setClients(data.clients || []);
      } else {
        toast.error("Erro ao carregar clientes");
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterClients = () => {
    const now = new Date();
    let result = [...clients];

    // Segment filter
    if (segment === "new") {
      result = result.filter((c) => (Number(c.total_bookings) || 0) === 1);
    } else if (segment === "frequent") {
      result = result.filter((c) => (Number(c.total_bookings) || 0) >= FREQUENT_VISITS);
    } else if (segment === "inactive") {
      result = result.filter((c) => {
        const days = daysSinceLastVisit(c, now);
        return days !== null && days > INACTIVE_DAYS;
      });
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone.includes(searchTerm)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest_visit":
          return (
            (parseLocalDate(a.last_booking_date)?.getTime() ?? 0) -
            (parseLocalDate(b.last_booking_date)?.getTime() ?? 0)
          );
        case "most_visits":
          return (Number(b.total_bookings) || 0) - (Number(a.total_bookings) || 0);
        case "frequency":
          return (visitsPerYear(b) ?? -1) - (visitsPerYear(a) ?? -1);
        case "name":
          return a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
        case "recent":
        default:
          return (
            (parseLocalDate(b.last_booking_date)?.getTime() ?? 0) -
            (parseLocalDate(a.last_booking_date)?.getTime() ?? 0)
          );
      }
    });

    setFilteredClients(result);
  };

  const handleBarberChange = (value: string) => {
    setSelectedBarber(value);
  };

  // Shared control styles so every filter control lines up at the same height.
  // The Select trigger needs the `data-[size=default]:` prefix to override its
  // built-in h-9 (which has higher specificity than a plain h-* utility).
  const labelClass =
    "block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-2 md:mb-3";
  const selectTriggerClass =
    "w-full data-[size=default]:h-[44px] md:data-[size=default]:h-[52px] text-sm md:text-base lg:text-lg";
  const inputClass = "w-full h-[44px] md:h-[52px] text-sm md:text-base lg:text-lg";

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8 lg:mb-10">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-black mb-2 md:mb-3">
              Área de Clientes
            </h1>
            <p className="text-gray-600 text-sm md:text-lg lg:text-xl">
              Gerir e visualizar informações dos clientes
            </p>
          </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Barber Filter */}
            <div>
              <label className={labelClass}>Barbeiro</label>
              <Select value={selectedBarber} onValueChange={handleBarberChange}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Selecionar barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Barbeiros</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.name}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Segment Filter */}
            <div>
              <label className={labelClass}>Segmento</label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="new">Novos (1ª visita)</SelectItem>
                  <SelectItem value="frequent">Frequentes ({FREQUENT_VISITS}+ visitas)</SelectItem>
                  <SelectItem value="inactive">A recuperar (+{INACTIVE_DAYS} dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div>
              <label className={labelClass}>Ordenar por</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Última visita (recente)</SelectItem>
                  <SelectItem value="oldest_visit">Última visita (antiga)</SelectItem>
                  <SelectItem value="most_visits">Mais visitas</SelectItem>
                  <SelectItem value="frequency">Mais frequentes</SelectItem>
                  <SelectItem value="name">Nome (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className={labelClass}>Pesquisar</label>
              <Input
                type="text"
                placeholder="Nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              A carregar clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum cliente encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Visitas/ano
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Intervalo
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Cliente desde
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Barbeiro
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Última Marcação
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client, index) => {
                    const stats = getClientStats(client);
                    const totalVisits = Number(client.total_bookings) || 0;
                    const firstDateLabel =
                      parseLocalDate(client.first_booking_date)?.toLocaleDateString("pt-PT") ?? null;
                    const perYearLabel = stats.perYear ?? (totalVisits < 2 ? "1ª visita" : "—");
                    return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg font-medium text-gray-900">
                          {client.name}
                        </div>
                        {/* Mobile: Show email, barber and visit stats */}
                        <div className="md:hidden text-xs text-gray-500 mt-1 space-y-0.5">
                          {client.email && <div>{client.email}</div>}
                          <div>Barbeiro: {client.barber}</div>
                          {firstDateLabel && <div>Cliente desde {firstDateLabel}</div>}
                          <div>
                            {totalVisits} visita(s)
                            {stats.interval && <> · {stats.interval}</>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {client.email || "-"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <a
                          href={`tel:${client.phone}`}
                          className="text-sm md:text-base lg:text-lg text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {client.phone}
                        </a>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900 font-medium">
                          {perYearLabel}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {stats.interval ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {firstDateLabel ?? "-"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">{client.barber}</div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {parseLocalDate(client.last_booking_date)?.toLocaleDateString("pt-PT") ?? "-"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900 font-medium">
                          {client.total_bookings}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {!isLoading && filteredClients.length > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Total: <span className="font-medium">{filteredClients.length}</span> cliente(s)
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

