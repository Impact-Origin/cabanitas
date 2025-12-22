import { NextRequest, NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getConfirmationEmailTemplate, getAdminNotificationTemplate } from "@/lib/email-templates";

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
            observations: observations || undefined,
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
