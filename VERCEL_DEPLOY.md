# 🚀 Guia de Deploy para Vercel

Este guia explica como fazer deploy da aplicação Barbearia Cabanitas no Vercel e configurar o cron job para envio automático de emails.

## 📋 Pré-requisitos

1. Conta no [Vercel](https://vercel.com)
2. Conta no [Neon](https://neon.tech) (PostgreSQL)
3. Conta no [Resend](https://resend.com) (envio de emails)
4. Repositório Git (GitHub, GitLab ou Bitbucket)

## 🔧 Passo 1: Preparar o Repositório

Certifique-se de que o código está num repositório Git:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## 🌐 Passo 2: Deploy no Vercel

### 2.1. Importar Projeto

1. Aceda a [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New..."** → **"Project"**
3. Importe o seu repositório Git
4. O Vercel detectará automaticamente que é um projeto Next.js

### 2.2. Configurar Variáveis de Ambiente

No painel do Vercel, adicione as seguintes variáveis de ambiente:

#### Variáveis Obrigatórias:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-random-secret-here-generate-with-openssl-rand-base64-32

# Resend (Email Service)
RESEND_API_KEY=re_your_resend_api_key_here
```

#### Variáveis Opcionais:

```env
# Google Review Link
GOOGLE_REVIEW_LINK=https://g.page/r/YOUR_PLACE_ID/review

# Email da Barbearia (para notificações)
BARBERSHOP_EMAIL=barbearia.cabanitas@example.com

# Cron Secret (para testes manuais - opcional)
CRON_SECRET=your-secret-for-manual-testing
```

**Como gerar `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

### 2.3. Configurar Build Settings

O Vercel detecta automaticamente as configurações do Next.js, mas verifique:

- **Framework Preset**: Next.js
- **Build Command**: `next build` (automático)
- **Output Directory**: `.next` (automático)
- **Install Command**: `bun install` ou `npm install`

### 2.4. Fazer Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar
3. A aplicação estará disponível em `https://your-project.vercel.app`

## ⏰ Passo 3: Configurar Cron Job

O cron job já está configurado no arquivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**O que este cron faz:**
- Executa a cada 5 minutos
- Verifica marcações que precisam de lembretes (30 minutos antes)
- Verifica marcações que precisam de pedidos de review (1 hora depois)
- Envia emails automaticamente

### Verificar Cron Job

Após o deploy:

1. Aceda ao painel do Vercel
2. Vá para **Settings** → **Cron Jobs**
3. Verifique se o cron job está ativo
4. Pode ver os logs em **Deployments** → selecione um deployment → **Functions** → `/api/cron/send-reminders`

## 🧪 Passo 4: Testar o Cron Job

### Opção 1: Teste Manual (com CRON_SECRET)

Se configurou `CRON_SECRET`, pode testar manualmente:

```bash
curl -X GET https://your-domain.vercel.app/api/cron/send-reminders \
  -H "Authorization: Bearer your-cron-secret"
```

### Opção 2: Usar o Endpoint de Teste

Crie uma marcação de teste com:
- Data: Hoje
- Hora: 30 minutos a partir de agora
- Email: Seu email de teste

O cron job enviará automaticamente o email nos próximos 5 minutos.

### Opção 3: Verificar Logs no Vercel

1. Aceda ao painel do Vercel
2. Vá para **Deployments**
3. Clique no deployment mais recente
4. Vá para **Functions** → `/api/cron/send-reminders`
5. Veja os logs de execução

## 📧 Passo 5: Configurar Resend

### 5.1. Obter API Key

1. Aceda a [resend.com](https://resend.com)
2. Crie uma conta ou faça login
3. Vá para **API Keys**
4. Crie uma nova API Key
5. Copie a chave (começa com `re_`)

### 5.2. Verificar Domínio (Opcional mas Recomendado)

Para usar um email personalizado (ex: `noreply@cabanitas.pt`):

1. No Resend, vá para **Domains**
2. Adicione o seu domínio
3. Configure os registos DNS conforme instruções
4. Atualize o `from` nos emails no código

**Nota**: Por padrão, o sistema usa `onboarding@resend.dev` que funciona imediatamente.

## 🗄️ Passo 6: Configurar Neon Database

### 6.1. Criar Base de Dados

1. Aceda a [neon.tech](https://neon.tech)
2. Crie um novo projeto
3. Copie a connection string (DATABASE_URL)

### 6.2. Executar Schema

1. Copie o conteúdo de `schema.sql`
2. No painel do Neon, vá para **SQL Editor**
3. Cole e execute o schema
4. Ou use a CLI do Neon:

```bash
psql "your-database-url" < schema.sql
```

### 6.3. Criar Utilizador Admin

Após o deploy, execute este script localmente (ou crie um endpoint temporário):

```typescript
// scripts/create-admin.ts
import { adminDb } from "@/lib/db";
import bcrypt from "bcryptjs";

async function createAdmin() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "admin123";
  
  const hashedPassword = await bcrypt.hash(password, 10);
  await adminDb.create({ username, password: hashedPassword });
  
  console.log(`✅ Admin user created: ${username}`);
}

createAdmin();
```

Ou crie manualmente na base de dados:

```sql
INSERT INTO admin_users (username, password) 
VALUES ('admin', '$2a$10$hashedpasswordhere');
```

## 🔍 Passo 7: Verificar Tudo

### Checklist:

- [ ] Aplicação está acessível no domínio Vercel
- [ ] Login admin funciona (`/admin/login`)
- [ ] Pode criar marcações
- [ ] Emails de confirmação são enviados
- [ ] Cron job está ativo no painel Vercel
- [ ] Logs do cron job mostram execuções
- [ ] Base de dados está conectada e funcionando

## 🐛 Troubleshooting

### Cron Job não está a executar

1. Verifique se `vercel.json` está no repositório
2. Verifique os logs em **Deployments** → **Functions**
3. Certifique-se de que o cron está ativo em **Settings** → **Cron Jobs**

### Emails não são enviados

1. Verifique se `RESEND_API_KEY` está configurada
2. Verifique os logs do cron job
3. Verifique se o email do cliente está correto
4. Verifique a caixa de spam

### Erro de conexão à base de dados

1. Verifique se `DATABASE_URL` está correta
2. Verifique se o Neon permite conexões externas
3. Verifique se o SSL está habilitado (`?sslmode=require`)

### Erro de autenticação NextAuth

1. Verifique se `NEXTAUTH_URL` está correto (deve ser o domínio Vercel)
2. Verifique se `NEXTAUTH_SECRET` está configurado
3. Limpe cookies e tente novamente

## 📊 Monitorização

### Ver Logs em Tempo Real

1. No Vercel, vá para **Deployments**
2. Clique no deployment
3. Veja **Functions** para logs de API routes
4. Veja **Logs** para logs gerais

### Verificar Execuções do Cron

1. Vá para **Settings** → **Cron Jobs**
2. Clique no cron job
3. Veja histórico de execuções
4. Veja logs de cada execução

## 🔄 Atualizações Futuras

Para atualizar a aplicação:

```bash
git add .
git commit -m "Update description"
git push origin main
```

O Vercel fará deploy automaticamente!

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs no Vercel
2. Verifique as variáveis de ambiente
3. Teste localmente primeiro
4. Consulte a documentação do Vercel: https://vercel.com/docs

---

**Pronto!** A sua aplicação está no ar e o cron job está a enviar emails automaticamente! 🎉

