// Brevo (formerly Sendinblue) email service
// Documentation: https://developers.brevo.com/docs/send-a-transactional-email

interface BrevoEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    from?: {
        email: string;
        name: string;
    };
}

interface BrevoResponse {
    messageId?: string;
    error?: string;
}

class BrevoEmailService {
    private apiKey: string;
    private apiUrl = 'https://api.brevo.com/v3/smtp/email';
    private defaultFrom = {
        email: 'no-reply@barbeariacabanitas.com',
        name: 'Barbearia Cabanitas',
    };

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async sendEmail({ to, subject, html, from }: BrevoEmailParams): Promise<BrevoResponse> {
        try {
            // Ensure 'to' is an array of objects with email property
            const toArray = Array.isArray(to)
                ? to.map(email => ({ email }))
                : [{ email: to }];

            const payload = {
                sender: from || this.defaultFrom,
                to: toArray,
                subject,
                htmlContent: html,
            };

            console.log('📧 Sending email via Brevo:', {
                to: toArray.map(t => t.email),
                subject,
            });

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Brevo API error:', errorData);
                return {
                    error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                };
            }

            const data = await response.json();
            console.log('✅ Email sent successfully via Brevo:', data);

            return {
                messageId: data.messageId,
            };
        } catch (error) {
            console.error('❌ Error sending email via Brevo:', error);
            return {
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

// Export singleton instance
export const brevoEmailService = new BrevoEmailService(
    process.env.BREVO_API_KEY || ''
);

// Helper function to maintain compatibility with existing code
export async function sendEmail(params: BrevoEmailParams) {
    return brevoEmailService.sendEmail(params);
}
