import { NextRequest, NextResponse } from "next/server";
import { vacationDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { bookingDb } from "@/lib/db";
import { getVacationEmailTemplate } from "@/lib/email-templates";

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
        await sendEmail({
          to: client.email,
          subject: `Aviso: Férias do Barbeiro ${barber} - Barbearia Cabanitas`,
          html: getVacationEmailTemplate({
            name: client.name,
            barber,
            startDate: new Date(start_date).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            endDate: new Date(end_date).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          }),
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

