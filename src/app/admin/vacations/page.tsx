"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getActiveBarbers } from "@/config/barbers";

interface Vacation {
  id: number;
  barber: string;
  start_date: string;
  end_date: string;
  created_at: string;
  notification_sent: boolean;
}

export default function VacationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(null);

  const barbers = getActiveBarbers();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchVacations();
    }
  }, [status]);

  const fetchVacations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vacations");
      const data = await response.json();
      if (response.ok) {
        setVacations(data.vacations || []);
      } else {
        toast.error("Erro ao carregar férias");
      }
    } catch (error) {
      console.error("Error fetching vacations:", error);
      toast.error("Erro ao carregar férias");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBarber || !startDate || !endDate) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (startDate > endDate) {
      toast.error("A data de início deve ser anterior à data de fim");
      return;
    }

    try {
      const response = await fetch("/api/vacations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barber: selectedBarber,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
        }),
      });

      if (response.ok) {
        toast.success("Férias marcadas e clientes notificados!");
        setShowForm(false);
        setStartDate(undefined);
        setEndDate(undefined);
        setSelectedBarber("");
        fetchVacations();
      } else {
        const data = await response.json();
        toast.error(data.message || "Erro ao marcar férias");
      }
    } catch (error) {
      console.error("Error creating vacation:", error);
      toast.error("Erro ao marcar férias");
    }
  };

  const handleDeleteClick = (vacation: Vacation) => {
    setVacationToDelete(vacation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vacationToDelete) return;

    try {
      const response = await fetch(`/api/vacations?id=${vacationToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Férias eliminadas com sucesso!");
        fetchVacations();
      } else {
        toast.error("Erro ao eliminar férias");
      }
    } catch (error) {
      console.error("Error deleting vacation:", error);
      toast.error("Erro ao eliminar férias");
    } finally {
      setVacationToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8 lg:mb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-black mb-2 md:mb-3">
                  Gestão de Férias
                </h1>
                <p className="text-gray-600 text-sm md:text-lg lg:text-xl">
                  Marcar férias dos barbeiros e notificar clientes
                </p>
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-black hover:bg-black/80 text-white w-full md:w-auto text-sm md:text-lg lg:text-xl px-4 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 min-h-[44px] md:min-h-[48px] font-bold"
              >
                {showForm ? "Cancelar" : "+ Marcar Férias"}
              </Button>
            </div>
          </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-black mb-4 md:mb-6">Nova Férias</h2>
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-2 md:mb-3">
                  Barbeiro
                </label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger className="w-full h-[44px] md:h-[52px] text-sm md:text-base lg:text-lg">
                    <SelectValue placeholder="Selecionar barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.name}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-2 md:mb-3">
                    Data de Início
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-[44px] md:h-[52px] text-sm md:text-base lg:text-lg"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        {startDate ? format(startDate, "PPP", { locale: pt }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-2 md:mb-3">
                    Data de Fim
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-[44px] md:h-[52px] text-sm md:text-base lg:text-lg"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        {endDate ? format(endDate, "PPP", { locale: pt }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto bg-black hover:bg-black/80 text-white text-sm md:text-lg lg:text-xl px-4 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 min-h-[44px] md:min-h-[48px] font-bold">
                Marcar Férias e Notificar Clientes
              </Button>
            </form>
          </div>
        )}

        {/* Vacations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              A carregar férias...
            </div>
          ) : vacations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma férias marcada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Barbeiro
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Data de Início
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Data de Fim
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Notificação
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vacations.map((vacation) => (
                    <tr key={vacation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg font-medium text-gray-900">
                          {vacation.barber}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {format(new Date(vacation.start_date), "PPP", { locale: pt })}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {format(new Date(vacation.end_date), "PPP", { locale: pt })}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {vacation.notification_sent ? "✓ Enviada" : "✗ Não enviada"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <Button
                          onClick={() => handleDeleteClick(vacation)}
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
        title="Eliminar Férias"
        description={`Tem a certeza que deseja eliminar as férias de ${vacationToDelete?.barber} de ${vacationToDelete ? format(new Date(vacationToDelete.start_date), "dd/MM/yyyy", { locale: pt }) : ""} a ${vacationToDelete ? format(new Date(vacationToDelete.end_date), "dd/MM/yyyy", { locale: pt }) : ""}? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
}

