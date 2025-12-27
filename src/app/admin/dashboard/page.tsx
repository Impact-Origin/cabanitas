"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

// Translation functions
const translateStatus = (status: string): string => {
  const translations: { [key: string]: string } = {
    'pending': 'Pendente',
    'confirmed': 'Confirmado',
    'completed': 'Concluído',
    'cancelled': 'Cancelado',
  };
  return translations[status] || status;
};

const translateCreatedBy = (createdBy: string): string => {
  const translations: { [key: string]: string } = {
    'client': 'Cliente',
    'admin': 'Admin',
  };
  return translations[createdBy] || createdBy;
};

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
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  const activeBarbers = getActiveBarbers();

  // Load holidays (always, regardless of barber selection)
  useEffect(() => {
    loadHolidays();
  }, []);

  // Reload holidays when page gains focus (user returns from holidays page)
  useEffect(() => {
    const handleFocus = () => {
      loadHolidays();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Load blocked dates when barber changes (vacations)
  useEffect(() => {
    if (selectedBarber && selectedBarber !== "all") {
      loadBarberVacations(selectedBarber);
    } else {
      setBlockedDates(new Set());
    }
  }, [selectedBarber]);

  // Load holidays (barbershop closed days)
  const loadHolidays = async () => {
    try {
      const closedHolidays = new Set<string>();
      const holidaysResponse = await fetch(`/api/holidays`);

      if (!holidaysResponse.ok) {
        throw new Error(`HTTP error! status: ${holidaysResponse.status}`);
      }

      const holidaysData = await holidaysResponse.json();
      console.log("📅 Loading holidays:", holidaysData);

      if (!holidaysData || !Array.isArray(holidaysData.holidays)) {
        console.warn("⚠️ Invalid holidays data format:", holidaysData);
        setHolidays(new Set());
        return;
      }

      holidaysData.holidays.forEach((h: any) => {
        // Block holiday if barbershop is closed (is_working = false)
        if (!h.is_working && h.date) {
          // Date should already be normalized by API, but handle edge cases
          let dateStr: string;
          if (typeof h.date === 'string') {
            // If it's a string, extract YYYY-MM-DD part
            if (h.date.includes('T')) {
              dateStr = h.date.split('T')[0];
            } else if (h.date.includes(' ')) {
              dateStr = h.date.split(' ')[0];
            } else {
              // Should already be YYYY-MM-DD
              dateStr = h.date;
            }
          } else if (h.date) {
            // If it's a Date object or number, convert to YYYY-MM-DD
            const d = new Date(h.date);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              dateStr = `${year}-${month}-${day}`;
            } else {
              console.warn("⚠️ Invalid date format:", h.date);
              return;
            }
          } else {
            console.warn("⚠️ Missing date for holiday:", h);
            return;
          }

          // Validate date format
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            closedHolidays.add(dateStr);
            console.log("🚫 Blocked holiday:", dateStr, "from:", h.date, "is_working:", h.is_working);
          } else {
            console.warn("⚠️ Invalid date format after normalization:", dateStr, "from:", h.date);
          }
        }
      });
      console.log("📅 Closed holidays set:", Array.from(closedHolidays).sort());
      setHolidays(closedHolidays);
    } catch (error) {
      console.error("Error loading holidays:", error);
      toast.error("Erro ao carregar feriados");
      // Set empty set on error to prevent blocking all dates
      setHolidays(new Set());
    }
  };

  // Load blocked dates (vacations for specific barber)
  const loadBarberVacations = async (barber: string) => {
    try {
      const blocked = new Set<string>();
      const vacationsResponse = await fetch(`/api/vacations?barber=${barber}`);
      const vacationsData = await vacationsResponse.json();
      (vacationsData.vacations || []).forEach((v: any) => {
        // Normalize dates to YYYY-MM-DD format (avoid timezone issues)
        const startDateStr = v.start_date.includes('T') ? v.start_date.split('T')[0] : v.start_date;
        const endDateStr = v.end_date.includes('T') ? v.end_date.split('T')[0] : v.end_date;

        // Parse dates and iterate through them
        const start = new Date(startDateStr + 'T12:00:00'); // Use noon to avoid timezone issues
        const end = new Date(endDateStr + 'T12:00:00');
        const current = new Date(start);

        while (current <= end) {
          // Format in local timezone
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          blocked.add(`${year}-${month}-${day}`);
          current.setDate(current.getDate() + 1);
        }
      });
      setBlockedDates(blocked);
    } catch (error) {
      console.error("Error loading blocked dates:", error);
    }
  };

  // Check if a date should be disabled
  const isDateDisabled = (date: Date): boolean => {
    // Get date in local timezone (avoid UTC conversion issues)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Get today in local timezone
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

    // Block past dates
    if (dateStr < todayStr) {
      return true;
    }

    // Block Sundays (day 0)
    if (date.getDay() === 0) {
      return true;
    }

    // Block holidays when barbershop is closed (always, regardless of barber)
    if (holidays.has(dateStr)) {
      console.log("🚫 Date blocked (holiday):", dateStr, "Current holidays:", Array.from(holidays).sort());
      return true;
    } else {
      // Debug: log when checking a date that should be blocked
      if (dateStr === "2026-08-15") {
        console.log("🔍 Checking 2026-08-15 - holidays set:", Array.from(holidays).sort(), "has:", holidays.has(dateStr));
      }
    }

    // Block barber vacations (only if a specific barber is selected)
    if (selectedBarber && selectedBarber !== "all") {
      if (blockedDates.has(dateStr)) {
        return true;
      }
    }

    return false;
  };

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

  // Load blocked dates when barber changes in new booking form
  useEffect(() => {
    if (newBooking.barber && newBooking.barber !== "all") {
      loadBarberVacations(newBooking.barber);
    } else {
      setBlockedDates(new Set());
    }
  }, [newBooking.barber]);

  // Reload holidays when modal opens (to get latest updates from holidays page)
  useEffect(() => {
    if (showNewBookingForm) {
      // Force reload holidays when modal opens
      loadHolidays();
    }
  }, [showNewBookingForm]);

  // Also reload when booking step changes to step 1 (date selection)
  useEffect(() => {
    if (showNewBookingForm && bookingStep === 1) {
      loadHolidays();
    }
  }, [showNewBookingForm, bookingStep]);

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

  // Helper function to get next time slot (add 30 minutes)
  const getNextTimeSlot = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    let nextHours = hours;
    let nextMinutes = minutes + 30;
    
    if (nextMinutes >= 60) {
      nextMinutes = 0;
      nextHours += 1;
    }
    
    return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
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
      // Check if barber is on vacation
      const vacationsResponse = await fetch(`/api/vacations?barber=${barber}&startDate=${date}&endDate=${date}`);
      const vacationsData = await vacationsResponse.json();
      const isOnVacation = (vacationsData.vacations || []).some((v: any) => {
        const start = new Date(v.start_date);
        const end = new Date(v.end_date);
        const checkDate = new Date(date);
        return checkDate >= start && checkDate <= end;
      });

      // Check if it's a holiday and barbershop is closed
      const holidaysResponse = await fetch(`/api/holidays`);
      const holidaysData = await holidaysResponse.json();
      const holiday = (holidaysData.holidays || []).find((h: any) => h.date === date);
      const isHolidayClosed = holiday && !holiday.is_working;

      // If barber is on vacation or it's a closed holiday, no slots available
      if (isOnVacation || isHolidayClosed) {
        setAvailableSlots([]);
        return;
      }

      // Check if it's Saturday - only morning slots (08:30-13:00)
      const selectedDateObj = new Date(date);
      const selectedDay = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const isSaturday = selectedDay === 6;

      // Get all possible slots
      let allSlots = generateTimeSlots();

      // On Saturday, only show morning slots (08:30-13:00), block afternoon slots
      if (isSaturday) {
        allSlots = allSlots.filter(slot => {
          const hour = parseInt(slot.split(':')[0]);
          return hour < 13; // Only morning slots (before 13:00)
        });
      }

      // Get bookings for this date and barber
      const response = await fetch(`/api/bookings?date=${date}`);
      const data = await response.json();
      const dayBookings = (data.bookings || []).filter(
        (b: Booking) => b.barber === barber && b.status !== "cancelled"
      );

      // Helper to get previous time slot
      const getPreviousTimeSlot = (time: string): string => {
        const [hours, minutes] = time.split(':').map(Number);
        let prevHours = hours;
        let prevMinutes = minutes - 30;
        
        if (prevMinutes < 0) {
          prevMinutes = 30;
          prevHours -= 1;
        }
        
        if (prevHours < 0) {
          return ''; // No previous slot
        }
        
        return `${String(prevHours).padStart(2, '0')}:${String(prevMinutes).padStart(2, '0')}`;
      };
      
      // Count bookings per time slot
      // We need to count:
      // 1. Bookings that start at this slot (any duration)
      // 2. 1h bookings that started at previous slot (they occupy current slot too)
      const bookingsByTime: Record<string, number> = {};
      
      allSlots.forEach((slot) => {
        let count = 0;
        const prevSlot = getPreviousTimeSlot(slot);
        
        dayBookings.forEach((b: Booking) => {
          // Count bookings starting at this slot
          if (b.time === slot) {
            count++;
          }
          // Count 1h bookings from previous slot (they occupy this slot too)
          if (b.time === prevSlot && b.duration === "1h") {
            count++;
          }
        });
        
        bookingsByTime[slot] = count;
      });

      // Filter available slots: Admin dashboard creates 1-hour bookings by default
      // A slot is available if:
      // 1. Current slot has less than 2 bookings (allows double bookings)
      // 2. Next slot (current + 30min) has 0 bookings (can't overlap with existing 1-hour bookings)
      // 3. Next slot is within valid time range (not lunch time, not after closing)
      const available = allSlots.filter((slot) => {
        const currentCount = bookingsByTime[slot] || 0;
        const nextSlot = getNextTimeSlot(slot);
        const nextCount = bookingsByTime[nextSlot] || 0;
        
        // Check if next slot is within valid time range
        const [nextHours, nextMinutes] = nextSlot.split(':').map(Number);
        const [currentHours, currentMinutes] = slot.split(':').map(Number);
        
        // Block slots that would end at lunch time (13:00)
        // For example, 12:30 + 30min = 13:00 (lunch time, not allowed)
        if (currentHours === 12 && currentMinutes === 30) {
          return false; // Can't book 1 hour starting at 12:30 (would end at 13:00)
        }
        
        // Block slots that would end at closing time
        // For example, 18:30 + 30min = 19:00 (after closing, not allowed)
        if (currentHours === 18 && currentMinutes === 30) {
          return false; // Can't book 1 hour starting at 18:30 (would end at 19:00)
        }
        
        const isValidNextSlot = 
          (nextHours < 13 || (nextHours === 13 && nextMinutes === 0)) || // Morning
          (nextHours >= 15 && (nextHours < 18 || (nextHours === 18 && nextMinutes <= 30))); // Afternoon
        
        // On Saturday, next slot must be in morning
        if (isSaturday) {
          const isNextSlotInMorning = nextHours < 13 || (nextHours === 13 && nextMinutes === 0);
          if (!isNextSlotInMorning) {
            return false; // Can't book if next slot would be in afternoon on Saturday
          }
        }
        
        // Check if there's any 30min booking in current slot
        const has30minInCurrent = dayBookings.some((b: Booking) => 
          b.time === slot && b.duration === "30min"
        );
        
        // If there's a 30min booking, can't book 1h here
        if (has30minInCurrent) {
          return false;
        }
        
        // Check if current slot is occupied by a 1h booking from previous slot
        const prevSlot = getPreviousTimeSlot(slot);
        const has1hFromPrevSlot = dayBookings.some((b: Booking) => 
          b.time === prevSlot && b.duration === "1h"
        );
        
        // If current slot is occupied by a 1h booking from previous slot, can't book here
        if (has1hFromPrevSlot) {
          return false;
        }
        
        // Count how many 1h bookings START at this slot (not including ones from previous slot)
        const oneHourBookingsStartingHere = dayBookings.filter((b: Booking) => 
          b.time === slot && b.duration === "1h"
        ).length;
        
        // Can add a 1h booking if:
        // 1. Less than 2 bookings starting at this slot (allows double booking)
        // 2. Next slot is completely free (needed for the 1h duration)
        return oneHourBookingsStartingHere < 2 && nextCount === 0 && isValidNextSlot;
      });

      setAvailableSlots(available);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      setAvailableSlots([]);
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

  const handleDeleteBookingClick = (booking: Booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBookingConfirm = async () => {
    if (!bookingToDelete) return;

    try {
      const response = await fetch(`/api/bookings?id=${bookingToDelete.id}`, {
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
    } finally {
      setBookingToDelete(null);
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
    // Format date to YYYY-MM-DD (use local timezone)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

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
      <div className="grid grid-cols-7 gap-2 md:gap-3 lg:gap-4">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
          <div key={day} className="text-center text-sm md:text-base lg:text-lg font-medium text-gray-600 py-2 md:py-3">
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
          const isDisabled = isDateDisabled(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isDisabled && setSelectedDate(day)}
              disabled={isDisabled}
              className={`aspect-square p-2 md:p-3 lg:p-4 rounded-lg border-2 transition-all min-h-[48px] md:min-h-[64px] lg:min-h-[80px] ${isDisabled
                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                : isSelected
                  ? "bg-black text-white border-black"
                  : isToday
                    ? "bg-gray-100 border-gray-300"
                    : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
            >
              <div className="text-sm md:text-base lg:text-lg font-medium">{format(day, "d")}</div>
              {dayBookings.length > 0 && !isDisabled && (
                <div className="mt-1 md:mt-2">
                  <div
                    className={`text-xs md:text-sm lg:text-base font-semibold ${isSelected ? "text-white" : "text-black"
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
      <AdminNav />

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        {/* Dashboard Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: Filter and New Booking Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
              {/* Barber Filter */}
              <div className="flex-1 sm:flex-initial">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  Filtrar por Barbeiro
                </label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger className="w-full sm:w-[200px] md:w-[220px] lg:w-[240px] h-[42px] md:h-[46px] text-sm md:text-base border-gray-300 bg-white hover:bg-gray-50">
                    <SelectValue placeholder="Selecionar barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Barbeiros</SelectItem>
                    {activeBarbers && activeBarbers.length > 0 && activeBarbers.map((barber) => (
                      barber && barber.id && barber.name ? (
                        <SelectItem key={barber.id} value={barber.name}>
                          {barber.name || String(barber.id)}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* New Booking Button */}
              <div className="flex-1 sm:flex-initial">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 opacity-0 pointer-events-none">
                  Ação
                </label>
                <Button
                  onClick={() => {
                    setShowNewBookingForm(true);
                    setBookingStep(1);
                  }}
                  className="w-full sm:w-auto bg-black hover:bg-black/90 text-white text-sm md:text-base lg:text-lg px-5 md:px-7 lg:px-8 py-2.5 md:py-3 font-semibold h-[42px] md:h-[46px] shadow-sm hover:shadow-md transition-all"
                  size="sm"
                >
                  + Nova Marcação
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 lg:p-8">
              {/* Calendar Header */}
              <div className="mb-6 md:mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black">
                    {viewMode === "day"
                      ? format(currentMonth, "MMMM yyyy", { locale: pt })
                      : `Semana de ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: pt })}`
                    }
                  </h2>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
                      <Button
                        onClick={() => setViewMode("day")}
                        variant="ghost"
                        size="sm"
                        className={`text-xs md:text-sm lg:text-base px-3 md:px-4 lg:px-5 py-2 md:py-2.5 h-[36px] md:h-[40px] font-medium transition-all ${viewMode === "day"
                          ? "bg-black text-white hover:bg-black/90 shadow-sm"
                          : "text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        Mês
                      </Button>
                      <Button
                        onClick={() => setViewMode("week")}
                        variant="ghost"
                        size="sm"
                        className={`text-xs md:text-sm lg:text-base px-3 md:px-4 lg:px-5 py-2 md:py-2.5 h-[36px] md:h-[40px] font-medium transition-all ${viewMode === "week"
                          ? "bg-black text-white hover:bg-black/90 shadow-sm"
                          : "text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        Semana
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-2 md:gap-3">
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
                    className="text-xs md:text-sm lg:text-base px-4 md:px-5 lg:px-6 py-2 md:py-2.5 h-[40px] md:h-[44px] border-gray-300 hover:bg-gray-50 font-medium"
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
                    className="text-xs md:text-sm lg:text-base px-5 md:px-6 lg:px-8 py-2 md:py-2.5 h-[40px] md:h-[44px] border-gray-300 hover:bg-gray-50 font-medium bg-white"
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
                    className="text-xs md:text-sm lg:text-base px-4 md:px-5 lg:px-6 py-2 md:py-2.5 h-[40px] md:h-[44px] border-gray-300 hover:bg-gray-50 font-medium"
                  >
                    Seguinte →
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
                      <div key={day.toISOString()} className={`border-2 rounded-lg p-4 md:p-6 lg:p-8 ${isToday ? "border-black bg-gray-50" : "border-gray-200"}`}>
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                          <div>
                            <h3 className="font-bold text-lg md:text-xl lg:text-2xl text-black">
                              {format(day, "EEEE", { locale: pt })}
                            </h3>
                            <p className="text-sm md:text-base lg:text-lg text-gray-600">
                              {format(day, "d 'de' MMMM", { locale: pt })}
                            </p>
                          </div>
                          <span className="text-sm md:text-base lg:text-lg font-medium text-gray-600">
                            {dayBookings.length} marcação{dayBookings.length !== 1 ? "ões" : ""}
                          </span>
                        </div>

                        {dayBookings.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-4">Sem marcações</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                            {dayBookings
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .map((booking) => (
                                <button
                                  key={booking.id}
                                  onClick={() => setSelectedBooking(booking)}
                                  className="text-left border-2 border-gray-200 rounded-lg p-3 md:p-4 lg:p-5 hover:border-black transition-colors min-h-[80px] md:min-h-[100px]"
                                >
                                  <p className="font-bold text-black text-sm md:text-base lg:text-lg mb-1 md:mb-2">
                                    {booking.time}
                                    {booking.duration === "1h" && (
                                      <span className="ml-1 text-[10px] md:text-xs bg-black text-white px-1.5 py-0.5 rounded">1h</span>
                                    )}
                                  </p>
                                  <p className="text-xs md:text-sm lg:text-base text-gray-700 font-medium truncate mb-1">{booking.name}</p>
                                  <p className="text-xs md:text-sm text-gray-500 truncate">✂️ {booking.barber}</p>
                                  <p className="text-xs md:text-sm text-gray-500 truncate">{booking.service}</p>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 lg:p-8 sticky top-4">
              <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-black mb-4 md:mb-6">
                Marcações - {format(selectedDate, "d 'de' MMMM", { locale: pt })}
              </h3>

              {selectedDateBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8 md:py-10 text-sm md:text-base lg:text-lg">
                  Sem marcações para este dia
                </p>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {selectedDateBookings
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="border-2 border-gray-200 rounded-lg p-4 md:p-5 lg:p-6 hover:border-black transition-colors cursor-pointer min-h-[120px] md:min-h-[140px]"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-start justify-between mb-3 md:mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-black text-lg md:text-xl lg:text-2xl">{booking.time}</p>
                              {booking.duration === "1h" && (
                                <span className="text-xs md:text-sm bg-black text-white px-2 py-1 rounded font-medium">
                                  1 hora (2 pessoas)
                                </span>
                              )}
                              {booking.duration === "30min" && (
                                <span className="text-xs md:text-sm bg-gray-600 text-white px-2 py-1 rounded font-medium">
                                  30 min
                                </span>
                              )}
                            </div>
                            <p className="text-sm md:text-base lg:text-lg text-gray-600">{booking.service}</p>
                          </div>
                          <span
                            className={`text-xs md:text-sm lg:text-base px-2 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full font-medium ${booking.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : booking.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {translateStatus(booking.status)}
                          </span>
                        </div>
                        <div className="space-y-1 md:space-y-2">
                          <p className="text-sm md:text-base lg:text-lg font-medium text-black">👤 {booking.name}</p>
                          <p className="text-xs md:text-sm lg:text-base text-gray-600">✂️ {booking.barber}</p>
                          <p className="text-xs md:text-sm lg:text-base text-gray-500">📞 {booking.phone}</p>
                          {booking.email && (
                            <p className="text-xs md:text-sm lg:text-base text-gray-500">📧 {booking.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Booking Details Modal */}
              {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:p-6">
                  <div className="bg-white rounded-lg shadow-xl max-w-md md:max-w-lg lg:max-w-xl w-full p-6 md:p-8 lg:p-10 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-black">Detalhes da Marcação</h3>
                      <button
                        onClick={() => setSelectedBooking(null)}
                        className="text-gray-500 hover:text-black text-xl md:text-2xl lg:text-3xl w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                      <div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Serviço</p>
                        <p className="font-medium text-black text-sm md:text-base lg:text-lg">{selectedBooking.service}</p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Barbeiro</p>
                        <p className="font-medium text-black text-sm md:text-base lg:text-lg">{selectedBooking.barber}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div>
                          <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Data</p>
                          <p className="font-medium text-black text-sm md:text-base lg:text-lg">
                            {format(parseISO(selectedBooking.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Hora</p>
                          <p className="font-medium text-black text-sm md:text-base lg:text-lg">{selectedBooking.time}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Duração</p>
                        <p className="font-medium text-black text-sm md:text-base lg:text-lg">
                          {selectedBooking.duration === "1h" ? "1 hora (2 pessoas)" : "30 minutos"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Cliente</p>
                        <p className="font-medium text-black text-sm md:text-base lg:text-lg">{selectedBooking.name}</p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Telefone</p>
                        <p className="font-medium text-black text-sm md:text-base lg:text-lg">{selectedBooking.phone}</p>
                      </div>
                      {selectedBooking.email && (
                        <div>
                          <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Email</p>
                          <p className="font-medium text-black text-sm md:text-base lg:text-lg">{selectedBooking.email}</p>
                        </div>
                      )}
                      {selectedBooking.observations && (
                        <div>
                          <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Observações</p>
                          <p className="font-medium text-black text-sm md:text-base lg:text-lg">{selectedBooking.observations}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-500 mb-1">Criado por</p>
                        <p className="font-medium text-black text-sm md:text-base lg:text-lg">{translateCreatedBy(selectedBooking.created_by)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <Button
                          onClick={() =>
                            handleUpdateStatus(selectedBooking.id, "confirmed")
                          }
                          variant="outline"
                          size="sm"
                          className="text-xs md:text-sm lg:text-base px-3 md:px-4 lg:px-5 py-2 md:py-3 min-h-[44px] md:min-h-[48px]"
                        >
                          Confirmar
                        </Button>
                        <Button
                          onClick={() =>
                            handleUpdateStatus(selectedBooking.id, "completed")
                          }
                          variant="outline"
                          size="sm"
                          className="text-xs md:text-sm lg:text-base px-3 md:px-4 lg:px-5 py-2 md:py-3 min-h-[44px] md:min-h-[48px]"
                        >
                          Concluído
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleDeleteBookingClick(selectedBooking)}
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs md:text-sm lg:text-base px-3 md:px-4 lg:px-5 py-2 md:py-3 min-h-[44px] md:min-h-[48px]"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl md:max-w-3xl lg:max-w-4xl w-full p-6 md:p-8 lg:p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-black">Nova Marcação</h3>
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
                className="text-gray-500 hover:text-black text-xl md:text-2xl lg:text-3xl w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex items-center flex-1">
                <motion.div
                  className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full font-bold text-sm md:text-base lg:text-lg`}
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
                  className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full font-bold text-sm md:text-base lg:text-lg`}
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
                  className="flex-1 h-1 md:h-1.5 mx-2"
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
                  className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full font-bold text-sm md:text-base lg:text-lg`}
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

            <div className="mb-4 md:mb-6 text-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={bookingStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm md:text-base lg:text-lg text-gray-600"
                >
                  {bookingStep === 1 && "Passo 1: Serviço e Data"}
                  {bookingStep === 2 && "Passo 2: Selecione o Horário"}
                  {bookingStep === 3 && "Passo 3: Dados do Cliente"}
                </motion.p>
              </AnimatePresence>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-6 md:space-y-8">
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
                      <label className="block text-base md:text-lg lg:text-xl font-medium text-gray-700 mb-2 md:mb-3">
                        Serviço
                      </label>
                      <Select
                        value={newBooking.service}
                        onValueChange={(value) =>
                          setNewBooking({ ...newBooking, service: value })
                        }
                      >
                        <SelectTrigger className="text-base md:text-lg lg:text-xl p-4 md:p-5 lg:p-6 w-full h-[52px] md:h-[60px]">
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
                      <label className="block text-base md:text-lg lg:text-xl font-medium text-gray-700 mb-2 md:mb-3">
                        Barbeiro
                      </label>
                      <Select
                        value={newBooking.barber}
                        onValueChange={(value) =>
                          setNewBooking({ ...newBooking, barber: value })
                        }
                      >
                        <SelectTrigger className="text-base md:text-lg lg:text-xl p-4 md:p-5 lg:p-6 w-full h-[52px] md:h-[60px]">
                          <SelectValue placeholder="Selecione o barbeiro" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeBarbers && activeBarbers.length > 0 && activeBarbers.map((barber) => (
                            barber && barber.id && barber.name ? (
                              <SelectItem key={barber.id} value={barber.name}>
                                {barber.name || String(barber.id)}
                              </SelectItem>
                            ) : null
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Data
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            loadHolidays();
                            toast.info("Feriados atualizados");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          🔄 Atualizar
                        </Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal text-base p-6 ${!newBooking.date && "text-muted-foreground"
                              }`}
                          >
                            <CalendarIcon className="mr-2 h-5 w-5" />
                            {newBooking.date ? (
                              (() => {
                                // Parse YYYY-MM-DD string to Date in local timezone
                                const [year, month, day] = newBooking.date.split('-').map(Number);
                                return format(new Date(year, month - 1, day), "PPP", { locale: pt });
                              })()
                            ) : (
                              <span>Selecione a data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={() => loadHolidays()}>
                          <Calendar
                            mode="single"
                            selected={newBooking.date ? (() => {
                              // Parse YYYY-MM-DD string to Date in local timezone
                              const [year, month, day] = newBooking.date.split('-').map(Number);
                              return new Date(year, month - 1, day);
                            })() : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Format date to YYYY-MM-DD (use local timezone)
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const dateStr = `${year}-${month}-${day}`;
                                setNewBooking({
                                  ...newBooking,
                                  date: dateStr,
                                  time: ""
                                });
                              }
                            }}
                            locale={pt}
                            disabled={(date) => {
                              // Get date in local timezone (avoid UTC conversion issues)
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const dateStr = `${year}-${month}-${day}`;

                              // Get today in local timezone
                              const today = new Date();
                              const todayYear = today.getFullYear();
                              const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
                              const todayDay = String(today.getDate()).padStart(2, '0');
                              const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

                              // Block past dates
                              if (dateStr < todayStr) return true;

                              // Block Sundays
                              if (date.getDay() === 0) return true;

                              // Block holidays when barbershop is closed (always, regardless of barber)
                              const isBlocked = holidays.has(dateStr);
                              if (isBlocked) {
                                console.log("🚫 Date blocked (holiday in modal):", dateStr, "Current holidays:", Array.from(holidays).sort());
                                return true;
                              } else {
                                // Debug: log when checking a date that should be blocked
                                if (dateStr === "2026-08-15") {
                                  console.log("🔍 Modal checking 2026-08-15 - holidays set:", Array.from(holidays).sort(), "has:", holidays.has(dateStr));
                                }
                              }

                              // Block if barber is on vacation (only if a specific barber is selected)
                              if (newBooking.barber && newBooking.barber !== "all") {
                                if (blockedDates.has(dateStr)) {
                                  console.log("🚫 Date blocked (vacation):", dateStr);
                                  return true;
                                }
                              }

                              return false;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => setBookingStep(2)}
                        className="bg-black hover:bg-black/80 text-white text-base md:text-lg lg:text-xl px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 min-h-[48px] md:min-h-[52px] font-bold"
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
                      <label className="block text-base md:text-lg lg:text-xl font-medium text-gray-700 mb-3 md:mb-4">
                        Horário Disponível <span className="text-red-500">*</span>
                      </label>
                      {availableSlots.length === 0 ? (
                        <div className="p-6 md:p-8 lg:p-10 bg-gray-100 rounded-md text-center text-gray-600 text-sm md:text-base lg:text-lg">
                          Sem horários disponíveis para esta data
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 max-h-96 overflow-y-auto p-4 md:p-5 border-2 border-gray-300 rounded-md">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setNewBooking({ ...newBooking, time: slot })}
                              className={`p-3 md:p-4 lg:p-5 text-sm md:text-base lg:text-lg font-medium rounded-lg transition-all min-h-[52px] md:min-h-[60px] ${newBooking.time === slot
                                ? "bg-black text-white ring-2 ring-black"
                                : "bg-gray-100 hover:bg-gray-200 text-black"
                                }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs md:text-sm lg:text-base text-gray-500 mt-3 md:mt-4">
                        Horários: 08:30-13:00 (manhã) e 15:00-18:30 (tarde) • Slots de 30 minutos
                      </p>
                    </div>

                    <div className="flex gap-3 md:gap-4">
                      <Button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        variant="outline"
                        className="flex-1 text-base md:text-lg lg:text-xl py-3 md:py-4 lg:py-5 min-h-[48px] md:min-h-[52px] font-medium"
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
                        className="flex-1 bg-black hover:bg-black/80 text-white text-base md:text-lg lg:text-xl py-3 md:py-4 lg:py-5 min-h-[48px] md:min-h-[52px] font-bold"
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
                      <label className="block text-base md:text-lg lg:text-xl font-medium text-gray-700 mb-2 md:mb-3">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={newBooking.name}
                        onChange={(e) =>
                          setNewBooking({ ...newBooking, name: e.target.value })
                        }
                        className="text-base md:text-lg lg:text-xl p-4 md:p-5 lg:p-6 h-[52px] md:h-[60px]"
                        placeholder="Nome do cliente"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-base md:text-lg lg:text-xl font-medium text-gray-700 mb-2 md:mb-3">
                        Telefone <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        value={newBooking.phone}
                        onChange={(e) =>
                          setNewBooking({ ...newBooking, phone: e.target.value })
                        }
                        className="text-base md:text-lg lg:text-xl p-4 md:p-5 lg:p-6 h-[52px] md:h-[60px]"
                        placeholder="+351 XXX XXX XXX"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-base md:text-lg lg:text-xl font-medium text-gray-700 mb-2 md:mb-3">
                        Email <span className="text-gray-400 text-xs md:text-sm">(opcional - necessário para lembretes)</span>
                      </label>
                      <Input
                        type="email"
                        value={newBooking.email}
                        onChange={(e) =>
                          setNewBooking({ ...newBooking, email: e.target.value })
                        }
                        className="text-base md:text-lg lg:text-xl p-4 md:p-5 lg:p-6 h-[52px] md:h-[60px]"
                        placeholder="email@exemplo.com"
                      />
                      <p className="text-xs md:text-sm lg:text-base text-gray-500 mt-1 md:mt-2">
                        Se fornecer email, o cliente receberá confirmação e lembretes automáticos
                      </p>
                    </div>

                    <div>
                      <label className="block text-base md:text-lg lg:text-xl font-medium text-gray-700 mb-2 md:mb-3">
                        Observações <span className="text-gray-400 text-xs md:text-sm">(opcional)</span>
                      </label>
                      <Textarea
                        value={newBooking.observations}
                        onChange={(e) =>
                          setNewBooking({ ...newBooking, observations: e.target.value })
                        }
                        rows={4}
                        className="text-base md:text-lg lg:text-xl p-4 md:p-5 lg:p-6 min-h-[100px] md:min-h-[120px]"
                        placeholder="Notas adicionais sobre a marcação..."
                      />
                    </div>

                    <div className="flex gap-3 md:gap-4 pt-4 md:pt-6">
                      <Button
                        type="button"
                        onClick={() => setBookingStep(2)}
                        variant="outline"
                        className="flex-1 text-base md:text-lg lg:text-xl py-3 md:py-4 lg:py-5 min-h-[48px] md:min-h-[52px] font-medium"
                        disabled={isCreatingBooking}
                      >
                        ← Voltar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-black hover:bg-black/80 text-white text-base md:text-lg lg:text-xl py-3 md:py-4 lg:py-5 min-h-[48px] md:min-h-[52px] font-bold"
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

      {/* Delete Booking Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Marcação"
        description={`Tem a certeza que deseja eliminar a marcação de ${bookingToDelete?.name} no dia ${bookingToDelete ? format(parseISO(bookingToDelete.date), "dd/MM/yyyy", { locale: pt }) : ""} às ${bookingToDelete?.time}? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteBookingConfirm}
        variant="destructive"
      />
    </div>
  );
}


