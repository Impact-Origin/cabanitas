"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getActiveBarbers } from "@/config/barbers";
import { toast } from "sonner";

type Step = "service" | "barber" | "datetime" | "details" | "confirmation";

interface BookingData {
  service: string;
  barber: string;
  date: Date | null;
  time: string;
  duration: "30min" | "1h"; // Duration of the booking
  name: string;
  phone: string;
  email: string;
  observations: string;
  acceptTerms: boolean;
  acceptMarketing: boolean;
}

const services = [
  { id: "cabelo", name: "Cabelo" },
  { id: "barba", name: "Barba" },
  { id: "cabelo-barba", name: "Cabelo e Barba" },
];

export function BookingWizard() {
  const barbers = getActiveBarbers();
  const [step, setStep] = useState<Step>("service");
  const [bookingData, setBookingData] = useState<BookingData>({
    service: "",
    barber: "",
    date: null,
    time: "",
    duration: "30min", // Default to 30 minutes
    name: "",
    phone: "",
    email: "",
    observations: "",
    acceptTerms: false,
    acceptMarketing: false,
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [isLoadingBlockedDates, setIsLoadingBlockedDates] = useState(false);

  const handleServiceSelect = (serviceId: string) => {
    setBookingData({ ...bookingData, service: serviceId });
    setStep("barber");
  };

  const handleBarberSelect = (barberId: string) => {
    setBookingData({ ...bookingData, barber: barberId });
    setStep("datetime");
    // Load blocked dates when barber is selected
    if (barberId && barberId !== "no-preference") {
      loadBlockedDates(barberId);
    }
  };

  // Load blocked dates (vacations, holidays, weekends)
  const loadBlockedDates = async (barberId: string) => {
    setIsLoadingBlockedDates(true);
    try {
      const barberName = barbers.find((b) => b.id === barberId)?.name || "";
      const blocked = new Set<string>();

      // Fetch vacations for this barber
      const vacationsResponse = await fetch(`/api/vacations?barber=${barberName}`);
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

      // Fetch holidays
      const holidaysResponse = await fetch(`/api/holidays`);
      const holidaysData = await holidaysResponse.json();
      (holidaysData.holidays || []).forEach((h: any) => {
        // Block holiday if barbershop is closed (is_working = false)
        if (!h.is_working) {
          // Normalize date format to YYYY-MM-DD
          const dateStr = h.date.includes('T') ? h.date.split('T')[0] : h.date;
          blocked.add(dateStr);
        }
      });

      setBlockedDates(blocked);
    } catch (error) {
      console.error("Error loading blocked dates:", error);
    } finally {
      setIsLoadingBlockedDates(false);
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

    // Block Saturdays afternoon (day 6) - we'll handle this in time slots
    // Saturday only opens in the morning (08:30-13:00)

    // Check if date is in blocked dates (vacations, closed holidays)
    if (blockedDates.has(dateStr)) {
      return true;
    }

    return false;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setBookingData({ ...bookingData, date, time: "" });
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

  // Generate all possible time slots
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
    
    // Afternoon slots: 15:30 - 18:30
    hour = 15;
    minute = 30;
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

  // Fetch available slots when date, barber, or duration changes
  useEffect(() => {
    if (selectedDate && bookingData.barber && bookingData.duration) {
      fetchAvailableSlots();
    }
  }, [selectedDate, bookingData.barber, bookingData.duration]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;
    
    setIsLoadingSlots(true);
    try {
      // Format date to YYYY-MM-DD (use local timezone)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      const barberName = bookingData.barber === "no-preference" 
        ? "Sem Preferência" 
        : barbers.find((b) => b.id === bookingData.barber)?.name || "Edgar";
      
      // Check if barber is on vacation
      const vacationsResponse = await fetch(`/api/vacations?barber=${barberName}&startDate=${formattedDate}&endDate=${formattedDate}`);
      const vacationsData = await vacationsResponse.json();
      const isOnVacation = (vacationsData.vacations || []).some((v: any) => {
        const start = new Date(v.start_date);
        const end = new Date(v.end_date);
        const checkDate = new Date(formattedDate);
        return checkDate >= start && checkDate <= end;
      });

      // Check if it's a holiday and barbershop is closed
      const holidaysResponse = await fetch(`/api/holidays`);
      const holidaysData = await holidaysResponse.json();
      const holiday = (holidaysData.holidays || []).find((h: any) => h.date === formattedDate);
      const isHolidayClosed = holiday && !holiday.is_working;

      // If barber is on vacation or it's a closed holiday, no slots available
      if (isOnVacation || isHolidayClosed) {
        setAvailableSlots([]);
        return;
      }

      // Check if it's Saturday - only morning slots (08:30-13:00)
      const selectedDay = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
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
      
      // Get bookings for this date
      const response = await fetch(`/api/bookings?date=${formattedDate}`);
      const data = await response.json();
      
      // Filter bookings for this barber
      const dayBookings = (data.bookings || []).filter(
        (b: any) => b.barber === barberName && b.status !== "cancelled"
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
        
        dayBookings.forEach((b: any) => {
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
      
      // Filter available slots based on selected duration
      const currentDuration = bookingData.duration || "1h";
      
      const available = allSlots.filter((slot) => {
        const currentCount = bookingsByTime[slot] || 0;
        const [currentHours, currentMinutes] = slot.split(':').map(Number);
        
        // If duration is 30 minutes, check if slot is completely free (no bookings)
        // 30min bookings are for 1 person only, no double booking
        if (currentDuration === "30min") {
          // For 30-minute bookings, slot must be completely free (0 bookings)
          return currentCount === 0;
        }
        
        // If duration is 1 hour, check both current and next slots
        // FIRST: Block 12:30 for 1-hour bookings (would end at 13:00, lunch time)
        if (currentHours === 12 && currentMinutes === 30) {
          return false; // Can't book 1 hour starting at 12:30 (would end at 13:00)
        }
        
        // Block 18:30 for 1-hour bookings (would end at 19:00, after closing)
        if (currentHours === 18 && currentMinutes === 30) {
          return false; // Can't book 1 hour starting at 18:30 (would end at 19:00)
        }
        
        const nextSlot = getNextTimeSlot(slot);
        const nextCount = bookingsByTime[nextSlot] || 0;
        
        // Check if next slot is within valid time range
        const [nextHours, nextMinutes] = nextSlot.split(':').map(Number);
        
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
        
        // For 1h bookings:
        // - Current slot must have space for a 1h booking
        // - Next slot must be completely free (0 bookings)
        // 
        // Important: currentCount already includes:
        // 1. Bookings starting at current slot (any duration)
        // 2. 1h bookings from previous slot (they occupy current slot too)
        //
        // So if currentCount >= 1, it means:
        // - Either there's already a booking starting here
        // - Or there's a 1h booking from previous slot occupying this slot
        // In both cases, we can still add ONE more 1h booking (double booking)
        //
        // But we need to check what TYPE of bookings are in the current slot:
        // - If there's a 1h booking starting here → can add another 1h (double)
        // - If there's a 1h booking from previous slot → can't add (would need current+next free)
        // - If there's a 30min booking → can't add 1h (30min takes the whole slot alone)
        
        // Check if there's any 30min booking in current slot
        const has30minInCurrent = dayBookings.some((b: any) => 
          b.time === slot && b.duration === "30min"
        );
        
        // If there's a 30min booking, can't book 1h here
        if (has30minInCurrent) {
          return false;
        }
        
        // Check if current slot is occupied by a 1h booking from previous slot
        const prevSlot = getPreviousTimeSlot(slot);
        const has1hFromPrevSlot = dayBookings.some((b: any) => 
          b.time === prevSlot && b.duration === "1h"
        );
        
        // If current slot is occupied by a 1h booking from previous slot, can't book here
        if (has1hFromPrevSlot) {
          return false;
        }
        
        // Check how many 1h bookings START at this slot (not including ones from previous slot)
        const oneHourBookingsStartingHere = dayBookings.filter((b: any) => 
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
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setBookingData({ ...bookingData, time });
  };

  const handleContinueToDetails = () => {
    if (bookingData.date && bookingData.time) {
      setStep("details");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingData.name || !bookingData.phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      // Format date to YYYY-MM-DD (use local timezone)
      const formattedDate = bookingData.date
        ? (() => {
            const year = bookingData.date.getFullYear();
            const month = String(bookingData.date.getMonth() + 1).padStart(2, '0');
            const day = String(bookingData.date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })()
        : "";

      // Get service and barber names
      const serviceName = services.find((s) => s.id === bookingData.service)?.name || "";
      const barberName = bookingData.barber === "no-preference" 
        ? "Sem Preferência" 
        : barbers.find((b) => b.id === bookingData.barber)?.name || "";

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service: serviceName,
          barber: barberName,
          date: formattedDate,
          time: bookingData.time,
          duration: bookingData.duration,
          name: bookingData.name,
          phone: bookingData.phone,
          email: bookingData.email || null,
          observations: bookingData.observations || null,
          created_by: "client",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Marcação criada com sucesso!");
        setStep("confirmation");
      } else {
        toast.error(data.message || "Erro ao criar marcação. Por favor, tente novamente.");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Erro ao criar marcação. Por favor, tente novamente.");
    }
  };

  const goBack = () => {
    const steps: Step[] = ["service", "barber", "datetime", "details", "confirmation"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Calendar rendering
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Adjust for Monday start (0 = Sunday, we want Monday = 0)
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < adjustedStartDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isDisabled = isDateDisabled(date);
      const isSelected =
        selectedDate &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && handleDateSelect(date)}
          disabled={isDisabled}
          className={`p-2 text-sm rounded-full text-center transition-all ${
            isDisabled
              ? "text-gray-300 cursor-not-allowed"
              : isSelected
              ? "bg-black text-white font-semibold"
              : "hover:bg-gray-100 text-black"
          }`}
        >
          {String(day).padStart(2, '0')}
        </button>
      );
    }

    return days;
  };

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border border-gray-200 shadow-md rounded-xl overflow-hidden bg-white">
        {/* Header */}
        <CardHeader className="bg-white border-b border-gray-200 relative py-5 px-6">
          {step !== "service" && step !== "confirmation" && (
            <button
              onClick={goBack}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-black hover:opacity-60 transition-opacity text-xl"
            >
              ←
            </button>
          )}
          <CardTitle className="text-xl text-center text-black font-semibold">
            Nova Marcação
          </CardTitle>
          <p className="text-center text-gray-500 mt-1 text-xs">
            {step === "service" && "Escolha um serviço"}
            {step === "barber" && "Escolha um profissional"}
            {step === "datetime" && "Escolha um dia"}
            {step === "details" && "Confirmar marcação"}
            {step === "confirmation" && "Marcação confirmada"}
          </p>
        </CardHeader>

        <CardContent className="p-0 bg-white overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Service Selection */}
            {step === "service" && (
              <motion.div
                key="service"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="divide-y divide-gray-200"
              >
                {services.map((service, index) => (
                  <motion.button
                    key={service.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleServiceSelect(service.id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-base font-medium text-black">
                      {service.name}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Step 2: Barber Selection */}
            {step === "barber" && (
              <motion.div
                key="barber"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="divide-y divide-gray-200">
                <button
                  onClick={() => handleBarberSelect("edgar")}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base text-black">Sem preferência</p>
                    <span className="text-gray-300">›</span>
                  </div>
                </button>
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => handleBarberSelect(barber.id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          {barber.name.charAt(0)}
                        </div>
                        <h3 className="text-base text-black">
                          {barber.name}
                        </h3>
                      </div>
                      <span className="text-gray-300">›</span>
                    </div>
                  </button>
                ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Date & Time Selection */}
            {step === "datetime" && (
              <motion.div
                key="datetime"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-6 space-y-4">

              {/* Calendar */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() - 1
                        )
                      )
                    }
                    className="p-2 hover:bg-gray-50 rounded-full transition-colors text-black"
                  >
                    ←
                  </button>
                  <h3 className="text-lg font-semibold text-black">
                    {monthNames[currentMonth.getMonth()]}{" "}
                    {currentMonth.getFullYear()}
                  </h3>
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1
                        )
                      )
                    }
                    className="p-2 hover:bg-gray-50 rounded-full transition-colors text-black"
                  >
                    →
                  </button>
                </div>

                {/* Days of week */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-gray-400 py-2"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
              </div>

              {/* Duration Selection */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-3 text-center">
                      Duração da Marcação
                        </h4>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                        onClick={() => {
                          // Just update the state, useEffect will handle fetching
                          setBookingData({ ...bookingData, duration: "30min" as const, time: "" });
                        }}
                        className={`p-3 rounded-lg border transition-all text-sm font-medium cursor-pointer ${
                          bookingData.duration === "30min"
                                  ? "bg-black text-white border-black"
                            : "border-gray-200 hover:bg-gray-50 text-black"
                              }`}
                            >
                        30 minutos
                            </button>
                      <button
                        onClick={() => {
                          // Just update the state, useEffect will handle fetching
                          setBookingData({ ...bookingData, duration: "1h" as const, time: "" });
                        }}
                        className={`p-3 rounded-lg border transition-all text-sm font-medium cursor-pointer ${
                          bookingData.duration === "1h"
                            ? "bg-black text-white border-black"
                            : "border-gray-200 hover:bg-gray-50 text-black"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>1 hora completa</span>
                          <span className="text-[10px] mt-0.5 opacity-75">
                            (2 pessoas)
                          </span>
                        </div>
                      </button>
                      </div>
                  </div>
                </motion.div>
                    )}

              {/* Time slots */}
              {selectedDate && bookingData.duration && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-center mb-3">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">
                        Horários Disponíveis
                        </h4>
                    </div>
                    
                    {isLoadingSlots ? (
                      <div className="text-center py-8 text-gray-500">
                        A carregar horários...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Sem horários disponíveis para esta data
                      </div>
                    ) : (
                      <>
                        {/* Morning slots */}
                        {availableSlots.filter(slot => {
                          const hour = parseInt(slot.split(':')[0]);
                          return hour >= 8 && hour < 13;
                        }).length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium text-gray-500 mb-2 text-center">
                              Manhã (08:30 - 13:00)
                            </h5>
                            <div className="grid grid-cols-3 gap-2">
                              {availableSlots
                                .filter(slot => {
                                  const hour = parseInt(slot.split(':')[0]);
                                  // Include slots from 08:30 to 12:30 (hour 8-12, all minutes)
                                  return hour >= 8 && hour < 13;
                                })
                                .map((time) => (
                            <button
                              key={time}
                              onClick={() => handleTimeSelect(time)}
                                    className={`p-3 rounded-lg border transition-all text-sm font-medium relative ${
                                bookingData.time === time
                                  ? "bg-black text-white border-black"
                                        : "border-gray-200 hover:bg-gray-50 text-black"
                              }`}
                            >
                                    <div className="flex flex-col items-center">
                                      <span>{time}</span>
                                      {bookingData.duration === "1h" && (
                                        <span className="text-[10px] mt-0.5 opacity-75">
                                          2 pessoas
                                        </span>
                                      )}
                                    </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                        {/* Afternoon slots */}
                        {availableSlots.filter(slot => {
                          const hour = parseInt(slot.split(':')[0]);
                          return hour >= 15;
                        }).length > 0 && (
                      <div className="mb-4">
                            <h5 className="text-xs font-medium text-gray-500 mb-2 text-center">
                              Tarde (15:30 - 18:30)
                            </h5>
                            <div className="grid grid-cols-3 gap-2">
                              {availableSlots
                                .filter(slot => {
                                  const hour = parseInt(slot.split(':')[0]);
                                  // Include slots from 15:30 to 18:30 (hour 15-18, all minutes)
                                  return hour >= 15;
                                })
                                .map((time) => (
                            <button
                              key={time}
                              onClick={() => handleTimeSelect(time)}
                                    className={`p-3 rounded-lg border transition-all text-sm font-medium relative ${
                                bookingData.time === time
                                  ? "bg-black text-white border-black"
                                        : "border-gray-200 hover:bg-gray-50 text-black"
                              }`}
                            >
                                    <div className="flex flex-col items-center">
                                      <span>{time}</span>
                                      {bookingData.duration === "1h" && (
                                        <span className="text-[10px] mt-0.5 opacity-75">
                                          2 pessoas
                                        </span>
                                      )}
                                    </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                      </>
                    )}
                    
                    <div className="text-center mt-3 space-y-1">
                      {bookingData.duration === "1h" ? (
                        <>
                          <p className="text-xs text-gray-400">
                            Marcação de 1 hora ocupa 2 slots consecutivos
                          </p>
                          <p className="text-xs text-gray-400">
                            Fechado para almoço: 13:00-15:30
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Horários de meia em meia hora • Fechado para almoço: 13:00-15:30
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleContinueToDetails}
                    disabled={!bookingData.time}
                    className="w-full py-4 text-base bg-black hover:bg-black/80 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Continuar
                  </Button>
                </motion.div>
              )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Details Form */}
            {step === "details" && (
              <motion.form
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
              <div className="text-center space-y-1 py-4 border-b border-gray-200">
                <p className="text-sm font-medium text-black">
                  {bookingData.date?.toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  / {bookingData.time}
                </p>
                <p className="text-lg font-semibold text-black">
                  {services.find((s) => s.id === bookingData.service)?.name}
                </p>
                <p className="text-sm text-gray-500">
                  com {barbers.find((b) => b.id === bookingData.barber)?.name}
                </p>
                {bookingData.duration === "1h" && (
                  <p className="text-xs font-medium text-black bg-yellow-50 py-1.5 px-3 rounded-md inline-block mt-2">
                    ⚡ Marcação de 1 hora - Permite 2 pessoas
                  </p>
                )}
              </div>

              <div className="space-y-3 px-6">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Dados da marcação
                </h3>

                <Input
                  type="text"
                  placeholder="Primeiro e último nome"
                  value={bookingData.name}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, name: e.target.value })
                  }
                  required
                  className="w-full p-3 border border-gray-200 rounded-md focus:border-gray-400 text-sm"
                />

                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 border border-gray-200 rounded-md bg-gray-50 text-sm">
                    <span>🇵🇹</span>
                    <span className="text-gray-400">▼</span>
                  </div>
                  <Input
                    type="tel"
                    placeholder="Telefone"
                    value={bookingData.phone}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, phone: e.target.value })
                    }
                    required
                    className="flex-1 p-3 border border-gray-200 rounded-md focus:border-gray-400 text-sm"
                  />
                </div>

                <div>
                <Input
                  type="email"
                    placeholder="O seu e-mail (opcional)"
                  value={bookingData.email}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, email: e.target.value })
                  }
                  className="w-full p-3 border border-gray-200 rounded-md focus:border-gray-400 text-sm"
                />
                  <p className="text-xs text-gray-500 mt-1">
                    Necessário para receber confirmação e lembretes
                  </p>
                </div>

                <Textarea
                  placeholder="Observações"
                  value={bookingData.observations}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      observations: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-200 rounded-md focus:border-gray-400 min-h-[80px] text-sm"
                />
              </div>

              <div className="px-6 pb-6">
                <Button
                  type="submit"
                  className="w-full py-4 text-base bg-black hover:bg-black/80 text-white rounded-full"
                >
                  Confirmar
                </Button>
              </div>
              </motion.form>
            )}

            {/* Step 5: Confirmation */}
            {step === "confirmation" && (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-4 py-6"
              >
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-2xl font-semibold text-black mb-1">
                  Marcação Confirmada!
                </h3>
                <p className="text-sm text-gray-600">
                  Receberá um email de confirmação em breve.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-left">
                <p className="text-sm">
                  <span className="font-medium">Serviço:</span>{" "}
                  {services.find((s) => s.id === bookingData.service)?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Barbeiro:</span>{" "}
                  {barbers.find((b) => b.id === bookingData.barber)?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Data:</span>{" "}
                  {bookingData.date?.toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Hora:</span>{" "}
                  {bookingData.time} ({bookingData.duration === "1h" ? "1 hora" : "30 minutos"})
                </p>
              </div>

              <Button
                onClick={() => {
                  setStep("service");
                  setBookingData({
                    service: "",
                    barber: "",
                    date: null,
                    time: "",
                    duration: "30min",
                    name: "",
                    phone: "",
                    email: "",
                    observations: "",
                    acceptTerms: false,
                    acceptMarketing: false,
                  });
                  setSelectedDate(null);
                }}
                className="bg-black hover:bg-black/80 text-white px-6 py-3 rounded-full text-sm"
              >
                Fazer Nova Marcação
              </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

