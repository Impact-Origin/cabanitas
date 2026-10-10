"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SlotPicker, formatDateKey } from "@/components/slot-picker";

const PHONE_DISPLAY = "+351 963 242 206";
const PHONE_HREF = "tel:+351963242206";

interface BookingView {
    name: string;
    service: string;
    barber: string;
    date: string;
    time: string;
    duration: "30min" | "1h";
    status: string;
    observations?: string | null;
}

type Mode = "view" | "reschedule" | "rescheduled" | "cancelled";

function formatDatePt(dateOnly: string): string {
    // Meio-dia para a data não escorregar um dia por causa do fuso
    return new Date(`${dateOnly}T12:00:00`).toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function ManageBooking({ token }: { token: string }) {
    const [booking, setBooking] = useState<BookingView | null>(null);
    const [canManage, setCanManage] = useState(false);
    const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [mode, setMode] = useState<Mode>("view");
    const [newDate, setNewDate] = useState<Date | null>(null);
    const [newTime, setNewTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

    const loadBooking = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/bookings/manage?token=${encodeURIComponent(token)}`
            );
            const data = await response.json();

            if (!response.ok) {
                setLoadError(
                    response.status === 404
                        ? "Não encontrámos esta marcação. O link pode estar incompleto ou a marcação já foi removida."
                        : data.message || "Não foi possível carregar a marcação."
                );
                return;
            }

            setBooking(data.booking);
            setCanManage(data.canManage);
            setBlockedMessage(data.blockedMessage);

            if (data.booking.status === "cancelled") {
                setMode("cancelled");
            }
        } catch (error) {
            console.error("Error loading booking:", error);
            setLoadError("Não foi possível carregar a marcação. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadBooking();
    }, [loadBooking]);

    const handleReschedule = async () => {
        if (!newDate || !newTime) return;

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/bookings/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    action: "reschedule",
                    date: formatDateKey(newDate),
                    time: newTime,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Não foi possível remarcar.");
                // O slot pode ter sido ocupado entretanto: recarregar o estado real
                if (response.status === 409) await loadBooking();
                return;
            }

            toast.success("Marcação remarcada com sucesso");
            setBooking((prev) =>
                prev ? { ...prev, date: formatDateKey(newDate), time: newTime } : prev
            );
            setMode("rescheduled");
        } catch (error) {
            console.error("Error rescheduling:", error);
            toast.error("Não foi possível remarcar. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/bookings/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, action: "cancel" }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Não foi possível cancelar.");
                return;
            }

            toast.success("Marcação cancelada");
            setMode("cancelled");
        } catch (error) {
            console.error("Error cancelling:", error);
            toast.error("Não foi possível cancelar. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-xl mx-auto text-center py-20 text-gray-500">
                A carregar a sua marcação...
            </div>
        );
    }

    if (loadError || !booking) {
        return (
            <div className="max-w-xl mx-auto">
                <Card className="border border-gray-200 shadow-md rounded-xl bg-white">
                    <CardContent className="py-10 px-6 text-center space-y-4">
                        <p className="text-black font-medium">{loadError}</p>
                        <p className="text-sm text-gray-500">
                            Para qualquer alteração, ligue-nos:
                        </p>
                        <a
                            href={PHONE_HREF}
                            className="inline-block text-black font-semibold underline"
                        >
                            {PHONE_DISPLAY}
                        </a>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const detailRows = (
        <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
                <span className="text-gray-500">Serviço</span>
                <span className="text-black font-medium text-right">{booking.service}</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-500">Barbeiro</span>
                <span className="text-black font-medium text-right">{booking.barber}</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-500">Data</span>
                <span className="text-black font-medium text-right">
                    {formatDatePt(booking.date)}
                </span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-500">Hora</span>
                <span className="text-black font-medium text-right">{booking.time}</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-500">Duração</span>
                <span className="text-black font-medium text-right">
                    {booking.duration === "1h" ? "1 hora (2 pessoas)" : "30 minutos"}
                </span>
            </div>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto">
            <Card className="border border-gray-200 shadow-md rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-gray-200 py-5 px-6">
                    <CardTitle className="text-lg font-semibold text-black text-center">
                        {mode === "cancelled"
                            ? "Marcação cancelada"
                            : mode === "rescheduled"
                                ? "Marcação remarcada"
                                : mode === "reschedule"
                                    ? "Escolha o novo horário"
                                    : "A sua marcação"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                    {mode === "cancelled" ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-5 text-center"
                        >
                            <p className="text-gray-600">
                                Olá {booking.name}, a sua marcação foi cancelada e o horário
                                ficou livre.
                            </p>
                            <div className="text-left opacity-60">{detailRows}</div>
                            <Button
                                onClick={() => (window.location.href = "/#marcacoes")}
                                className="w-full py-4 text-base bg-black hover:bg-black/80 text-white rounded-full"
                            >
                                Fazer nova marcação
                            </Button>
                        </motion.div>
                    ) : mode === "rescheduled" ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-5 text-center"
                        >
                            <p className="text-gray-600">
                                Pronto, {booking.name}. Enviámos-lhe a confirmação por email.
                            </p>
                            <div className="text-left">{detailRows}</div>
                            <p className="text-xs text-gray-400">
                                Pode voltar a usar o mesmo link do email se precisar de alterar
                                outra vez.
                            </p>
                        </motion.div>
                    ) : mode === "reschedule" ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 text-center">
                                {booking.service} com {booking.barber} ·{" "}
                                {booking.duration === "1h" ? "1 hora" : "30 minutos"}
                            </p>

                            <SlotPicker
                                barberName={booking.barber}
                                duration={booking.duration}
                                selectedDate={newDate}
                                onDateChange={(date) => {
                                    setNewDate(date);
                                    setNewTime("");
                                }}
                                selectedTime={newTime}
                                onTimeChange={setNewTime}
                                excludeBooking={{ date: booking.date, time: booking.time }}
                                onContinue={handleReschedule}
                                continueLabel="Confirmar novo horário"
                                isSubmitting={isSubmitting}
                            />

                            <button
                                type="button"
                                onClick={() => setMode("view")}
                                className="w-full text-sm text-gray-500 hover:text-black transition-colors py-2"
                            >
                                Manter o horário atual
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <p className="text-gray-600">
                                Olá {booking.name}, está tudo confirmado para:
                            </p>

                            {detailRows}

                            {booking.observations && (
                                <div className="text-sm">
                                    <span className="text-gray-500">Observações</span>
                                    <p className="text-black mt-1">{booking.observations}</p>
                                </div>
                            )}

                            {canManage ? (
                                <div className="space-y-3 pt-2">
                                    <Button
                                        onClick={() => setMode("reschedule")}
                                        className="w-full py-4 text-base bg-black hover:bg-black/80 text-white rounded-full"
                                    >
                                        Remarcar
                                    </Button>
                                    <Button
                                        onClick={() => setConfirmCancelOpen(true)}
                                        variant="outline"
                                        className="w-full py-4 text-base rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancelar marcação
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-center">
                                    <p className="text-sm text-black">{blockedMessage}</p>
                                    <a
                                        href={PHONE_HREF}
                                        className="inline-block text-sm text-black font-semibold underline"
                                    >
                                        {PHONE_DISPLAY}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmCancelOpen}
                onOpenChange={setConfirmCancelOpen}
                title="Cancelar a marcação?"
                description={`A marcação de ${formatDatePt(booking.date)} às ${booking.time} será cancelada e o horário fica livre para outra pessoa. Esta ação não se desfaz.`}
                confirmText="Sim, cancelar"
                cancelText="Manter marcação"
                variant="destructive"
                onConfirm={handleCancel}
            />
        </div>
    );
}
