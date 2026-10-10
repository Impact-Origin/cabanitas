// Página que o cliente abre a partir do link "Remarcar ou cancelar" do email.
// O token na URL é o que o autentica — não há login.

import { ManageBooking } from "./manage-booking";

export const metadata = {
    title: "A Sua Marcação | Barbearia Cabanitas",
    // O link é pessoal: não deve aparecer em motores de busca.
    robots: { index: false, follow: false },
};

export default async function ManageBookingPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return (
        <main className="min-h-screen bg-gray-50 py-10 px-4">
            <ManageBooking token={token} />
        </main>
    );
}
