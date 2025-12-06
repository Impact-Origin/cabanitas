import { NextRequest, NextResponse } from "next/server";
import { vacationDb } from "@/lib/db";
import { Resend } from "resend";
import { bookingDb } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);

// GET - Get all vacations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barber = searchParams.get("barber");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let vacations;
    if (barber) {
      vacations = await vacationDb.getByBarber(barber);
    } else if (startDate && endDate) {
      vacations = await vacationDb.getByDateRange(startDate, endDate);
    } else {
      vacations = await vacationDb.getAll();
    }

    return NextResponse.json({ vacations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching vacations:", error);
    return NextResponse.json(
      { message: "Error fetching vacations", error },
      { status: 500 }
    );
  }
}

// POST - Create vacation and notify clients
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barber, start_date, end_date } = body;

    if (!barber || !start_date || !end_date) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create vacation
    const vacationId = await vacationDb.create({
      barber,
      start_date,
      end_date,
    });

    // Get all clients who have bookings with THIS SPECIFIC barber only
    const bookings = await bookingDb.getByBarber(barber);
    
    // Filter clients: must have email and at least one confirmed or upcoming booking with this barber
    // Also check if they have bookings that might be affected by the vacation period
    const vacationStart = new Date(start_date);
    const vacationEnd = new Date(end_date);
    
    const clientsWithEmail = bookings
      .filter((b) => {
        // Must have email
        if (!b.email) return false;
        
        // Must have a booking that is confirmed or upcoming (not cancelled)
        if (b.status === "cancelled") return false;
        
        // Check if booking date is in the future or overlaps with vacation period
        const bookingDate = new Date(b.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Include if booking is in the future or overlaps with vacation
        return bookingDate >= today || 
               (bookingDate >= vacationStart && bookingDate <= vacationEnd);
      })
      .map((b) => ({ email: b.email!, name: b.name, barber: b.barber }));

    // Remove duplicates by email (keep unique clients)
    const uniqueClients = Array.from(
      new Map(clientsWithEmail.map((c) => [c.email, c])).values()
    ).filter((c) => c.barber === barber); // Double check: ensure it's the correct barber

    // Send notification emails
    const emailPromises = uniqueClients.map(async (client) => {
      try {
        await resend.emails.send({
          from: "Barbearia Cabanitas <onboarding@resend.dev>",
          to: [client.email],
          subject: `Aviso: Férias do Barbeiro ${barber} - Barbearia Cabanitas`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #000;">Aviso de Férias 🏖️</h2>
              <p>Olá ${client.name},</p>
              <p>Informamos que o barbeiro <strong>${barber}</strong> estará de férias no período indicado abaixo.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0;">Período de Férias:</h3>
                <p><strong>De:</strong> ${new Date(start_date).toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}</p>
                <p><strong>Até:</strong> ${new Date(end_date).toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}</p>
              </div>

              <p>Durante este período, não será possível fazer marcações com este barbeiro.</p>
              <p>Se tiver alguma marcação agendada para este período, entraremos em contacto consigo.</p>
              
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
        console.error(`Error sending email to ${client.email}:`, emailError);
      }
    });

    await Promise.all(emailPromises);

    // Mark notification as sent
    await vacationDb.markNotificationSent(vacationId);

    return NextResponse.json(
      { message: "Vacation created and clients notified", vacationId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vacation:", error);
    return NextResponse.json(
      { message: "Error creating vacation", error },
      { status: 500 }
    );
  }
}

// DELETE - Delete vacation
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Missing vacation ID" },
        { status: 400 }
      );
    }

    await vacationDb.delete(Number(id));

    return NextResponse.json(
      { message: "Vacation deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting vacation:", error);
    return NextResponse.json(
      { message: "Error deleting vacation", error },
      { status: 500 }
    );
  }
}

