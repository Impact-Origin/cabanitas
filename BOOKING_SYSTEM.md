# Sistema de Marcações - Barbearia Cabanitas

## Visão Geral

O sistema de marcações permite aos clientes agendar serviços online através de um wizard interativo com 5 etapas:

1. **Escolha do Serviço** - Cabelo, Barba, ou Cabelo e Barba
2. **Escolha do Barbeiro** - Seleção do profissional (Edgar)
3. **Escolha de Data e Hora** - Calendário interativo com slots de horário
4. **Dados do Cliente** - Formulário com informações de contacto
5. **Confirmação** - Resumo e confirmação da marcação

## Funcionalidades

### Emails Automáticos

O sistema envia 3 tipos de emails automaticamente:

#### 1. Email de Confirmação Imediata
- **Destinatários**: Barbearia + Cliente
- **Quando**: Imediatamente após a marcação
- **Conteúdo**: 
  - Detalhes completos da marcação
  - Informações de contacto
  - Morada da barbearia

#### 2. Email de Lembrete
- **Destinatário**: Cliente
- **Quando**: 30 minutos antes do serviço
- **Conteúdo**:
  - Lembrete do horário
  - Detalhes do serviço
  - Informações de contacto para cancelamento

#### 3. Email de Pedido de Review
- **Destinatário**: Cliente
- **Quando**: 1 hora após o serviço
- **Conteúdo**:
  - Agradecimento pelo serviço
  - Link para deixar review no Google Business
  - Incentivo para feedback

## Configuração

### Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Resend API Key for sending emails
# Get your API key from: https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key_here

# Barbershop email address to receive booking notifications
BARBERSHOP_EMAIL=info@barbearia-cabanitas.pt

# Google Business Review Link (for post-service review requests)
GOOGLE_REVIEW_LINK=https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review
```

### Como Obter as Credenciais

#### 1. Resend API Key
1. Aceda a [https://resend.com](https://resend.com)
2. Crie uma conta ou faça login
3. Vá para "API Keys" no dashboard
4. Crie uma nova API key
5. Copie a key e adicione ao `.env.local`

#### 2. Google Business Review Link
1. Aceda ao [Google Business Profile](https://business.google.com)
2. Selecione a sua empresa
3. No menu lateral, clique em "Home"
4. Procure por "Get more reviews"
5. Copie o link de review e adicione ao `.env.local`

## Implementação de Agendamento de Emails

Atualmente, os emails de lembrete (30min antes) e review (1h depois) estão apenas registados no console. Para implementar o agendamento real, recomendamos:

### Opção 1: Vercel Cron Jobs (Recomendado para Vercel)
```typescript
// src/app/api/cron/send-reminders/route.ts
export async function GET(request: Request) {
  // Check for reminders to send
  // Query database for bookings 30 minutes from now
  // Send reminder emails
}
```

### Opção 2: Upstash QStash (Serverless)
```typescript
import { Client } from "@upstash/qstash";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Schedule reminder
await qstash.publishJSON({
  url: "https://your-domain.com/api/send-reminder",
  body: { bookingId: "..." },
  delay: reminderTime.getTime() - Date.now(),
});
```

### Opção 3: Database + Cron Job
1. Guardar marcações numa base de dados (Supabase, PostgreSQL, etc.)
2. Criar um cron job que corre a cada minuto
3. Verificar marcações que precisam de emails
4. Enviar emails e marcar como enviados

## Estrutura de Ficheiros

```
src/
├── components/
│   ├── booking-wizard.tsx       # Wizard de marcação (5 etapas)
│   └── booking-section.tsx      # Seção na página principal
├── app/
│   └── api/
│       └── bookings/
│           └── route.ts         # API endpoint para criar marcações
└── components/ui/
    ├── input.tsx                # Componente de input
    ├── textarea.tsx             # Componente de textarea
    ├── checkbox.tsx             # Componente de checkbox
    ├── button.tsx               # Componente de botão
    └── card.tsx                 # Componente de card
```

## Personalização

### Horários Disponíveis

Edite o objeto `timeSlots` em `booking-wizard.tsx`:

```typescript
const timeSlots = {
  morning: ["10:00", "11:30"],
  afternoon: ["12:00", "14:30", "16:00"],
  evening: ["18:00", "19:30"],
};
```

### Serviços

Edite o array `services` em `booking-wizard.tsx`:

```typescript
const services = [
  { id: "cabelo", name: "Cabelo", icon: "✂️" },
  { id: "barba", name: "Barba", icon: "🧔" },
  { id: "cabelo-barba", name: "Cabelo e Barba", icon: "💈" },
];
```

### Barbeiros

Edite o array `barbers` em `booking-wizard.tsx`:

```typescript
const barbers = [
  {
    id: "edgar",
    name: "Edgar",
    title: "Barbeiro Mestre | Proprietário",
    image: "/assets/edgar_placeholder.jpg",
  },
  // Adicione mais barbeiros aqui
];
```

## Próximos Passos

1. ✅ Configurar conta Resend e adicionar API key
2. ✅ Configurar email da barbearia
3. ✅ Obter link de review do Google Business
4. ⏳ Implementar sistema de agendamento de emails (cron/queue)
5. ⏳ Adicionar base de dados para guardar marcações
6. ⏳ Criar painel de administração para gerir marcações
7. ⏳ Adicionar sistema de cancelamento/reagendamento
8. ⏳ Integrar com Google Calendar (opcional)

## Suporte

Para questões ou problemas, contacte o desenvolvedor ou consulte a documentação:
- [Resend Docs](https://resend.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

