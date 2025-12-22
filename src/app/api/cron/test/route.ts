import { NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getReminderEmailTemplate, getReviewEmailTemplate } from "@/lib/email-templates";

// Test endpoint to manually trigger email sending
// Useful for testing before the cron job runs
// Usage: GET /api/cron/test?type=reminder|review&email=test@example.com
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "reminder";
    const testEmail = searchParams.get("email");

    // Optional: Require CRON_SECRET for security
    if (process.env.CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (token !== process.env.CRON_SECRET) {
        return NextResponse.json(
          { success: false, error: "Unauthorized. Use: Authorization: Bearer YOUR_CRON_SECRET" },
          { status: 401 }
        );
      }
    }

    if (!testEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing email parameter. Use: /api/cron/test?type=reminder&email=test@example.com"
        },
        { status: 400 }
      );
    }

    if (type === "reminder") {
      // Send test reminder email
      await sendEmail({
        to: testEmail,
        subject: "🧪 TESTE: Lembrete de Marcação - Barbearia Cabanitas",
        html: getReminderEmailTemplate({
          name: "Cliente Teste",
          service: "Corte de Cabelo",
          barber: "Barbeiro Teste",
          date: new Date().toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          time: "10:00",
        }),
      });

      return NextResponse.json({
        success: true,
        message: "Test reminder email sent",
        email: testEmail,
        type: "reminder",
      });
    } else if (type === "review") {
      // Send test review email
      await sendEmail({
        to: testEmail,
        subject: "🧪 TESTE: Como foi a sua experiência na Barbearia Cabanitas?",
        html: getReviewEmailTemplate({
          name: "Cliente Teste",
        }),
      });

      return NextResponse.json({
        success: true,
        message: "Test review email sent",
        email: testEmail,
        type: "review",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid type. Use 'reminder' or 'review'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}

