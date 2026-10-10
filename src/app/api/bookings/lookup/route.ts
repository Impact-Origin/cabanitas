// Deteção de marcação existente a partir dos contactos que a pessoa escreve no
// widget, para evitar marcações duplicadas.
//
// Decisão de privacidade: esta rota NUNCA devolve os dados da marcação. Um
// número de telefone não é segredo, logo qualquer pessoa poderia escrever o
// número de outra e ver-lhe a marcação. O que devolve é só "existe" ou "não
// existe", e o link para alterar vai por email, para a caixa de correio do
// próprio dono da marcação.

import { NextRequest, NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getManageLinkTemplate } from "@/lib/email-templates";
import { canClientManage, getManageUrl } from "@/lib/booking-manage";

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
    return new Date(`${dateOnly}T12:00:00`).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

// "joao.santos@gmail.com" -> "j***@gmail.com"
// Permite dizer à pessoa para onde foi o email sem o revelar a quem não o saiba.
function maskEmail(email: string): string {
    const [user, domain] = email.split("@");
    if (!domain) return "***";
    return `${user.slice(0, 1)}***@${domain}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, email } = body as { phone?: string; email?: string };

        if (!phone && !email) {
            return NextResponse.json(
                { message: "Indique o telefone ou o email" },
                { status: 400 }
            );
        }

        const upcoming = await bookingDb.getUpcomingByContact({ phone, email });

        // Só interessam as que o cliente ainda pode alterar.
        const manageable = upcoming.filter((b) =>
            canClientManage({
                date: toDateOnly(b.date),
                time: b.time,
                status: b.status,
            }).allowed
        );

        if (manageable.length === 0) {
            return NextResponse.json({ found: false }, { status: 200 });
        }

        // A mais próxima — getUpcomingByContact já devolve ordenado por data e hora.
        const booking = manageable[0];
        const dateOnly = toDateOnly(booking.date);

        // Sem email na marcação não há forma segura de entregar o link.
        const destination = booking.email || email || null;

        if (!destination) {
            return NextResponse.json(
                {
                    found: true,
                    emailSent: false,
                    reason: "no-email",
                    count: manageable.length,
                },
                { status: 200 }
            );
        }

        if (!booking.manage_token) {
            // Marcação anterior à migração do token.
            return NextResponse.json(
                {
                    found: true,
                    emailSent: false,
                    reason: "no-token",
                    count: manageable.length,
                },
                { status: 200 }
            );
        }

        try {
            await sendEmail({
                to: destination,
                subject: "A Sua Marcação - Barbearia Cabanitas",
                html: getManageLinkTemplate({
                    name: booking.name,
                    service: booking.service,
                    barber: booking.barber,
                    date: formatDatePt(dateOnly),
                    time: booking.time,
                    duration: booking.duration || "30min",
                    manageUrl: getManageUrl(booking.manage_token),
                }),
            });
        } catch (emailError) {
            console.error("Error sending manage link:", emailError);
            return NextResponse.json(
                {
                    found: true,
                    emailSent: false,
                    reason: "send-failed",
                    count: manageable.length,
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                found: true,
                emailSent: true,
                maskedEmail: maskEmail(destination),
                count: manageable.length,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error looking up booking:", error);
        return NextResponse.json(
            { message: "Erro ao verificar marcações" },
            { status: 500 }
        );
    }
}
