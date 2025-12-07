# ⏰ Alternativas para Cron Jobs - Envio de Emails

## 📋 Situação

O sistema precisa enviar lembretes **30 minutos antes** das marcações. Para isso, o cron job precisa executar frequentemente (idealmente a cada 5 minutos).

## ⚠️ Limitação do Vercel Hobby Plan

O plano Hobby do Vercel só permite cron jobs que executam **uma vez por dia**. O cron expression `*/5 * * * *` (a cada 5 minutos) requer upgrade para o plano Pro.

## ✅ Soluções

### 1. Cron-Job.org (Gratuito) ⭐ Recomendado

**Vantagens:**
- ✅ Totalmente gratuito
- ✅ Executa a cada 5 minutos
- ✅ Interface simples
- ✅ Logs e histórico

**Como configurar:**

1. Aceda a [cron-job.org](https://cron-job.org) e crie uma conta
2. Clique em **"Create cronjob"**
3. Configure:
   - **Title**: "Barbearia Cabanitas - Email Reminders"
   - **Address (URL)**: `https://your-domain.vercel.app/api/cron/send-reminders`
   - **Schedule**: `*/5 * * * *` (a cada 5 minutos)
   - **Request method**: GET
   - **Request headers**: 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```
     (Se configurou `CRON_SECRET` no Vercel)
   - **Request timeout**: 60 segundos
4. Clique em **"Create cronjob"**

**Nota**: Se não configurou `CRON_SECRET`, pode deixar os headers vazios, mas é recomendado configurar para segurança.

### 2. Upstash QStash (Gratuito até 10k/mês)

**Vantagens:**
- ✅ Gratuito até 10.000 requisições/mês
- ✅ Muito confiável
- ✅ API simples
- ✅ Integração fácil

**Como configurar:**

1. Aceda a [upstash.com](https://upstash.com) e crie uma conta
2. Vá para **QStash** no dashboard
3. Crie um novo schedule:
   ```bash
   curl -X POST https://qstash.upstash.io/v2/schedules \
     -H "Authorization: Bearer YOUR_QSTASH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "destination": "https://your-domain.vercel.app/api/cron/send-reminders",
       "cron": "*/5 * * * *",
       "headers": {
         "Authorization": "Bearer YOUR_CRON_SECRET"
       }
     }'
   ```

### 3. EasyCron (Gratuito com limitações)

**Vantagens:**
- ✅ Gratuito (com limitações)
- ✅ Interface amigável

**Limitações:**
- Máximo 1 cron job gratuito
- Execução a cada 5 minutos (gratuito)

### 4. Vercel Pro Plan 💎

**Vantagens:**
- ✅ Tudo integrado no Vercel
- ✅ Sem serviços externos
- ✅ Melhor para produção

**Preço**: $20/mês

**Como configurar:**

1. Upgrade para Pro em [vercel.com/pricing](https://vercel.com/pricing)
2. Atualize `vercel.json`:
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
3. Faça push e o cron job será atualizado automaticamente

## 🔒 Segurança

Para proteger o endpoint quando usar serviços externos, configure `CRON_SECRET`:

1. No Vercel, adicione a variável de ambiente:
   ```env
   CRON_SECRET=your-random-secret-here
   ```

2. No serviço externo, adicione o header:
   ```
   Authorization: Bearer your-random-secret-here
   ```

3. O endpoint verificará automaticamente este token

## 📊 Comparação

| Serviço | Preço | Frequência | Facilidade | Recomendado |
|---------|-------|------------|------------|-------------|
| Cron-Job.org | Gratuito | A cada 5 min | ⭐⭐⭐⭐⭐ | ✅ Sim |
| Upstash QStash | Gratuito (10k/mês) | A cada 5 min | ⭐⭐⭐⭐ | ✅ Sim |
| EasyCron | Gratuito | A cada 5 min | ⭐⭐⭐ | ⚠️ Limitado |
| Vercel Pro | $20/mês | A cada 5 min | ⭐⭐⭐⭐⭐ | ✅ Produção |

## 🧪 Testar

Após configurar qualquer serviço, teste:

1. Crie uma marcação de teste com:
   - Data: Hoje
   - Hora: 30 minutos a partir de agora
   - Email: Seu email de teste

2. Aguarde o cron job executar (próximos 5 minutos)

3. Verifique se recebeu o email de lembrete

4. Verifique os logs no serviço escolhido

## 📝 Nota Final

Para a maioria dos casos, **Cron-Job.org** é a melhor opção gratuita. É simples, confiável e totalmente gratuito para uso básico.

