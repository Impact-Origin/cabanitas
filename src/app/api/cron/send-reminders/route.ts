import { NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// This endpoint should be called by a cron job every 5 minutes
// Vercel Cron automatically authenticates requests with x-vercel-signature header
// For manual testing, you can use CRON_SECRET environment variable
export async function GET(request: Request) {
  try {
    // Check if this is a Vercel cron request (has x-vercel-signature header)
    const vercelSignature = request.headers.get('x-vercel-signature');
    const isVercelCron = !!vercelSignature;
    
    // If not a Vercel cron request, check for CRON_SECRET (for manual testing)
    if (!isVercelCron && process.env.CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (token !== process.env.CRON_SECRET) {
        console.log('❌ Unauthorized cron request - missing or invalid CRON_SECRET');
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    console.log('✅ Cron job triggered', { isVercelCron, timestamp: new Date().toISOString() });
    // Get bookings that need reminders (30 minutes before)
    const bookingsNeedingReminders = await bookingDb.getBookingsNeedingReminders();

    for (const booking of bookingsNeedingReminders) {
      if (booking.email) {
        try {
          await resend.emails.send({
            from: "Barbearia Cabanitas <onboarding@resend.dev>",
            to: [booking.email],
            subject: "Lembrete: Marcação na Barbearia Cabanitas em 30 minutos",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #000;">Lembrete de Marcação ⏰</h2>
                <p>Olá ${booking.name},</p>
                <p>Este é um lembrete de que a sua marcação na Barbearia Cabanitas é <strong>daqui a 30 minutos</strong>!</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3 style="margin-top: 0;">Detalhes da Marcação:</h3>
                  <p><strong>Serviço:</strong> ${booking.service}</p>
                  <p><strong>Barbeiro:</strong> ${booking.barber}</p>
                  <p><strong>Data:</strong> ${new Date(booking.date).toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}</p>
                  <p><strong>Hora:</strong> ${booking.time}</p>
                </div>

                <p>Aguardamos a sua visita!</p>
                
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

          // Mark reminder as sent
          await bookingDb.markReminderSent(booking.id!);
          console.log(`Reminder sent for booking #${booking.id}`);
        } catch (error) {
          console.error(`Error sending reminder for booking #${booking.id}:`, error);
        }
      } else {
        // If no email, just mark as sent to avoid retrying
        await bookingDb.markReminderSent(booking.id!);
      }
    }

    // Get bookings that need review requests (1 hour after)
    const bookingsNeedingReviews = await bookingDb.getBookingsNeedingReviews();

    for (const booking of bookingsNeedingReviews) {
      if (booking.email) {
        try {
          await resend.emails.send({
            from: "Barbearia Cabanitas <onboarding@resend.dev>",
            to: [booking.email],
            subject: "Como foi a sua experiência na Barbearia Cabanitas?",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #000;">Obrigado pela sua visita! ⭐</h2>
                <p>Olá ${booking.name},</p>
                <p>Esperamos que tenha gostado do seu corte na Barbearia Cabanitas!</p>
                <p>A sua opinião é muito importante para nós. Pode partilhar a sua experiência no Google?</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a 
                    href="${process.env.GOOGLE_REVIEW_LINK || "#"}" 
                    style="display: inline-block; background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;"
                  >
                    Deixar Avaliação no Google
                  </a>
                </div>

                <p>Muito obrigado pelo seu tempo!</p>
                
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

          // Mark review as sent
          await bookingDb.markReviewSent(booking.id!);
          console.log(`Review request sent for booking #${booking.id}`);
        } catch (error) {
          console.error(`Error sending review request for booking #${booking.id}:`, error);
        }
      } else {
        // If no email, just mark as sent
        await bookingDb.markReviewSent(booking.id!);
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent: bookingsNeedingReminders.length,
      reviewsSent: bookingsNeedingReviews.length,
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

