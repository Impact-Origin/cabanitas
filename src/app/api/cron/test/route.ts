import { NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
      await resend.emails.send({
        from: "Barbearia Cabanitas <onboarding@resend.dev>",
        to: [testEmail],
        subject: "🧪 TESTE: Lembrete de Marcação - Barbearia Cabanitas",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000;">🧪 TESTE: Lembrete de Marcação ⏰</h2>
            <p>Este é um email de teste do sistema de lembretes.</p>
            <p>Olá Teste,</p>
            <p>Este é um lembrete de que a sua marcação na Barbearia Cabanitas é <strong>daqui a 30 minutos</strong>!</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Detalhes da Marcação:</h3>
              <p><strong>Serviço:</strong> Cabelo</p>
              <p><strong>Barbeiro:</strong> Edgar</p>
              <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}</p>
              <p><strong>Hora:</strong> ${new Date().toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
              })}</p>
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
      
      return NextResponse.json({
        success: true,
        message: "Test reminder email sent",
        email: testEmail,
        type: "reminder",
      });
    } else if (type === "review") {
      // Send test review email
      await resend.emails.send({
        from: "Barbearia Cabanitas <onboarding@resend.dev>",
        to: [testEmail],
        subject: "🧪 TESTE: Como foi a sua experiência na Barbearia Cabanitas?",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000;">🧪 TESTE: Obrigado pela sua visita! ⭐</h2>
            <p>Este é um email de teste do sistema de reviews.</p>
            <p>Olá Teste,</p>
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

