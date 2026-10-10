// Email Templates for Barbearia Cabanitas
// Professional HTML templates with clean styling (no images or emojis)

import { MANAGE_CUTOFF_HOURS, getSiteUrl } from "./booking-manage";

interface EmailTemplateParams {
  name: string;
  service?: string;
  barber?: string;
  date?: string;
  time?: string;
  duration?: string;
  observations?: string;
  bookingId?: number;
  phone?: string;
  email?: string;
  manageUrl?: string;
  previousDate?: string;
  previousTime?: string;
}

const BUSINESS_INFO = {
  name: 'Barbearia Cabanitas',
  address: 'Rua Capitão João Francisco de Sousa nº36',
  postalCode: '7800-451 Beja',
  phone: '+351 963 242 206',
};
const GOOGLE_REVIEW_LINK = "https://g.page/r/CVvd45NnzfiQEAE/review";

// Common email styles
const emailStyles = `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
  }
  .email-container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background-color: #000000;
    padding: 40px 30px;
    text-align: center;
  }
  .header h1 {
    color: #ffffff;
    margin: 0;
    font-size: 24px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 700;
  }
  .content {
    padding: 40px 30px;
    color: #333333;
    line-height: 1.6;
  }
  .greeting {
    font-size: 18px;
    margin-bottom: 20px;
    color: #000000;
  }
  .info-box {
    background-color: #f9f9f9;
    border-left: 4px solid #000000;
    padding: 20px;
    margin: 25px 0;
  }
  .info-box h3 {
    margin-top: 0;
    font-size: 16px;
    color: #000000;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .info-row {
    margin: 12px 0;
    font-size: 15px;
  }
  .info-label {
    font-weight: 600;
    color: #000000;
    display: inline-block;
    min-width: 120px;
  }
  .info-value {
    color: #666666;
  }
  .cta-button {
    display: inline-block;
    background-color: #000000;
    color: #ffffff;
    padding: 15px 40px;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 600;
    margin: 20px 0;
    text-align: center;
  }
  .footer {
    background-color: #f9f9f9;
    padding: 30px;
    text-align: center;
    border-top: 1px solid #e0e0e0;
  }
  .footer-info {
    color: #666666;
    font-size: 13px;
    line-height: 1.8;
  }
  .divider {
    height: 1px;
    background-color: #e0e0e0;
    margin: 30px 0;
  }
`;

// Bloco "Remarcar ou cancelar" usado na confirmação e no lembrete.
// Sem manageUrl (marcações antigas, anteriores à migração) cai no telefone,
// para o email nunca ficar sem alternativa.
function getManageBlock(manageUrl?: string, intro?: string): string {
  if (!manageUrl) {
    return `
          <p style="color: #999; font-size: 13px;">
            Se necessitar alterar ou cancelar a sua marcação, por favor contacte-nos
            através do telefone ${BUSINESS_INFO.phone}.
          </p>`;
  }

  return `
          <p style="font-size: 15px; margin-bottom: 4px;">
            ${intro || 'Precisa de mudar o dia ou a hora?'}
          </p>
          <p style="text-align: center; margin: 10px 0 20px;">
            <a href="${manageUrl}" class="cta-button" style="color: #ffffff;">
              Remarcar ou cancelar
            </a>
          </p>
          <p style="color: #999; font-size: 13px;">
            O link é pessoal, não o partilhe. Alterações até ${MANAGE_CUTOFF_HOURS} horas antes
            da marcação; mais perto da hora, ligue-nos para ${BUSINESS_INFO.phone}.
          </p>`;
}

