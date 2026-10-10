"use client";

// Calendário + duração + horários disponíveis.
// Extraído do booking-wizard para ser partilhado entre a marcação nova e a
// remarcação em /marcacao/[token]. A lógica de disponibilidade é a mesma nos
// dois sítios; o servidor valida sempre antes de gravar.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const weekDayLabels = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export interface SlotPickerProps {
    // Nome do barbeiro já resolvido (ex.: "Edgar", "Sem Preferência")
    barberName: string;
    duration: "30min" | "1h";
    // Passar para mostrar o seletor de duração. Na remarcação fica fixo.
    onDurationChange?: (duration: "30min" | "1h") => void;
    selectedDate: Date | null;
    onDateChange: (date: Date) => void;
    selectedTime: string;
    onTimeChange: (time: string) => void;
    // Marcação a ignorar no cálculo (a própria, numa remarcação)
    excludeBooking?: { date: string; time: string };
    onContinue?: () => void;
    continueLabel?: string;
    isSubmitting?: boolean;
}

export function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getNextTimeSlot(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    let nextHours = hours;
    let nextMinutes = minutes + 30;

    if (nextMinutes >= 60) {
        nextMinutes = 0;
        nextHours += 1;
    }

    return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function getPreviousTimeSlot(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    let prevHours = hours;
    let prevMinutes = minutes - 30;

    if (prevMinutes < 0) {
        prevMinutes = 30;
        prevHours -= 1;
    }

    if (prevHours < 0) return "";

    return `${String(prevHours).padStart(2, "0")}:${String(prevMinutes).padStart(2, "0")}`;
}

// Manhã 08:30-12:30 (fecha às 13:00) e tarde 15:30-18:30
function generateTimeSlots(): string[] {
    const slots: string[] = [];

    let hour = 8;
    let minute = 30;
    while (hour < 13) {
        slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
        minute += 30;
        if (minute === 60) {
            minute = 0;
            hour += 1;
        }
    }

    hour = 15;
    minute = 30;
    while (hour < 18 || (hour === 18 && minute <= 30)) {
        slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
        minute += 30;
        if (minute === 60) {
            minute = 0;
            hour += 1;
        }
    }

    return slots;
}

export function SlotPicker({
    barberName,
    duration,
    onDurationChange,
    selectedDate,
    onDateChange,
    selectedTime,
    onTimeChange,
    excludeBooking,
    onContinue,
    continueLabel = "Continuar",
    isSubmitting = false,
}: SlotPickerProps) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

    // Dias bloqueados: férias do barbeiro e feriados de porta fechada
    useEffect(() => {
        let cancelled = false;

        const loadBlockedDates = async () => {
            try {
                const blocked = new Set<string>();

                const vacationsResponse = await fetch(
                    `/api/vacations?barber=${encodeURIComponent(barberName)}`
                );
                const vacationsData = await vacationsResponse.json();
                (vacationsData.vacations || []).forEach((v: any) => {
                    const startDateStr = String(v.start_date).split("T")[0];
                    const endDateStr = String(v.end_date).split("T")[0];

                    // Meio-dia para a iteração não escorregar com o fuso
                    const start = new Date(`${startDateStr}T12:00:00`);
                    const end = new Date(`${endDateStr}T12:00:00`);
                    const current = new Date(start);

                    while (current <= end) {
                        blocked.add(formatDateKey(current));
                        current.setDate(current.getDate() + 1);
                    }
                });

                const holidaysResponse = await fetch(`/api/holidays`);
                const holidaysData = await holidaysResponse.json();
                (holidaysData.holidays || []).forEach((h: any) => {
                    if (!h.is_working) {
                        blocked.add(String(h.date).split("T")[0]);
                    }
                });

                if (!cancelled) setBlockedDates(blocked);
            } catch (error) {
                console.error("Error loading blocked dates:", error);
            }
        };

        if (barberName) loadBlockedDates();

        return () => {
            cancelled = true;
        };
    }, [barberName]);

    // Horários livres para o dia escolhido
    useEffect(() => {
        let cancelled = false;

        const fetchAvailableSlots = async () => {
            if (!selectedDate || !barberName) return;

            setIsLoadingSlots(true);
            try {
                const formattedDate = formatDateKey(selectedDate);

                const vacationsResponse = await fetch(
                    `/api/vacations?barber=${encodeURIComponent(barberName)}&startDate=${formattedDate}&endDate=${formattedDate}`
                );
                const vacationsData = await vacationsResponse.json();
                const isOnVacation = (vacationsData.vacations || []).some((v: any) => {
                    const start = String(v.start_date).split("T")[0];
                    const end = String(v.end_date).split("T")[0];
                    return formattedDate >= start && formattedDate <= end;
                });

                const holidaysResponse = await fetch(`/api/holidays`);
                const holidaysData = await holidaysResponse.json();
                const holiday = (holidaysData.holidays || []).find(
                    (h: any) => String(h.date).split("T")[0] === formattedDate
                );
                const isHolidayClosed = holiday && !holiday.is_working;

                if (isOnVacation || isHolidayClosed) {
                    if (!cancelled) setAvailableSlots([]);
                    return;
                }

                // Sábado só abre de manhã
                const isSaturday = selectedDate.getDay() === 6;

                let allSlots = generateTimeSlots();
                if (isSaturday) {
                    allSlots = allSlots.filter(
                        (slot) => parseInt(slot.split(":")[0]) < 13
                    );
                }

                const response = await fetch(`/api/bookings?date=${formattedDate}`);
                const data = await response.json();

                let dayBookings = (data.bookings || []).filter(
                    (b: any) => b.barber === barberName && b.status !== "cancelled"
                );

                // Numa remarcação, a própria marcação não deve contar como ocupada
                if (excludeBooking && excludeBooking.date === formattedDate) {
                    dayBookings = dayBookings.filter(
                        (b: any) => b.time !== excludeBooking.time
                    );
                }

                // Ocupação por slot: marcações que começam aqui, mais as de 1h
                // que começaram no slot anterior e invadem este
                const bookingsByTime: Record<string, number> = {};
                allSlots.forEach((slot) => {
                    const prevSlot = getPreviousTimeSlot(slot);
                    let count = 0;

                    dayBookings.forEach((b: any) => {
                        if (b.time === slot) count++;
                        if (b.time === prevSlot && b.duration === "1h") count++;
                    });

                    bookingsByTime[slot] = count;
                });

                const available = allSlots.filter((slot) => {
                    const currentCount = bookingsByTime[slot] || 0;
                    const [currentHours, currentMinutes] = slot.split(":").map(Number);

                    // 30min ocupa o slot sozinho
                    if (duration === "30min") {
                        return currentCount === 0;
                    }

                    // 1h a começar aqui terminaria fora de horas
                    if (currentHours === 12 && currentMinutes === 30) return false;
                    if (currentHours === 18 && currentMinutes === 30) return false;

                    const nextSlot = getNextTimeSlot(slot);
                    const nextCount = bookingsByTime[nextSlot] || 0;
                    const [nextHours, nextMinutes] = nextSlot.split(":").map(Number);

                    const isValidNextSlot =
                        nextHours < 13 ||
                        (nextHours === 13 && nextMinutes === 0) ||
                        (nextHours >= 15 &&
                            (nextHours < 18 || (nextHours === 18 && nextMinutes <= 30)));

                    if (isSaturday) {
                        const isNextSlotInMorning =
                            nextHours < 13 || (nextHours === 13 && nextMinutes === 0);
                        if (!isNextSlotInMorning) return false;
                    }

                    // Um 30min neste slot impede uma marcação de 1h
                    if (dayBookings.some((b: any) => b.time === slot && b.duration === "30min")) {
                        return false;
                    }

                    // Slot já invadido por uma marcação de 1h anterior
                    const prevSlot = getPreviousTimeSlot(slot);
                    if (dayBookings.some((b: any) => b.time === prevSlot && b.duration === "1h")) {
                        return false;
                    }

                    // Até 2 marcações de 1h podem começar no mesmo slot
                    const oneHourStartingHere = dayBookings.filter(
                        (b: any) => b.time === slot && b.duration === "1h"
                    ).length;

                    return oneHourStartingHere < 2 && nextCount === 0 && isValidNextSlot;
                });

                // Hoje: nada com menos de 30 minutos de antecedência
                const now = new Date();
                const todayStr = formatDateKey(now);
                let finalSlots = available;

                if (formattedDate === todayStr) {
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    finalSlots = available.filter((slot) => {
                        const [h, m] = slot.split(":").map(Number);
                        return h * 60 + m - currentMinutes >= 30;
                    });
                }

                if (!cancelled) setAvailableSlots(finalSlots);
            } catch (error) {
                console.error("Error fetching available slots:", error);
                if (!cancelled) setAvailableSlots([]);
            } finally {
                if (!cancelled) setIsLoadingSlots(false);
            }
        };

        fetchAvailableSlots();

        return () => {
            cancelled = true;
        };
    }, [selectedDate, barberName, duration, excludeBooking?.date, excludeBooking?.time]);

    const isDateDisabled = (date: Date): boolean => {
        const dateStr = formatDateKey(date);
        const todayStr = formatDateKey(new Date());

        if (dateStr < todayStr) return true;
        if (date.getDay() === 0) return true; // domingo
        if (blockedDates.has(dateStr)) return true;

        return false;
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Semana a começar à segunda
        const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
        for (let i = 0; i < adjustedStartDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-2"></div>);
        }

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
                    type="button"
                    onClick={() => !isDisabled && onDateChange(date)}
                    disabled={isDisabled}
                    className={`p-2 text-sm rounded-full text-center transition-all ${isDisabled
                            ? "text-gray-300 cursor-not-allowed"
                            : isSelected
                                ? "bg-black text-white font-semibold"
                                : "hover:bg-gray-100 text-black"
                        }`}
                >
                    {String(day).padStart(2, "0")}
                </button>
            );
        }

        return days;
    };

    const morningSlots = availableSlots.filter((slot) => {
        const hour = parseInt(slot.split(":")[0]);
        return hour >= 8 && hour < 13;
    });

    const afternoonSlots = availableSlots.filter(
        (slot) => parseInt(slot.split(":")[0]) >= 15
    );

    const renderSlotButton = (time: string) => (
        <button
            key={time}
            type="button"
            onClick={() => onTimeChange(time)}
            className={`p-3 rounded-lg border transition-all text-sm font-medium relative ${selectedTime === time
                    ? "bg-black text-white border-black"
                    : "border-gray-200 hover:bg-gray-50 text-black"
                }`}
        >
            <div className="flex flex-col items-center">
                <span>{time}</span>
                {duration === "1h" && (
                    <span className="text-[10px] mt-0.5 opacity-75">2 pessoas</span>
                )}
            </div>
        </button>
    );

    return (
        <div className="space-y-4">
            {/* Calendário */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <button
                        type="button"
                        onClick={() =>
                            setCurrentMonth(
                                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                            )
                        }
                        className="p-2 hover:bg-gray-50 rounded-full transition-colors text-black"
                    >
                        ←
                    </button>
                    <h3 className="text-lg font-semibold text-black">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button
                        type="button"
                        onClick={() =>
                            setCurrentMonth(
                                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                            )
                        }
                        className="p-2 hover:bg-gray-50 rounded-full transition-colors text-black"
                    >
                        →
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDayLabels.map((day) => (
                        <div
                            key={day}
                            className="text-center text-xs font-medium text-gray-400 py-2"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            </div>

            {/* Duração (só na marcação nova) */}
            {selectedDate && onDurationChange && (
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
                                type="button"
                                onClick={() => onDurationChange("30min")}
                                className={`p-3 rounded-lg border transition-all text-sm font-medium cursor-pointer ${duration === "30min"
                                        ? "bg-black text-white border-black"
                                        : "border-gray-200 hover:bg-gray-50 text-black"
                                    }`}
                            >
                                30 minutos
                            </button>
                            <button
                                type="button"
                                onClick={() => onDurationChange("1h")}
                                className={`p-3 rounded-lg border transition-all text-sm font-medium cursor-pointer ${duration === "1h"
                                        ? "bg-black text-white border-black"
                                        : "border-gray-200 hover:bg-gray-50 text-black"
                                    }`}
                            >
                                <div className="flex flex-col items-center">
                                    <span>1 hora completa</span>
                                    <span className="text-[10px] mt-0.5 opacity-75">(2 pessoas)</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Horários */}
            {selectedDate && (
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
                                {morningSlots.length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-xs font-medium text-gray-500 mb-2 text-center">
                                            Manhã (08:30 - 13:00)
                                        </h5>
                                        <div className="grid grid-cols-3 gap-2">
                                            {morningSlots.map(renderSlotButton)}
                                        </div>
                                    </div>
                                )}

                                {afternoonSlots.length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-xs font-medium text-gray-500 mb-2 text-center">
                                            Tarde (15:30 - 18:30)
                                        </h5>
                                        <div className="grid grid-cols-3 gap-2">
                                            {afternoonSlots.map(renderSlotButton)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="text-center mt-3 space-y-1">
                            {duration === "1h" ? (
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

                    {onContinue && (
                        <Button
                            type="button"
                            onClick={onContinue}
                            disabled={!selectedTime || isSubmitting}
                            className="w-full py-4 text-base bg-black hover:bg-black/80 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? "A guardar..." : continueLabel}
                        </Button>
                    )}
                </motion.div>
            )}
        </div>
    );
}
