import { NextRequest, NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// GET - Get all bookings or by date
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

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { message: "Error fetching bookings", error },
      { status: 500 }
    );
  }
}

// POST - Create new booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, barber, date, time, name, phone, email, observations, created_by } = body;

    // Validate required fields
    if (!service || !barber || !date || !time || !name || !phone) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if time slot is available
    const isAvailable = await bookingDb.isTimeSlotAvailable(date, time, barber);
    if (!isAvailable) {
      return NextResponse.json(
        { message: "Time slot is not available" },
        { status: 409 }
      );
    }

    // Create booking
    const bookingId = await bookingDb.create({
      service,
      barber,
      date,
      time,
      name,
      phone,
      email,
      observations,
      created_by: created_by || "client",
      status: "confirmed",
    });

    // Send confirmation email to client (if email provided)
    if (email) {
      try {
        await resend.emails.send({
          from: "Barbearia Cabanitas <onboarding@resend.dev>",
          to: [email],
          subject: "Confirmação da Sua Marcação - Barbearia Cabanitas",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #000;">Marcação Confirmada! ✂️</h2>
              <p>Olá ${name},</p>
              <p>A sua marcação na Barbearia Cabanitas foi confirmada com sucesso!</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0;">Detalhes da Marcação:</h3>
                <p><strong>Serviço:</strong> ${service}</p>
                <p><strong>Barbeiro:</strong> ${barber}</p>
                <p><strong>Data:</strong> ${new Date(date).toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}</p>
                <p><strong>Hora:</strong> ${time}</p>
                ${observations ? `<p><strong>Observações:</strong> ${observations}</p>` : ""}
              </div>

              <p>Aguardamos a sua visita!</p>
              <p>Receberá um lembrete 30 minutos antes da sua marcação.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <p style="color: #666; font-size: 14px;">
                <strong>Barbearia Cabanitas</strong><br>
                Rua Capitão João Francisco de Sousa nº36<br>
                7800-451 Beja<br>
                📞 +351 963 242 206
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
      }
    }

    // Send notification email to barbershop
    try {
      await resend.emails.send({
        from: "Barbearia Cabanitas <onboarding@resend.dev>",
        to: ["barbearia.cabanitas@example.com"], // TODO: Replace with actual email
        subject: `Nova Marcação: ${service} - ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000;">Nova Marcação Recebida 📅</h2>
            
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Detalhes da Marcação:</h3>
              <p><strong>Serviço:</strong> ${service}</p>
              <p><strong>Barbeiro:</strong> ${barber}</p>
              <p><strong>Data:</strong> ${new Date(date).toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}</p>
              <p><strong>Hora:</strong> ${time}</p>
              <p><strong>Cliente:</strong> ${name}</p>
              <p><strong>Telefone:</strong> ${phone}</p>
              ${email ? `<p><strong>Email:</strong> ${email}</p>` : ""}
              ${observations ? `<p><strong>Observações:</strong> ${observations}</p>` : ""}
            </div>

            <p><strong>ID da Marcação:</strong> #${bookingId}</p>
          </div>
        `,
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

// PUT - Update booking
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    // If updating date/time, check availability
    if (updates.date && updates.time && updates.barber) {
      const isAvailable = await bookingDb.isTimeSlotAvailable(
        updates.date,
        updates.time,
        updates.barber,
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

// DELETE - Delete booking
export async function DELETE(req: NextRequest) {
  try {
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
