import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { bookingDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getConfirmationEmailTemplate, getAdminNotificationTemplate } from "@/lib/email-templates";
import { getManageUrl } from "@/lib/booking-manage";

// GET - Get all bookings or by date
//
// O widget de marcação chama esta rota do browser para calcular os horários
// livres, pelo que ela é pública. Sem sessão de admin devolve apenas os campos
// necessários para esse cálculo — nome, telefone, email e observações dos
// clientes não saem daqui para quem não está autenticado.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let bookings;

    if (date) {
      bookings = await bookingDb.getByDate(date);
    } else if (startDate && endDate) {
      bookings = await bookingDb.getByDateRange(startDate, endDate);
    } else {
      bookings = await bookingDb.getAll();
    }

    const session = await getServerSession(authOptions);

    if (!session) {
      const availabilityOnly = bookings.map((b) => ({
        id: b.id,
        barber: b.barber,
        date: b.date,
        time: b.time,
        duration: b.duration || "30min",
        status: b.status,
      }));
      return NextResponse.json({ bookings: availabilityOnly }, { status: 200 });
    }

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { message: "Error fetching bookings", error },
      { status: 500 }
    );
  }
}

// Helper function to get next time slot (add 30 minutes)
function getNextTimeSlot(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  let nextHours = hours;
  let nextMinutes = minutes + 30;
  
  if (nextMinutes >= 60) {
    nextMinutes = 0;
    nextHours += 1;
  }
  
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

// POST - Create new booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, barber, date, time, duration, name, phone, email, observations, created_by } = body;

    // Validate required fields
    if (!service || !barber || !date || !time || !name) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Block booking if less than 30 minutes until slot (for today)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (date === todayStr) {
      const [slotHour, slotMin] = time.split(':').map(Number);
      const slotMinutes = slotHour * 60 + slotMin;
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      if (slotMinutes - nowMinutes < 30) {
        return NextResponse.json(
          { message: "Não é possível marcar com menos de 30 minutos de antecedência" },
          { status: 400 }
        );
      }
    }

    // Normalize date to YYYY-MM-DD to avoid timezone/format mismatches with DB
    const dateOnly = typeof date === 'string' && date.includes('T') ? date.split('T')[0] : date;

    // Check if time slot is available
    const isAvailable = await bookingDb.isTimeSlotAvailable(
      dateOnly, 
      time, 
      barber, 
      duration || "30min"
    );
    
    if (!isAvailable) {
      return NextResponse.json(
        { message: "Time slot is not available" },
        { status: 409 }
      );
    }

    // Create booking with duration
    // For 1h bookings, we create ONE booking that occupies 2 slots (current + next)
    const { id: bookingId, manageToken } = await bookingDb.create({
      service,
      barber,
      date: dateOnly,
      time,
      duration: duration || "30min",
      name,
      phone: phone || "",
      email,
      observations,
      created_by: created_by || "client",
      status: "confirmed",
    });

    // Send confirmation email to client (if email provided)
    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: "Confirmação da Sua Marcação - Barbearia Cabanitas",
          html: getConfirmationEmailTemplate({
            name,
            service,
            barber,
            date: new Date(date).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            time,
            duration: duration || "30min",
            observations: observations || undefined,
            manageUrl: getManageUrl(manageToken),
          }),
        });
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
      }
    }

    // Send notification email to barbershop
    try {
      await sendEmail({
        to: process.env.BARBERSHOP_EMAIL || "barbearia.cabanitas@example.com",
        subject: `Nova Marcação: ${service} - ${name}`,
        html: getAdminNotificationTemplate({
          name,
          service,
          barber,
          date: new Date(date).toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          time,
          duration: duration || "30min",
          phone,
          email: email || undefined,
          observations: observations || undefined,
          bookingId,
        }),
      });
    } catch (emailError) {
      console.error("Error sending notification email:", emailError);
    }

    return NextResponse.json(
      { message: "Booking created successfully", bookingId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { message: "Error creating booking", error },
      { status: 500 }
    );
  }
}

// PUT - Update booking (apenas admin autenticado)
// O cliente altera a sua marcação por /api/bookings/manage, autenticado pelo token.
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    // If updating date/time, check availability
    if (updates.date && updates.time && updates.barber) {
      // Get the booking's duration (either from updates or existing booking)
      let duration: "30min" | "1h" = "30min";
      if (updates.duration) {
        duration = updates.duration;
      } else {
        // Get existing booking to check duration
        const existingBooking = await bookingDb.getById(id);
        if (existingBooking && existingBooking.duration) {
          duration = existingBooking.duration as "30min" | "1h";
        }
      }
      
      const isAvailable = await bookingDb.isTimeSlotAvailable(
        updates.date,
        updates.time,
        updates.barber,
        duration,
        id
      );
      if (!isAvailable) {
        return NextResponse.json(
          { message: "Time slot is not available" },
          { status: 409 }
        );
      }
    }

    await bookingDb.update(id, updates);

    return NextResponse.json({ message: "Booking updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { message: "Error updating booking", error },
      { status: 500 }
    );
  }
}

// DELETE - Delete booking (apenas admin autenticado)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    await bookingDb.delete(parseInt(id));

    return NextResponse.json({ message: "Booking deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { message: "Error deleting booking", error },
      { status: 500 }
    );
  }
}
