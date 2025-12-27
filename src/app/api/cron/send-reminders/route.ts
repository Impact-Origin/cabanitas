import { NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getReminderEmailTemplate, getReviewEmailTemplate } from "@/lib/email-templates";

// This endpoint should be called by a cron job
// - Vercel Hobby Plan: Once per day only (configured to run at 9 AM: 0 9 * * *)
//   ⚠️ NOT suitable for 1-day reminders - use external service instead!
// - Vercel Pro Plan: Can run every 5 minutes (*/5 * * * *)
// - External services (cron-job.org, Upstash QStash): Can run every 5 minutes (RECOMMENDED)
// Vercel Cron automatically authenticates requests with x-vercel-signature header
// For manual testing or external services, you can use CRON_SECRET environment variable
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
          await sendEmail({
            to: booking.email,
            subject: "Lembrete: Marcação na Barbearia Cabanitas amanhã",
            html: getReminderEmailTemplate({
              name: booking.name,
              service: booking.service,
              barber: booking.barber,
              date: new Date(booking.date).toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              time: booking.time,
              duration: booking.duration || "30min",
            }),
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
          await sendEmail({
            to: booking.email,
            subject: "Como foi a sua experiência na Barbearia Cabanitas?",
            html: getReviewEmailTemplate({
              name: booking.name,
            }),
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

