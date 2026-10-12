"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getActiveBarbers } from "@/config/barbers";
import { SlotPicker } from "@/components/slot-picker";
import { toast } from "sonner";

type Step = "service" | "barber" | "datetime" | "details" | "existing" | "confirmation";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Resultado da deteção de marcação já existente nestes contactos
  const [existingBooking, setExistingBooking] = useState<{
    emailSent?: boolean;
    maskedEmail?: string;
    reason?: string;
    count: number;
    // Várias marcações nos mesmos contactos: a pessoa escolhe qual
    needsChoice?: boolean;
    choices?: Array<{
      id: number;
      date: string;
      time: string;
      service: string;
      duration: string;
    }>;
  } | null>(null);
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


  // O SlotPicker e a API trabalham com o nome do barbeiro, não com o id
  const resolvedBarberName =
    bookingData.barber === "no-preference"
      ? "Sem Preferência"
      : barbers.find((b) => b.id === bookingData.barber)?.name || "";

  const handleServiceSelect = (serviceId: string) => {
    setBookingData({ ...bookingData, service: serviceId });
    setStep("barber");
  };

  const handleBarberSelect = (barberId: string) => {
    setBookingData({ ...bookingData, barber: barberId });
    setStep("datetime");
  };

  const handleDateSelect = (date: Date) => {
    setBookingData({ ...bookingData, date, time: "" });
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

    // Antes de criar, verificar se estes contactos já têm marcação futura.
    // A resposta nunca traz os dados da marcação — só se existe. O link para
    // alterar vai por email, para a caixa do próprio dono da marcação.
    setIsSubmitting(true);
    try {
      const lookupResponse = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bookingData.name,
          phone: bookingData.phone,
          email: bookingData.email || null,
        }),
      });

      if (lookupResponse.ok) {
        const lookupData = await lookupResponse.json();
        if (lookupData.found) {
          setExistingBooking({
            emailSent: lookupData.emailSent,
            maskedEmail: lookupData.maskedEmail,
            reason: lookupData.reason,
            count: lookupData.count || 1,
            needsChoice: lookupData.needsChoice,
            choices: lookupData.choices,
          });
          setStep("existing");
          return;
        }
      }
      // Se a verificação falhar, não bloqueia a marcação — segue em frente.
    } catch (error) {
      console.error("Error checking for existing bookings:", error);
    } finally {
      setIsSubmitting(false);
    }

    await createBooking();
  };

  // Pede o link por email. Com bookingId quando a pessoa escolheu uma de várias;
  // sem ele quando só existe uma. O id não dá acesso a nada por si só — o
  // servidor revalida que pertence a estes contactos antes de enviar.
  const requestManageLink = async (bookingId?: number) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bookingData.name,
          phone: bookingData.phone,
          email: bookingData.email || null,
          ...(bookingId ? { bookingId } : { send: true }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Não foi possível enviar o link.");
        return;
      }

      setExistingBooking({
        emailSent: data.emailSent,
        maskedEmail: data.maskedEmail,
        reason: data.reason,
        count: data.count || 1,
      });
    } catch (error) {
      console.error("Error requesting manage link:", error);
      toast.error("Não foi possível enviar o link. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createBooking = async () => {
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    const steps: Step[] = ["service", "barber", "datetime", "details", "existing", "confirmation"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

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
            {step === "existing" && "Já tem uma marcação"}
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
                <div className="p-6">
                  <SlotPicker
                    barberName={resolvedBarberName}
                    duration={bookingData.duration}
                    onDurationChange={(duration) =>
                      setBookingData({ ...bookingData, duration, time: "" })
                    }
                    selectedDate={bookingData.date}
                    onDateChange={handleDateSelect}
                    selectedTime={bookingData.time}
                    onTimeChange={handleTimeSelect}
                    onContinue={handleContinueToDetails}
                  />
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
                  disabled={isSubmitting}
                  className="w-full py-4 text-base bg-black hover:bg-black/80 text-white rounded-full"
                >
                  {isSubmitting ? "A verificar..." : "Confirmar"}
                </Button>
              </div>
              </motion.form>
            )}

            {/* Passo intermédio: já existe marcação nestes contactos */}
            {step === "existing" && (
              <motion.div
                key="existing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6 space-y-5"
              >
                {existingBooking?.needsChoice ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Encontrámos {existingBooking.count} marcações nestes
                        contactos.
                      </p>
                      <p className="text-sm font-medium text-black">
                        Qual quer alterar?
                      </p>
                    </div>

                    <div className="space-y-2">
                      {existingBooking.choices?.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => requestManageLink(choice.id)}
                          disabled={isSubmitting}
                          className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                        >
                          <div className="text-sm font-medium text-black">
                            {new Date(
                              `${choice.date}T12:00:00`
                            ).toLocaleDateString("pt-PT", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}{" "}
                            · {choice.time}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {choice.service}
                            {choice.duration === "1h" ? " · 1 hora" : ""}
                          </div>
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400">
                      Enviamos o link para o email da marcação que escolher. Por
                      segurança, não mostramos aqui a quem pertence cada uma.
                    </p>
                  </>
                ) : (
                  <>
                    {existingBooking?.emailSent === undefined && (
                      <p className="text-sm text-gray-600">
                        Encontrámos uma marcação futura associada a estes
                        contactos.
                      </p>
                    )}

                    {existingBooking?.emailSent === undefined ? (
                      // Ainda não foi pedido nada: só avisa. Quem está mesmo a
                      // marcar para outra pessoa segue em frente sem receber
                      // emails que não pediu.
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Se o que queria era mudar o dia ou a hora dessa
                          marcação, enviamos-lhe o link por email.
                        </p>
                        <Button
                          onClick={() => requestManageLink()}
                          disabled={isSubmitting}
                          variant="outline"
                          className="w-full py-4 text-base rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isSubmitting
                            ? "A enviar..."
                            : "Quero alterar a que já tenho"}
                        </Button>
                      </div>
                    ) : existingBooking.emailSent ? (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <p className="text-sm text-black font-medium">
                          Enviámos o link para {existingBooking.maskedEmail}
                        </p>
                        <p className="text-xs text-gray-500">
                          Abra esse email para mudar o dia ou a hora da marcação
                          que já tem. Por segurança, não mostramos aqui os
                          detalhes da marcação.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <p className="text-sm text-black font-medium">
                          Para alterar essa marcação, ligue-nos
                        </p>
                        <a
                          href="tel:+351963242206"
                          className="inline-block text-sm text-black font-semibold underline"
                        >
                          +351 963 242 206
                        </a>
                        <p className="text-xs text-gray-500">
                          {existingBooking?.reason === "no-email"
                            ? "A marcação que já tem não ficou com email associado, por isso não podemos enviar o link."
                            : "Não foi possível enviar o email com o link neste momento."}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-3 pt-1">
                  <Button
                    onClick={createBooking}
                    disabled={isSubmitting}
                    className="w-full py-4 text-base bg-black hover:bg-black/80 text-white rounded-full disabled:opacity-50"
                  >
                    {isSubmitting ? "A marcar..." : "Quero mesmo marcar outra"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="w-full text-sm text-gray-500 hover:text-black transition-colors py-2"
                  >
                    Voltar
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Confirmation */}
            {step === "confirmation" && (
              <motion.div
                key="confirmation"
                data-booking-confirmation="v2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-6 py-8 px-4"
              >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-white"
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
                <h3 className="text-3xl md:text-4xl font-bold text-black mb-3">
                  Marcação Confirmada!
                </h3>
                <p className="text-lg md:text-xl text-gray-600">
                  Receberá um email de confirmação em breve.
                </p>
                <p className="text-base md:text-lg text-gray-600 mt-2">
                  Em caso de algum problema, contacte:{" "}
                  <a href="tel:+351963242206" className="font-semibold text-black underline hover:no-underline">
                    +351 963 242 206
                  </a>
                </p>
              </div>

              <div className="bg-gray-50 p-5 md:p-6 rounded-xl space-y-3 text-left max-w-md mx-auto">
                <p className="text-base md:text-lg">
                  <span className="font-semibold">Serviço:</span>{" "}
                  {services.find((s) => s.id === bookingData.service)?.name}
                </p>
                <p className="text-base md:text-lg">
                  <span className="font-semibold">Barbeiro:</span>{" "}
                  {barbers.find((b) => b.id === bookingData.barber)?.name}
                </p>
                <p className="text-base md:text-lg">
                  <span className="font-semibold">Data:</span>{" "}
                  {bookingData.date?.toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-base md:text-lg">
                  <span className="font-semibold">Hora:</span>{" "}
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

