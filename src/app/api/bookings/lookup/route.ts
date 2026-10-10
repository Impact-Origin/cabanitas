// Deteção de marcação existente a partir dos contactos escritos no widget,
// para evitar marcações duplicadas e dar acesso à remarcação.
//
// Decisão de privacidade: esta rota NUNCA devolve o token nem o nome do
// cliente. Um telefone ou email não provam que quem os escreve é o dono da
// marcação, logo o link para alterar vai sempre por email, para a caixa do
// próprio dono. Quando há várias marcações nos mesmos contactos (o caso do pai
// e do filho a partilharem email), a escolha é oferecida apenas com dia, hora
// e serviço — o suficiente para o dono se reconhecer, sem dizer de quem é.

import { NextRequest, NextResponse } from "next/server";
import { bookingDb, type Booking } from "@/lib/db";
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
function maskEmail(email: string): string {
    const [user, domain] = email.split("@");
    if (!domain) return "***";
    return `${user.slice(0, 1)}***@${domain}`;
}

// Sem acentos, sem maiúsculas, sem espaços a mais — para "José Silva" e
// "jose  silva" serem a mesma pessoa.
function normalizeName(name?: string | null): string {
    return (name || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

// Comparação tolerante: quem marcou como "Pedro Silva" pode escrever só
// "Pedro" ao voltar. Só é usada para estreitar quando sobra exatamente uma
// marcação — se houver dúvida, a pessoa escolhe.
function nameMatches(stored: string, typed: string): boolean {
    if (!stored || !typed) return false;
    if (stored === typed) return true;

    // Um é o começo do outro: "pedro" / "pedro silva"
    if (stored.startsWith(`${typed} `) || typed.startsWith(`${stored} `)) {
        return true;
    }

    // Primeiro nome igual
    return stored.split(" ")[0] === typed.split(" ")[0];
}

async function sendManageLink(booking: Booking, fallbackEmail?: string | null) {
    const destination = booking.email || fallbackEmail || null;

    if (!destination) return { emailSent: false, reason: "no-email" as const };
    if (!booking.manage_token) return { emailSent: false, reason: "no-token" as const };

    const dateOnly = toDateOnly(booking.date);

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
        return { emailSent: false, reason: "send-failed" as const };
    }

    return { emailSent: true, maskedEmail: maskEmail(destination) };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, email, name, bookingId } = body as {
            phone?: string;
            email?: string;
            name?: string;
            bookingId?: number;
        };

        if (!phone && !email) {
            return NextResponse.json(
                { message: "Indique o telefone ou o email" },
                { status: 400 }
            );
        }

        const upcoming = await bookingDb.getUpcomingByContact({ phone, email });

        // Só interessam as que o cliente ainda pode alterar
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

        // Segunda chamada: a pessoa já escolheu qual das marcações quer.
        // O id só é aceite se pertencer ao conjunto destes contactos, e mesmo
        // assim não dá acesso — apenas decide para qual se envia o link.
        if (bookingId) {
            const chosen = manageable.find((b) => b.id === Number(bookingId));

            if (!chosen) {
                return NextResponse.json(
                    { message: "Marcação não encontrada nestes contactos" },
                    { status: 404 }
                );
            }

            const result = await sendManageLink(chosen, email);
            return NextResponse.json(
                { found: true, count: manageable.length, ...result },
                { status: 200 }
            );
        }

        // Várias marcações nos mesmos contactos? O nome escrito no widget
        // costuma resolver: o pai escreve o nome dele, o filho o dele.
        let candidates = manageable;

        if (candidates.length > 1) {
            const typedName = normalizeName(name);
            if (typedName) {
                const byName = candidates.filter((b) =>
                    nameMatches(normalizeName(b.name), typedName)
                );
                // Só estreita se ficar exatamente uma; caso contrário mantém todas
                // e deixa a pessoa escolher.
                if (byName.length === 1) candidates = byName;
            }
        }

        if (candidates.length > 1) {
            return NextResponse.json(
                {
                    found: true,
                    needsChoice: true,
                    count: candidates.length,
                    // Sem nome e sem token: só o que a pessoa precisa para
                    // reconhecer a sua própria marcação.
                    choices: candidates.map((b) => ({
                        id: b.id,
                        date: toDateOnly(b.date),
                        time: b.time,
                        service: b.service,
                        duration: b.duration || "30min",
                    })),
                },
                { status: 200 }
            );
        }

        const result = await sendManageLink(candidates[0], email);
        return NextResponse.json(
            { found: true, count: 1, ...result },
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
