"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfWeek, endOfWeek, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveBarbers } from "@/config/barbers";
import { CalendarIcon } from "lucide-react";

interface Booking {
  id: number;
  service: string;
  barber: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string;
  observations?: string;
  status: string;
  created_by: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showNewBookingForm, setShowNewBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [bookingStep, setBookingStep] = useState(1);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  
  const activeBarbers = getActiveBarbers();

  // New booking form state
  const [newBooking, setNewBooking] = useState({
    service: "Cabelo",
    barber: "Edgar",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    name: "",
    phone: "",
    email: "",
    observations: "",
  });

  // Available time slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (viewMode === "week") {
        fetchWeekBookings();
      } else {
        fetchBookings();
      }
    }
  }, [status, currentMonth, viewMode]);

  // Fetch available slots when date or barber changes
  useEffect(() => {
    if (newBooking.date && newBooking.barber) {
      fetchAvailableSlots(newBooking.date, newBooking.barber);
    }
  }, [newBooking.date, newBooking.barber]);

  const fetchBookings = async () => {
    try {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      console.log("🔄 Fetching bookings from", start, "to", end);
      const url = `/api/bookings?startDate=${start}&endDate=${end}`;
      console.log("📡 API URL:", url);
      const response = await fetch(url);
      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log("✅ Bookings received:", data);
      console.log("📋 Number of bookings:", data.bookings?.length || 0);
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("❌ Error fetching bookings:", error);
      toast.error("Erro ao carregar marcações");
    }
  };

  const fetchWeekBookings = async () => {
    try {
      const start = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const end = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
      console.log("Fetching week bookings from", start, "to", end);
      const response = await fetch(`/api/bookings?startDate=${start}&endDate=${end}`);
      const data = await response.json();
      console.log("Week bookings received:", data.bookings);
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Erro ao carregar marcações");
    }
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];
    
    // Morning slots: 08:30 - 13:00
    let hour = 8;
    let minute = 30;
    while (hour < 13 || (hour === 13 && minute === 0)) {
      slots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour += 1;
      }
    }
    
    // Afternoon slots: 15:00 - 18:30
    hour = 15;
    minute = 0;
    while (hour < 18 || (hour === 18 && minute <= 30)) {
      slots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour += 1;
      }
    }
    
    return slots;
  };

  const fetchAvailableSlots = async (date: string, barber: string) => {
    try {
      // Get all possible slots
      const allSlots = generateTimeSlots();
      
      // Get bookings for this date and barber
      const response = await fetch(`/api/bookings?date=${date}`);
      const data = await response.json();
      const dayBookings = (data.bookings || []).filter(
        (b: Booking) => b.barber === barber && b.status !== "cancelled"
      );
      
      // Filter out booked slots
      const bookedTimes = dayBookings.map((b: Booking) => b.time);
      const available = allSlots.filter((slot) => !bookedTimes.includes(slot));
      
      setAvailableSlots(available);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      setAvailableSlots(generateTimeSlots());
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBooking.time) {
      toast.error("Por favor selecione um horário");
      return;
    }

    setIsCreatingBooking(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newBooking,
          created_by: "admin",
        }),
      });

      if (response.ok) {
        toast.success("Marcação criada com sucesso!", {
          description: `${newBooking.name} - ${newBooking.date} às ${newBooking.time}`,
        });
        setShowNewBookingForm(false);
        setBookingStep(1);
        setNewBooking({
          service: "Cabelo",
          barber: "Edgar",
          date: format(new Date(), "yyyy-MM-dd"),
          time: "",
          name: "",
          phone: "",
          email: "",
          observations: "",
        });
        if (viewMode === "week") {
          fetchWeekBookings();
        } else {
          fetchBookings();
        }
      } else {
        const data = await response.json();
        toast.error("Erro ao criar marcação", {
          description: data.message || "Por favor tente novamente",
        });
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Erro ao criar marcação", {
        description: "Ocorreu um erro inesperado",
      });
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const handleDeleteBooking = async (id: number) => {
    if (!confirm("Tem a certeza que deseja eliminar esta marcação?")) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Marcação eliminada com sucesso!");
        if (viewMode === "week") {
          fetchWeekBookings();
        } else {
          fetchBookings();
        }
        setSelectedBooking(null);
      } else {
        toast.error("Erro ao eliminar marcação");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Erro ao eliminar marcação");
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        toast.success("Estado atualizado com sucesso!");
        if (viewMode === "week") {
          fetchWeekBookings();
        } else {
          fetchBookings();
        }
      } else {
        toast.error("Erro ao atualizar estado");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar estado");
    }
  };

  const getDayBookings = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    let dayBookings = bookings.filter((b) => {
      // Handle both formats: "2025-11-29" and "2025-11-29T00:00:00.000Z"
      const bookingDate = b.date.split('T')[0]; // Get only the date part
      return bookingDate === dateStr;
    });
    
    // Apply barber filter
    if (selectedBarber !== "all") {
      dayBookings = dayBookings.filter((b) => b.barber === selectedBarber);
    }
    
    console.log(`📅 Bookings for ${dateStr} (barber: ${selectedBarber}):`, dayBookings.length);
    return dayBookings;
  };

  const renderCalendar = () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const firstDayOfWeek = startOfMonth(currentMonth).getDay();
    const emptyDays = Array((firstDayOfWeek + 6) % 7).fill(null);

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const dayBookings = getDayBookings(day);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`aspect-square p-2 rounded-lg border transition-all ${
                isSelected
                  ? "bg-black text-white border-black"
                  : isToday
                  ? "bg-gray-100 border-gray-300"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="text-sm font-medium">{format(day, "d")}</div>
              {dayBookings.length > 0 && (
                <div className="mt-1">
                  <div
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-black"
                    }`}
                  >
                    {dayBookings.length}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>A carregar...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const selectedDateBookings = viewMode === "day" ? getDayBookings(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/assets/cabanitas_logo.png"
                alt="Barbearia Cabanitas"
                width={150}
                height={75}
                className="h-10 w-auto"
              />
              <h1 className="text-xl font-bold text-black">Painel de Administração</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Barber Filter Dropdown */}
              <Select
                value={selectedBarber}
                onValueChange={setSelectedBarber}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Barbeiros</SelectItem>
                  {activeBarbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.name}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setShowNewBookingForm(true);
                  setBookingStep(1);
                }}
                className="bg-black hover:bg-black/80 text-white text-lg px-8 py-6 font-bold"
                size="lg"
              >
                + Nova Marcação
              </Button>
              <span className="text-sm text-gray-600">Olá, {session.user?.name}</span>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="outline"
                className="text-sm"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-black">
                  {viewMode === "day" 
                    ? format(currentMonth, "MMMM yyyy", { locale: pt })
                    : `Semana de ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: pt })}`
                  }
                </h2>
                <div className="flex gap-2">
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      onClick={() => setViewMode("day")}
                      variant={viewMode === "day" ? "default" : "ghost"}
                      size="sm"
                      className={viewMode === "day" ? "bg-black text-white" : ""}
                    >
                      Mês
                    </Button>
                    <Button
                      onClick={() => setViewMode("week")}
                      variant={viewMode === "week" ? "default" : "ghost"}
                      size="sm"
                      className={viewMode === "week" ? "bg-black text-white" : ""}
                    >
                      Semana
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      if (viewMode === "week") {
                        setSelectedDate(addDays(selectedDate, -7));
                      } else {
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                        );
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    ← Anterior
                  </Button>
                  <Button
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(new Date());
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Hoje
                  </Button>
                  <Button
                    onClick={() => {
                      if (viewMode === "week") {
                        setSelectedDate(addDays(selectedDate, 7));
                      } else {
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                        );
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Próximo →
                  </Button>
                </div>
              </div>

              {viewMode === "day" ? (
                renderCalendar()
              ) : (
                <div className="space-y-4">
                  {getWeekDays().map((day) => {
                    const dayBookings = getDayBookings(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div key={day.toISOString()} className={`border rounded-lg p-4 ${isToday ? "border-black bg-gray-50" : "border-gray-200"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-black">
                              {format(day, "EEEE", { locale: pt })}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {format(day, "d 'de' MMMM", { locale: pt })}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {dayBookings.length} marcação{dayBookings.length !== 1 ? "ões" : ""}
                          </span>
                        </div>
                        
                        {dayBookings.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-4">Sem marcações</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {dayBookings
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .map((booking) => (
                                <button
                                  key={booking.id}
                                  onClick={() => setSelectedBooking(booking)}
                                  className="text-left border border-gray-200 rounded-lg p-3 hover:border-black transition-colors"
                                >
                                  <p className="font-bold text-black text-sm mb-1">{booking.time}</p>
                                  <p className="text-xs text-gray-700 font-medium truncate">{booking.name}</p>
                                  <p className="text-xs text-gray-500 truncate">✂️ {booking.barber}</p>
                                  <p className="text-xs text-gray-500 truncate">{booking.service}</p>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bookings List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-bold text-black mb-4">
                Marcações - {format(selectedDate, "d 'de' MMMM", { locale: pt })}
              </h3>

              {selectedDateBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Sem marcações para este dia
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedDateBookings
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-black transition-colors cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-black text-lg">{booking.time}</p>
                            <p className="text-sm text-gray-600">{booking.service}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : booking.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : booking.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-black">👤 {booking.name}</p>
                          <p className="text-xs text-gray-600">✂️ {booking.barber}</p>
                          <p className="text-xs text-gray-500">📞 {booking.phone}</p>
                          {booking.email && (
                            <p className="text-xs text-gray-500">📧 {booking.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Booking Details Modal */}
              {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-black">Detalhes da Marcação</h3>
                      <button
                        onClick={() => setSelectedBooking(null)}
                        className="text-gray-500 hover:text-black"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div>
                        <p className="text-xs text-gray-500">Serviço</p>
                        <p className="font-medium text-black">{selectedBooking.service}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Barbeiro</p>
                        <p className="font-medium text-black">{selectedBooking.barber}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Data</p>
                          <p className="font-medium text-black">
                            {format(parseISO(selectedBooking.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Hora</p>
                          <p className="font-medium text-black">{selectedBooking.time}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cliente</p>
                        <p className="font-medium text-black">{selectedBooking.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Telefone</p>
                        <p className="font-medium text-black">{selectedBooking.phone}</p>
                      </div>
                      {selectedBooking.email && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="font-medium text-black">{selectedBooking.email}</p>
                        </div>
                      )}
                      {selectedBooking.observations && (
                        <div>
                          <p className="text-xs text-gray-500">Observações</p>
                          <p className="font-medium text-black">{selectedBooking.observations}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Criado por</p>
                        <p className="font-medium text-black">{selectedBooking.created_by}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() =>
                            handleUpdateStatus(selectedBooking.id, "confirmed")
                          }
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Confirmar
                        </Button>
                        <Button
                          onClick={() =>
                            handleUpdateStatus(selectedBooking.id, "completed")
                          }
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Concluído
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleDeleteBooking(selectedBooking.id)}
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                      >
                        Eliminar Marcação
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Booking Modal */}
      {showNewBookingForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-black">Nova Marcação</h3>
              <button
                onClick={() => {
                  setShowNewBookingForm(false);
                  setBookingStep(1);
                  setNewBooking({
                    service: "Cabelo",
                    barber: "Edgar",
                    date: format(new Date(), "yyyy-MM-dd"),
                    time: "",
                    name: "",
                    phone: "",
                    email: "",
                    observations: "",
                  });
                }}
                className="text-gray-500 hover:text-black text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center flex-1">
                <motion.div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold`}
                  animate={{
                    backgroundColor: bookingStep >= 1 ? "#000000" : "#E5E7EB",
                    color: bookingStep >= 1 ? "#FFFFFF" : "#6B7280",
                    scale: bookingStep === 1 ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  1
                </motion.div>
                <motion.div 
                  className="flex-1 h-1 mx-2"
                  animate={{
                    backgroundColor: bookingStep >= 2 ? "#000000" : "#E5E7EB",
                    scaleX: bookingStep >= 2 ? 1 : 0.8
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ originX: 0 }}
                ></motion.div>
              </div>
              <div className="flex items-center flex-1">
                <motion.div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold`}
                  animate={{
                    backgroundColor: bookingStep >= 2 ? "#000000" : "#E5E7EB",
                    color: bookingStep >= 2 ? "#FFFFFF" : "#6B7280",
                    scale: bookingStep === 2 ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  2
                </motion.div>
                <motion.div 
                  className="flex-1 h-1 mx-2"
                  animate={{
                    backgroundColor: bookingStep >= 3 ? "#000000" : "#E5E7EB",
                    scaleX: bookingStep >= 3 ? 1 : 0.8
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ originX: 0 }}
                ></motion.div>
              </div>
              <div className="flex items-center">
                <motion.div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold`}
                  animate={{
                    backgroundColor: bookingStep >= 3 ? "#000000" : "#E5E7EB",
                    color: bookingStep >= 3 ? "#FFFFFF" : "#6B7280",
                    scale: bookingStep === 3 ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  3
                </motion.div>
              </div>
            </div>

            <div className="mb-4 text-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={bookingStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-gray-600"
                >
                  {bookingStep === 1 && "Passo 1: Serviço e Data"}
                  {bookingStep === 2 && "Passo 2: Selecione o Horário"}
                  {bookingStep === 3 && "Passo 3: Dados do Cliente"}
                </motion.p>
              </AnimatePresence>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Service and Date */}
                {bookingStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Serviço
                    </label>
                    <Select
                      value={newBooking.service}
                      onValueChange={(value) =>
                        setNewBooking({ ...newBooking, service: value })
                      }
                    >
                      <SelectTrigger className="text-base p-6 w-full">
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cabelo">Cabelo</SelectItem>
                        <SelectItem value="Barba">Barba</SelectItem>
                        <SelectItem value="Cabelo e Barba">Cabelo e Barba</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Barbeiro
                    </label>
                    <Select
                      value={newBooking.barber}
                      onValueChange={(value) =>
                        setNewBooking({ ...newBooking, barber: value })
                      }
                    >
                      <SelectTrigger className="text-base p-6 w-full">
                        <SelectValue placeholder="Selecione o barbeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeBarbers.map((barber) => (
                          <SelectItem key={barber.id} value={barber.name}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Data
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal text-base p-6 ${
                            !newBooking.date && "text-muted-foreground"
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-5 w-5" />
                          {newBooking.date ? (
                            format(new Date(newBooking.date), "PPP", { locale: pt })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newBooking.date ? new Date(newBooking.date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setNewBooking({ 
                                ...newBooking, 
                                date: format(date, "yyyy-MM-dd"),
                                time: "" 
                              });
                            }
                          }}
                          locale={pt}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => setBookingStep(2)}
                        className="bg-black hover:bg-black/80 text-white text-base px-8 py-6"
                      >
                        Próximo →
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Time Selection */}
                {bookingStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-3">
                      Horário Disponível <span className="text-red-500">*</span>
                    </label>
                    {availableSlots.length === 0 ? (
                      <div className="p-8 bg-gray-100 rounded-md text-center text-gray-600">
                        Sem horários disponíveis para esta data
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto p-4 border border-gray-300 rounded-md">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setNewBooking({ ...newBooking, time: slot })}
                            className={`p-4 text-base font-medium rounded-lg transition-all ${
                              newBooking.time === slot
                                ? "bg-black text-white ring-2 ring-black"
                                : "bg-gray-100 hover:bg-gray-200 text-black"
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mt-3">
                      Horários: 08:30-13:00 (manhã) e 15:00-18:30 (tarde) • Slots de 30 minutos
                    </p>
                  </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        variant="outline"
                        className="flex-1 text-base py-6"
                      >
                        ← Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (!newBooking.time) {
                            toast.error("Por favor selecione um horário");
                            return;
                          }
                          setBookingStep(3);
                        }}
                        className="flex-1 bg-black hover:bg-black/80 text-white text-base py-6"
                      >
                        Próximo →
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Client Details */}
                {bookingStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={newBooking.name}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, name: e.target.value })
                      }
                      className="text-base p-6"
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Telefone <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={newBooking.phone}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, phone: e.target.value })
                      }
                      className="text-base p-6"
                      placeholder="+351 XXX XXX XXX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Email <span className="text-gray-400 text-sm">(opcional - necessário para lembretes)</span>
                    </label>
                    <Input
                      type="email"
                      value={newBooking.email}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, email: e.target.value })
                      }
                      className="text-base p-6"
                      placeholder="email@exemplo.com"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Se fornecer email, o cliente receberá confirmação e lembretes automáticos
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Observações <span className="text-gray-400 text-sm">(opcional)</span>
                    </label>
                    <Textarea
                      value={newBooking.observations}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, observations: e.target.value })
                      }
                      rows={3}
                      className="text-base p-3"
                      placeholder="Notas adicionais sobre a marcação..."
                    />
                  </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        onClick={() => setBookingStep(2)}
                        variant="outline"
                        className="flex-1 text-base py-6"
                        disabled={isCreatingBooking}
                      >
                        ← Voltar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-black hover:bg-black/80 text-white text-base py-6 font-bold"
                        disabled={isCreatingBooking}
                      >
                        {isCreatingBooking ? (
                          <span className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            A criar...
                          </span>
                        ) : (
                          "Criar Marcação"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

