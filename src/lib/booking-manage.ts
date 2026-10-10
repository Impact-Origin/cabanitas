// Regras e utilitários para o cliente gerir a própria marcação (remarcar/cancelar)
// a partir do link que recebe por email, sem precisar de telefonar.

import { randomBytes } from "crypto";

// Antecedência mínima para o cliente remarcar ou cancelar sozinho.
// Abaixo disto o link deixa de permitir alterações e pede para ligar à barbearia.
export const MANAGE_CUTOFF_HOURS = 2;

// Gera o token secreto de uma marcação (43 caracteres, URL-safe).
export function generateManageToken(): string {
    return randomBytes(32).toString("base64url");
}

// URL base do site. NEXTAUTH_URL já está configurado no .env e na Vercel.
export function getSiteUrl(): string {
    const url =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "https://barbeariacabanitas.com";
    return url.replace(/\/$/, "");
}

// Link que vai no email do cliente.
export function getManageUrl(token: string): string {
    return `${getSiteUrl()}/marcacao/${token}`;
}

// Data/hora atual em Lisboa, em partes numéricas.
// Necessário porque o servidor (Vercel) corre em UTC e Portugal está em UTC+0/+1
// conforme a época do ano — usar new Date().getHours() daria a hora errada no verão.
function nowInLisbon(): { date: string; minutes: number } {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Lisbon",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

    const hour = Number(get("hour")) % 24; // "24" à meia-noite em alguns runtimes
    return {
        date: `${get("year")}-${get("month")}-${get("day")}`,
        minutes: hour * 60 + Number(get("minute")),
    };
}

// Minutos desde agora até à marcação (negativo se já passou).
export function minutesUntilBooking(date: string, time: string): number {
    const dateOnly = date.includes("T") ? date.split("T")[0] : date;
    const now = nowInLisbon();

    const [bookingHour, bookingMinute] = time.split(":").map(Number);
    const bookingMinutes = bookingHour * 60 + bookingMinute;

    // Diferença de dias a partir das strings YYYY-MM-DD, sem conversões de fuso.
    const dayDiff = Math.round(
        (Date.parse(`${dateOnly}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) /
        86_400_000
    );

    return dayDiff * 24 * 60 + bookingMinutes - now.minutes;
}

export type ManageBlockedReason = "past" | "too-soon" | "cancelled";

// Diz se o cliente ainda pode mexer na marcação, e porque não, se for o caso.
export function canClientManage(booking: {
    date: string;
    time: string;
    status?: string | null;
}): { allowed: boolean; reason?: ManageBlockedReason } {
    if (booking.status === "cancelled") {
        return { allowed: false, reason: "cancelled" };
    }

    const minutes = minutesUntilBooking(booking.date, booking.time);

    if (minutes <= 0) {
        return { allowed: false, reason: "past" };
    }

    if (minutes < MANAGE_CUTOFF_HOURS * 60) {
        return { allowed: false, reason: "too-soon" };
    }

    return { allowed: true };
}
