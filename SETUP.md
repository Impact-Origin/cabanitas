# Sistema de Marcações - Barbearia Cabanitas

## 🚀 Setup Inicial

### 1. Instalar Dependências

```bash
bun install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Resend API Key (para envio de emails)
RESEND_API_KEY=re_your_api_key_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_secret_here

# Google Business Review Link
GOOGLE_REVIEW_LINK=https://g.page/r/YOUR_PLACE_ID/review

# Email da barbearia
BARBERSHOP_EMAIL=barbearia.cabanitas@example.com
```

### 3. Criar Utilizador Admin

Execute o script para criar o primeiro utilizador admin:

```bash
bun run scripts/create-admin.ts admin admin123
```

Isto criará um utilizador com:
- **Username**: admin
- **Password**: admin123

⚠️ **Importante**: Altere a password após o primeiro login!

### 4. Iniciar o Servidor

```bash
bun run dev
```

O site estará disponível em: http://localhost:3001

## 📋 Funcionalidades

### Para Clientes (Landing Page)

1. **Marcações Online** (`/`)
   - Escolher serviço (Cabelo, Barba, Cabelo e Barba)
   - Escolher barbeiro (Edgar ou sem preferência)
   - Selecionar data e hora
   - Preencher dados pessoais
   - Receber email de confirmação

### Para Administradores

1. **Login** (`/admin/login`)
   - Acesso com username e password

2. **Dashboard** (`/admin/dashboard`)
   - **Calendário**: Visualizar todas as marcações do mês
   - **Lista de Marcações**: Ver marcações por dia
   - **Nova Marcação**: Criar marcações manualmente
     - Nome (obrigatório)
     - Telefone (obrigatório)
     - Email (opcional)
     - Observações
   - **Gestão de Marcações**:
     - Ver detalhes completos
     - Atualizar estado (Confirmado, Concluído, Cancelado)
     - Eliminar marcações

## 📧 Sistema de Emails

O sistema envia automaticamente 3 tipos de emails:

### 1. Email de Confirmação
- **Quando**: Imediatamente após criar a marcação
- **Para**: Cliente e Barbearia
- **Conteúdo**: Detalhes completos da marcação

### 2. Email de Lembrete
- **Quando**: 30 minutos antes da marcação
- **Para**: Cliente (se tiver email)
- **Conteúdo**: Lembrete da marcação com detalhes

### 3. Email de Review
- **Quando**: 1 hora após o serviço
- **Para**: Cliente (se tiver email)
- **Conteúdo**: Pedido de avaliação no Google Business

### Configuração do Cron Job

O sistema usa um cron job que executa a cada 5 minutos para verificar e enviar emails.

**Para Vercel** (automático):
- O arquivo `vercel.json` já está configurado
- Os emails serão enviados automaticamente após o deploy

**Para outros serviços**:
- Configure um cron job para chamar: `GET /api/cron/send-reminders`
- Frequência recomendada: A cada 5 minutos

## 🗄️ Base de Dados

O sistema usa SQLite para armazenar as marcações.

**Localização**: `cabanitas.db` (na raiz do projeto)

### Tabelas:

#### `bookings`
- `id`: ID único
- `service`: Serviço (Cabelo, Barba, etc.)
- `barber`: Nome do barbeiro
- `date`: Data (YYYY-MM-DD)
- `time`: Hora (HH:MM)
- `name`: Nome do cliente
- `phone`: Telefone do cliente
- `email`: Email do cliente (opcional)
- `observations`: Observações
- `status`: Estado (pending, confirmed, completed, cancelled)
- `created_by`: Quem criou (client, admin)
- `reminder_sent`: Se o lembrete foi enviado (0/1)
- `review_sent`: Se o pedido de review foi enviado (0/1)
- `created_at`: Data de criação

#### `admin_users`
- `id`: ID único
- `username`: Nome de utilizador
- `password`: Password (hash bcrypt)
- `created_at`: Data de criação

## 🔐 Segurança

- Passwords são encriptadas com bcrypt
- Autenticação via NextAuth (JWT)
- Sessões seguras
- API protegida

## 📱 Responsivo

O site é totalmente responsivo:
- Desktop: Navegação completa
- Mobile: Menu lateral (drawer)
- Tablet: Layout adaptado

## 🎨 Design

- Estilo clássico e moderno
- Cores: Branco, preto, cinza
- Fonte: Playfair Display (títulos) + Geist (corpo)
- Animações suaves com Framer Motion

## 🛠️ Tecnologias

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Componentes**: shadcn/ui
- **Base de Dados**: SQLite (better-sqlite3)
- **Autenticação**: NextAuth.js
- **Emails**: Resend
- **Animações**: Framer Motion
- **Datas**: date-fns

## 📞 Suporte

Para questões ou problemas, contacte:
- Email: barbearia.cabanitas@example.com
- Telefone: +351 963 242 206