// Booking Confirmation Email
export function getConfirmationEmailTemplate(params: EmailTemplateParams): string {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Marcação</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${BUSINESS_INFO.name}</h1>
        </div>
        
        <div class="content">
          <p class="greeting">Olá ${params.name},</p>
          
          <p>A sua marcação na <strong>${BUSINESS_INFO.name}</strong> foi confirmada com sucesso.</p>
          
          <div class="info-box">
            <h3>Detalhes da Marcação</h3>
            <div class="info-row">
              <span class="info-label">Serviço:</span>
              <span class="info-value">${params.service}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Barbeiro:</span>
              <span class="info-value">${params.barber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${params.date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hora:</span>
              <span class="info-value">${params.time}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Duração:</span>
              <span class="info-value">${params.duration === '1h' ? '1 hora (2 pessoas)' : '30 minutos'}</span>
            </div>
            ${params.observations ? `
            <div class="info-row">
              <span class="info-label">Observações:</span>
              <span class="info-value">${params.observations}</span>
            </div>
            ` : ''}
          </div>
          
          <p>Aguardamos a sua visita.</p>
          
          <p><strong>A Barbearia Cabanitas agradece a sua preferência.</strong></p>
          
          <p>
            Se gostou do serviço, deixe-nos uma avaliação no Google:
            <a href="${GOOGLE_REVIEW_LINK}" style="color: #000; font-weight: 600; margin-left: 6px;">
              Deixar review
            </a>
          </p>
          <!-- template-confirmation-v2 -->
          <div class="divider"></div>
          
${getManageBlock(params.manageUrl)}
        </div>
        
        <div class="footer">
          <div class="footer-info">
            <strong>${BUSINESS_INFO.name}</strong><br>
            ${BUSINESS_INFO.address}<br>
            ${BUSINESS_INFO.postalCode}<br>
            Telefone: ${BUSINESS_INFO.phone}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Reminder Email (1 day before)
export function getReminderEmailTemplate(params: EmailTemplateParams): string {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lembrete de Marcação</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${BUSINESS_INFO.name}</h1>
        </div>
        
        <div class="content">
          <p class="greeting">Olá ${params.name},</p>
          
          <p>Este é um lembrete de que tem uma marcação na <strong>${BUSINESS_INFO.name}</strong> amanhã.</p>
          
          <div class="info-box">
            <h3>Detalhes da Marcação</h3>
            <div class="info-row">
              <span class="info-label">Serviço:</span>
              <span class="info-value">${params.service}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Barbeiro:</span>
              <span class="info-value">${params.barber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${params.date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hora:</span>
              <span class="info-value">${params.time}</span>
            </div>
            ${params.duration ? `
            <div class="info-row">
              <span class="info-label">Duração:</span>
              <span class="info-value">${params.duration === '1h' ? '1 hora (2 pessoas)' : '30 minutos'}</span>
            </div>
            ` : ''}
          </div>
          
          <p>Aguardamos a sua visita.</p>
          
          <div class="divider"></div>
          
${getManageBlock(params.manageUrl, 'Surgiu um imprevisto? Pode remarcar aqui, sem precisar de ligar.')}
        </div>
        
        <div class="footer">
          <div class="footer-info">
            <strong>${BUSINESS_INFO.name}</strong><br>
            ${BUSINESS_INFO.address}<br>
            ${BUSINESS_INFO.postalCode}<br>
            Telefone: ${BUSINESS_INFO.phone}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Review Request Email
export function getReviewEmailTemplate(params: EmailTemplateParams): string {
  const googleReviewLink = process.env.GOOGLE_REVIEW_LINK || GOOGLE_REVIEW_LINK;

  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>A Sua Opinião é Importante</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${BUSINESS_INFO.name}</h1>
        </div>
        
        <div class="content">
          <p class="greeting">Olá ${params.name},</p>
          
          <p>Esperamos que tenha gostado da sua experiência na <strong>${BUSINESS_INFO.name}</strong>.</p>
          
          <p>A sua opinião é muito importante para nós e ajuda-nos a melhorar continuamente os nossos serviços. Se tiver alguns minutos, agradecemos que partilhe a sua experiência no Google.</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${googleReviewLink}" class="cta-button">
              Deixar Avaliação
            </a>
          </div>
          
          <p>Muito obrigado pelo seu tempo e preferência.</p>
          
          <div class="divider"></div>
          
          <p style="color: #999; font-size: 13px;">
            Esperamos vê-lo novamente em breve na ${BUSINESS_INFO.name}.
          </p>
        </div>
        
        <div class="footer">
          <div class="footer-info">
            <strong>${BUSINESS_INFO.name}</strong><br>
            ${BUSINESS_INFO.address}<br>
            ${BUSINESS_INFO.postalCode}<br>
            Telefone: ${BUSINESS_INFO.phone}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Admin Notification Email
export function getAdminNotificationTemplate(params: EmailTemplateParams): string {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Marcação</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${BUSINESS_INFO.name}</h1>
        </div>
        
        <div class="content">
          <h2 style="color: #000000; margin-top: 0;">Nova Marcação Recebida</h2>
          
          <div class="info-box">
            <h3>Detalhes da Marcação</h3>
            <div class="info-row">
              <span class="info-label">Serviço:</span>
              <span class="info-value">${params.service}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Barbeiro:</span>
              <span class="info-value">${params.barber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${params.date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hora:</span>
              <span class="info-value">${params.time}</span>
            </div>
            ${params.duration ? `
            <div class="info-row">
              <span class="info-label">Duração:</span>
              <span class="info-value">${params.duration === '1h' ? '1 hora (2 pessoas)' : '30 minutos'}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="info-box" style="background-color: #f0f0f0;">
            <h3>Dados do Cliente</h3>
            <div class="info-row">
              <span class="info-label">Nome:</span>
              <span class="info-value">${params.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Telefone:</span>
              <span class="info-value">${params.phone}</span>
            </div>
            ${params.email ? `
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${params.email}</span>
            </div>
            ` : ''}
            ${params.observations ? `
            <div class="info-row">
              <span class="info-label">Observações:</span>
              <span class="info-value">${params.observations}</span>
            </div>
            ` : ''}
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>ID da Marcação:</strong> #${params.bookingId}
          </p>
        </div>
        
        <div class="footer">
          <div class="footer-info">
            <strong>${BUSINESS_INFO.name}</strong><br>
            Sistema de Gestão de Marcações
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Vacation Notification Email
export function getVacationEmailTemplate(params: { name: string; barber: string; startDate: string; endDate: string }): string {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aviso de Férias</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${BUSINESS_INFO.name}</h1>
        </div>
        
        <div class="content">
          <p class="greeting">Olá ${params.name},</p>
          
          <p>Informamos que o barbeiro <strong>${params.barber}</strong> estará de férias no período indicado abaixo.</p>
          
          <div class="info-box">
            <h3>Período de Férias</h3>
            <div class="info-row">
              <span class="info-label">De:</span>
              <span class="info-value">${params.startDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Até:</span>
              <span class="info-value">${params.endDate}</span>
            </div>
          </div>
          
          <p>Durante este período, não será possível fazer marcações com este barbeiro.</p>
          
          <p>Se tiver alguma marcação agendada para este período, entraremos em contacto consigo.</p>
          
          <div class="divider"></div>
          
          <p style="color: #999; font-size: 13px;">
            Para mais informações, contacte-nos através do telefone ${BUSINESS_INFO.phone}.
          </p>
        </div>
        
        <div class="footer">
          <div class="footer-info">
            <strong>${BUSINESS_INFO.name}</strong><br>
            ${BUSINESS_INFO.address}<br>
            ${BUSINESS_INFO.postalCode}<br>
            Telefone: ${BUSINESS_INFO.phone}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ---------------------------------------------------------------------------
// Emails de remarcação / cancelamento pelo próprio cliente
// ---------------------------------------------------------------------------

// Esqueleto comum. Os templates acima repetem este HTML cada um por si; nos
// novos usa-se este helper para não acrescentar mais quatro cópias do mesmo.
function wrapEmail(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${BUSINESS_INFO.name}</h1>
        </div>

        <div class="content">
${content}
        </div>

        <div class="footer">
          <div class="footer-info">
            <strong>${BUSINESS_INFO.name}</strong><br>
            ${BUSINESS_INFO.address}<br>
            ${BUSINESS_INFO.postalCode}<br>
            Telefone: ${BUSINESS_INFO.phone}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getDetailsBox(params: EmailTemplateParams, heading = 'Detalhes da Marcação'): string {
  return `
          <div class="info-box">
            <h3>${heading}</h3>
            <div class="info-row">
              <span class="info-label">Serviço:</span>
              <span class="info-value">${params.service}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Barbeiro:</span>
              <span class="info-value">${params.barber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${params.date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hora:</span>
              <span class="info-value">${params.time}</span>
            </div>
            ${params.duration ? `
            <div class="info-row">
              <span class="info-label">Duração:</span>
              <span class="info-value">${params.duration === '1h' ? '1 hora (2 pessoas)' : '30 minutos'}</span>
            </div>
            ` : ''}
          </div>`;
}

// Cliente remarcou: confirmação com o horário novo
export function getRescheduleConfirmationTemplate(params: EmailTemplateParams): string {
  return wrapEmail('Marcação Remarcada', `
          <p class="greeting">Olá ${params.name},</p>

          <p>A sua marcação foi alterada com sucesso. Fica assim:</p>
${getDetailsBox(params, 'Nova Marcação')}

          ${params.previousDate ? `
          <p style="color: #666; font-size: 14px;">
            Horário anterior: ${params.previousDate} às ${params.previousTime} (já libertado).
          </p>
          ` : ''}

          <p>Aguardamos a sua visita.</p>

          <div class="divider"></div>
${getManageBlock(params.manageUrl, 'Precisa de alterar outra vez?')}
  `);
}

// Cliente cancelou: confirmação de que ficou sem marcação
export function getCancellationConfirmationTemplate(params: EmailTemplateParams): string {
  return wrapEmail('Marcação Cancelada', `
          <p class="greeting">Olá ${params.name},</p>

          <p>A sua marcação foi <strong>cancelada</strong> conforme pediu.</p>
${getDetailsBox(params, 'Marcação Cancelada')}

          <p>Quando quiser voltar, pode marcar de novo no nosso site.</p>

          <p style="text-align: center; margin: 20px 0;">
            <a href="${getSiteUrl()}" class="cta-button" style="color: #ffffff;">
              Fazer nova marcação
            </a>
          </p>

          <p><strong>A Barbearia Cabanitas agradece a sua preferência.</strong></p>
  `);
}

// Aviso à barbearia de que um cliente mexeu na marcação sozinho
export function getBookingChangeNotificationTemplate(
  params: EmailTemplateParams & { changeType: 'reschedule' | 'cancel' }
): string {
  const isCancel = params.changeType === 'cancel';
  const title = isCancel ? 'Marcação cancelada pelo cliente' : 'Marcação remarcada pelo cliente';

  return wrapEmail(title, `
          <p class="greeting">${title}</p>

          <p>
            O cliente <strong>${params.name}</strong> ${isCancel ? 'cancelou' : 'alterou'} a marcação
            através do link do email.
          </p>
${getDetailsBox(params, isCancel ? 'Marcação Cancelada' : 'Novo Horário')}

          ${params.previousDate ? `
          <div class="info-box" style="border-left-color: #999;">
            <h3>Horário Anterior</h3>
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${params.previousDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hora:</span>
              <span class="info-value">${params.previousTime}</span>
            </div>
          </div>
          ` : ''}

          <div class="info-box">
            <h3>Contactos</h3>
            <div class="info-row">
              <span class="info-label">Telefone:</span>
              <span class="info-value">${params.phone || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${params.email || '-'}</span>
            </div>
            ${params.bookingId ? `
            <div class="info-row">
              <span class="info-label">Marcação nº:</span>
              <span class="info-value">${params.bookingId}</span>
            </div>
            ` : ''}
          </div>
  `);
}

// Widget detetou marcação existente: enviar o link em vez de mostrar dados no ecrã
export function getManageLinkTemplate(params: EmailTemplateParams): string {
  return wrapEmail('A Sua Marcação', `
          <p class="greeting">Olá ${params.name},</p>

          <p>
            Pediu o link para gerir a sua marcação na <strong>${BUSINESS_INFO.name}</strong>.
            Aqui está:
          </p>
${getDetailsBox(params)}

${getManageBlock(params.manageUrl, 'Para mudar o dia, a hora, ou cancelar:')}

          <div class="divider"></div>

          <p style="color: #999; font-size: 13px;">
            Se não foi você que pediu este email, ignore-o — ninguém consegue alterar
            a sua marcação sem este link.
          </p>
  `);
}
