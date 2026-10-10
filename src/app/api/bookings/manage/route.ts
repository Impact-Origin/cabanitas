// Gestão da marcação pelo próprio cliente, autenticada pelo manage_token que
// ele recebeu por email. Nunca aceita um id — quem tem o token tem acesso
// apenas à sua marcação, e o id sequencial não serve de chave.

import { NextRequest, NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
    getRescheduleConfirmationTemplate,
    getCancellationConfirmationTemplate,
    getBookingChangeNotificationTemplate,
} from "@/lib/email-templates";
import {
    canClientManage,
    minutesUntilBooking,
    getManageUrl,
    MANAGE_CUTOFF_HOURS,
} from "@/lib/booking-manage";

// A data pode chegar da Neon como string ISO ou como Date, conforme o driver.
function toDateOnly(value: unknown): string {
    if (value instanceof Date) {
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, "0");
        const day = String(value.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    const str = String(value ?? "");
    return str.includes("T") ? str.split("T")[0] : str;
}

function formatDatePt(dateOnly: string): string {
    // Meio-dia para a formatação não escorregar um dia por causa do fuso.
    return new Date(`${dateOnly}T12:00:00`).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

const BLOCKED_MESSAGES: Record<string, string> = {
    cancelled: "Esta marcação já foi cancelada.",
    past: "Esta marcação já passou.",
    "too-soon": `Faltam menos de ${MANAGE_CUTOFF_HOURS} horas para a marcação. Para alterações de última hora, ligue-nos.`,
};

// GET - detalhes da marcação a partir do token
export async function GET(req: NextRequest) {
    try {
        const token = new URL(req.url).searchParams.get("token");

        if (!token) {
            return NextResponse.json({ message: "Token em falta" }, { status: 400 });
        }

        const booking = await bookingDb.getByToken(token);

        if (!booking) {
            return NextResponse.json(
                { message: "Marcação não encontrada" },
                { status: 404 }
            );
        }

        const dateOnly = toDateOnly(booking.date);
        const manage = canClientManage({
            date: dateOnly,
            time: booking.time,
            status: booking.status,
        });

        // Devolve só o que a página precisa de mostrar. Sem id e sem o token.
        return NextResponse.json(
            {
                booking: {
                    name: booking.name,
                    service: booking.service,
                    barber: booking.barber,
                    date: dateOnly,
                    time: booking.time,
                    duration: booking.duration || "30min",
                    status: booking.status,
                    observations: booking.observations,
                },
                canManage: manage.allowed,
                blockedReason: manage.reason || null,
                blockedMessage: manage.reason ? BLOCKED_MESSAGES[manage.reason] : null,
                cutoffHours: MANAGE_CUTOFF_HOURS,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching booking by token:", error);
        return NextResponse.json(
            { message: "Erro ao carregar a marcação" },
            { status: 500 }
        );
    }
}

// POST - remarcar ou cancelar
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, action, date, time } = body as {
            token?: string;
            action?: "reschedule" | "cancel";
            date?: string;
            time?: string;
        };

        if (!token || !action) {
            return NextResponse.json(
                { message: "Pedido incompleto" },
                { status: 400 }
            );
        }

        const booking = await bookingDb.getByToken(token);

        if (!booking || !booking.id) {
            return NextResponse.json(
                { message: "Marcação não encontrada" },
                { status: 404 }
            );
        }

        const currentDate = toDateOnly(booking.date);
        const manage = canClientManage({
            date: currentDate,
            time: booking.time,
            status: booking.status,
        });

        if (!manage.allowed) {
            return NextResponse.json(
                {
                    message:
                        BLOCKED_MESSAGES[manage.reason!] ||
                        "Esta marcação já não pode ser alterada.",
                    blockedReason: manage.reason,
                },
                { status: 409 }
            );
        }

        const duration = (booking.duration || "30min") as "30min" | "1h";

        if (action === "cancel") {
            await bookingDb.update(booking.id, { status: "cancelled" });

            const emailParams = {
                name: booking.name,
                service: booking.service,
                barber: booking.barber,
                date: formatDatePt(currentDate),
                time: booking.time,
                duration,
            };

            if (booking.email) {
                try {
                    await sendEmail({
                        to: booking.email,
                        subject: "Marcação Cancelada - Barbearia Cabanitas",
                        html: getCancellationConfirmationTemplate(emailParams),
                    });
                } catch (emailError) {
                    console.error("Error sending cancellation email:", emailError);
                }
            }

            try {
                await sendEmail({
                    to: process.env.BARBERSHOP_EMAIL || "barbearia.cabanitas@example.com",
                    subject: `Cancelamento: ${booking.name} - ${formatDatePt(currentDate)} ${booking.time}`,
                    html: getBookingChangeNotificationTemplate({
                        ...emailParams,
                        changeType: "cancel",
                        phone: booking.phone,
                        email: booking.email || undefined,
                        bookingId: booking.id,
                    }),
                });
            } catch (emailError) {
                console.error("Error notifying barbershop of cancellation:", emailError);
            }

            return NextResponse.json(
                { message: "Marcação cancelada" },
                { status: 200 }
            );
        }

        // action === "reschedule"
        if (!date || !time) {
            return NextResponse.json(
                { message: "Escolha o novo dia e hora" },
                { status: 400 }
            );
        }

        const newDate = toDateOnly(date);

        // O horário novo tem de obedecer à mesma antecedência de uma marcação nova.
        if (minutesUntilBooking(newDate, time) < 30) {
            return NextResponse.json(
                { message: "Não é possível marcar com menos de 30 minutos de antecedência" },
                { status: 400 }
            );
        }

        if (newDate === currentDate && time === booking.time) {
            return NextResponse.json(
                { message: "Este é o horário que já tem marcado" },
                { status: 400 }
            );
        }

        // excludeId para a própria marcação não contar como ocupação do slot.
        const isAvailable = await bookingDb.isTimeSlotAvailable(
            newDate,
            time,
            booking.barber,
            duration,
            booking.id
        );

        if (!isAvailable) {
            return NextResponse.json(
                { message: "Esse horário já não está disponível. Escolha outro." },
                { status: 409 }
            );
        }

        await bookingDb.update(booking.id, { date: newDate, time });

        const emailParams = {
            name: booking.name,
            service: booking.service,
            barber: booking.barber,
            date: formatDatePt(newDate),
            time,
            duration,
            previousDate: formatDatePt(currentDate),
            previousTime: booking.time,
        };

        if (booking.email) {
            try {
                await sendEmail({
                    to: booking.email,
                    subject: "Marcação Remarcada - Barbearia Cabanitas",
                    html: getRescheduleConfirmationTemplate({
                        ...emailParams,
                        manageUrl: getManageUrl(token),
                    }),
                });
            } catch (emailError) {
                console.error("Error sending reschedule email:", emailError);
            }
        }

        try {
            await sendEmail({
                to: process.env.BARBERSHOP_EMAIL || "barbearia.cabanitas@example.com",
                subject: `Remarcação: ${booking.name} - ${formatDatePt(newDate)} ${time}`,
                html: getBookingChangeNotificationTemplate({
                    ...emailParams,
                    changeType: "reschedule",
                    phone: booking.phone,
                    email: booking.email || undefined,
                    bookingId: booking.id,
                }),
            });
        } catch (emailError) {
            console.error("Error notifying barbershop of reschedule:", emailError);
        }

        return NextResponse.json(
            { message: "Marcação remarcada", date: newDate, time },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error managing booking:", error);
        return NextResponse.json(
            { message: "Erro ao alterar a marcação" },
            { status: 500 }
        );
    }
}
