import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();

    const {
      service,
      barber,
      date,
      time,
      name,
      phone,
      email,
      observations,
    } = bookingData;

    // Format date
    const bookingDate = new Date(date);
    const formattedDate = bookingDate.toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    });

    // Service names mapping
    const serviceNames: Record<string, string> = {
      cabelo: "Cabelo",
      barba: "Barba",
      "cabelo-barba": "Cabelo e Barba",
    };

    // Send confirmation email to barbershop
    await resend.emails.send({
      from: "Barbearia Cabanitas <marcacoes@barbearia-cabanitas.pt>",
      to: process.env.BARBERSHOP_EMAIL || "info@barbearia-cabanitas.pt",
      subject: `Nova Marcação - ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .detail { margin: 15px 0; padding: 10px; background-color: #fff; border-left: 4px solid #000; }
              .label { font-weight: bold; color: #000; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Nova Marcação</h1>
              </div>
              <div class="content">
                <h2>Detalhes da Marcação</h2>
                
                <div class="detail">
                  <span class="label">Cliente:</span> ${name}
                </div>
                
                <div class="detail">
                  <span class="label">Serviço:</span> ${serviceNames[service]}
                </div>
                
                <div class="detail">
                  <span class="label">Barbeiro:</span> ${barber === "edgar" ? "Edgar" : barber}
                </div>
                
                <div class="detail">
                  <span class="label">Data:</span> ${formattedDate}
                </div>
                
                <div class="detail">
                  <span class="label">Hora:</span> ${time}
                </div>
                
                <div class="detail">
                  <span class="label">Telefone:</span> ${phone}
                </div>
                
                <div class="detail">
                  <span class="label">Email:</span> ${email}
                </div>
                
                ${
                  observations
                    ? `
                <div class="detail">
                  <span class="label">Observações:</span><br>
                  ${observations}
                </div>
                `
                    : ""
                }
              </div>
              <div class="footer">
                <p>Barbearia Cabanitas - Estilo Clássico, Atitude Moderna</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Send confirmation email to client
    await resend.emails.send({
      from: "Barbearia Cabanitas <marcacoes@barbearia-cabanitas.pt>",
      to: email,
      subject: "Confirmação de Marcação - Barbearia Cabanitas",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #000; color: #fff; padding: 30px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .detail { margin: 15px 0; padding: 15px; background-color: #fff; border-left: 4px solid #000; }
              .label { font-weight: bold; color: #000; display: block; margin-bottom: 5px; }
              .value { color: #333; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .button { display: inline-block; padding: 15px 30px; background-color: #000; color: #fff; text-decoration: none; border-radius: 50px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✂️ Marcação Confirmada!</h1>
              </div>
              <div class="content">
                <p>Olá ${name},</p>
                <p>A sua marcação na <strong>Barbearia Cabanitas</strong> foi confirmada com sucesso!</p>
                
                <h3>Detalhes da sua marcação:</h3>
                
                <div class="detail">
                  <span class="label">Serviço:</span>
                  <span class="value">${serviceNames[service]}</span>
                </div>
                
                <div class="detail">
                  <span class="label">Barbeiro:</span>
                  <span class="value">${barber === "edgar" ? "Edgar" : barber}</span>
                </div>
                
                <div class="detail">
                  <span class="label">Data:</span>
                  <span class="value">${formattedDate}</span>
                </div>
                
                <div class="detail">
                  <span class="label">Hora:</span>
                  <span class="value">${time}</span>
                </div>
                
                <div class="detail">
                  <span class="label">Morada:</span>
                  <span class="value">Rua Exemplo, 123<br>Lisboa, Portugal</span>
                </div>
                
                ${
                  observations
                    ? `
                <div class="detail">
                  <span class="label">As suas observações:</span>
                  <span class="value">${observations}</span>
                </div>
                `
                    : ""
                }
                
                <p style="margin-top: 30px;">
                  <strong>Importante:</strong> Receberá um lembrete 30 minutos antes da sua marcação.
                </p>
                
                <p>Se precisar de cancelar ou reagendar, por favor contacte-nos:</p>
                <p>
                  📞 <strong>+351 123 456 789</strong><br>
                  📧 <strong>info@barbearia-cabanitas.pt</strong>
                </p>
                
                <p style="margin-top: 30px;">Aguardamos a sua visita!</p>
              </div>
              <div class="footer">
                <p><strong>Barbearia Cabanitas</strong></p>
                <p>Estilo Clássico, Atitude Moderna</p>
                <p>Rua Exemplo, 123 | Lisboa, Portugal</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Schedule reminder email (30 minutes before)
    const reminderTime = new Date(bookingDate);
    reminderTime.setHours(parseInt(time.split(":")[0]));
    reminderTime.setMinutes(parseInt(time.split(":")[1]) - 30);

    // TODO: Implement scheduling system (e.g., using a job queue or cron)
    // For now, we'll just log it
    console.log("Reminder scheduled for:", reminderTime);

    // Schedule review request email (1 hour after appointment)
    const reviewTime = new Date(bookingDate);
    reviewTime.setHours(parseInt(time.split(":")[0]) + 1);
    reviewTime.setMinutes(parseInt(time.split(":")[1]));

    // TODO: Implement scheduling system
    console.log("Review request scheduled for:", reviewTime);

    return NextResponse.json(
      { message: "Booking created successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

