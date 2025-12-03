# Deploy do Cron Job - Guia Completo

## 🎯 Opção 1: Vercel Cron (RECOMENDADO - Mais Fácil)

### Vantagens
- ✅ Configuração automática
- ✅ Gratuito no plano hobby
- ✅ Já está configurado no `vercel.json`
- ✅ Logs integrados
- ✅ Não precisa de servidor extra

### Como Fazer Deploy

**1. Instalar Vercel CLI**
```bash
npm i -g vercel
```

**2. Login no Vercel**
```bash
vercel login
```

**3. Deploy**
```bash
vercel --prod
```

**4. Pronto! 🎉**
O cron job vai rodar automaticamente a cada 5 minutos.

### Verificar se está a funcionar
1. Acesse: https://vercel.com/dashboard
2. Vá ao seu projeto
3. Clique em "Cron Jobs"
4. Veja os logs de execução

### Alterar Frequência
Edite `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "*/5 * * * *"  // A cada 5 minutos
      // "schedule": "*/10 * * * *"  // A cada 10 minutos
      // "schedule": "0 * * * *"     // A cada hora
    }
  ]
}
```

---

## 🖥️ Opção 2: Hetzner (Servidor VPS)

### Vantagens
- ✅ Controlo total
- ✅ Mais barato a longo prazo
- ✅ Pode rodar outros serviços

### Desvantagens
- ❌ Precisa configurar servidor
- ❌ Precisa manter servidor atualizado
- ❌ Mais complexo

### Passo a Passo

**1. Fazer Deploy da Aplicação Next.js**

```bash
# No servidor Hetzner
git clone seu-repositorio
cd cabanitas
npm install
npm run build

# Instalar PM2 para manter app rodando
npm install -g pm2
pm2 start npm --name "cabanitas" -- start
pm2 save
pm2 startup
```

**2. Configurar Cron Job no Sistema**

```bash
# Editar crontab
crontab -e

# Adicionar linha (roda a cada 5 minutos)
*/5 * * * * curl -X GET https://seu-dominio.com/api/cron/send-reminders

# Ou com autenticação (mais seguro)
*/5 * * * * curl -X GET -H "Authorization: Bearer SEU_TOKEN_SECRETO" https://seu-dominio.com/api/cron/send-reminders
```

**3. Proteger o Endpoint (IMPORTANTE!)**

Edite `src/app/api/cron/send-reminders/route.ts`:

```typescript
export async function GET(request: Request) {
  // Verificar token de segurança
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // ... resto do código
}
```

Adicione ao `.env`:
```
CRON_SECRET=seu_token_super_secreto_aqui
```

---

## ☁️ Opção 3: Cloudflare Pages + Workers

### Vantagens
- ✅ Gratuito (250,000 requests/dia)
- ✅ Global CDN
- ✅ Rápido

### Desvantagens
- ❌ Cloudflare Pages não suporta Next.js API routes nativamente
- ❌ Precisa usar Cloudflare Workers separadamente

### Solução: Usar Cloudflare Workers Cron

**1. Criar Worker para Cron**

Crie `workers/cron-reminders.js`:
```javascript
export default {
  async scheduled(event, env, ctx) {
    // Chamar sua API hospedada
    const response = await fetch('https://seu-dominio.com/api/cron/send-reminders', {
      headers: {
        'Authorization': `Bearer ${env.CRON_SECRET}`
      }
    });
    
    console.log('Cron executed:', await response.json());
  }
}
```

**2. Configurar wrangler.toml**
```toml
name = "cabanitas-cron"
main = "workers/cron-reminders.js"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/5 * * * *"]

[vars]
CRON_SECRET = "seu_token_secreto"
```

**3. Deploy**
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

---

## 🔧 Opção 4: Serviços Externos de Cron

### EasyCron (https://www.easycron.com)
- ✅ Gratuito até 100 tarefas/mês
- ✅ Interface web simples
- ✅ Notificações de falhas

**Configuração:**
1. Criar conta
2. Adicionar novo cron job
3. URL: `https://seu-dominio.com/api/cron/send-reminders`
4. Frequência: `*/5 * * * *`
5. Adicionar header: `Authorization: Bearer SEU_TOKEN`

### cron-job.org (https://cron-job.org)
- ✅ Gratuito
- ✅ Simples
- ✅ Confiável

**Configuração:**
1. Criar conta
2. Criar novo job
3. URL: `https://seu-dominio.com/api/cron/send-reminders`
4. Intervalo: 5 minutos
5. Salvar

---

## 📊 Comparação

| Opção | Custo | Facilidade | Confiabilidade |
|-------|-------|------------|----------------|
| **Vercel Cron** | Grátis | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Hetzner VPS** | ~€5/mês | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cloudflare Workers** | Grátis | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **EasyCron** | Grátis | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 Recomendação Final

### Para Começar Rápido:
**Use Vercel Cron** - Já está configurado, é gratuito e funciona perfeitamente.

### Se já tem Hetzner:
**Use Cron do Sistema** - Adicione uma linha no crontab, simples e eficaz.

### Para Produção Séria:
**Vercel Cron ou Cloudflare Workers** - Mais confiáveis e escaláveis.

---

## 🔍 Testar Localmente

Antes de fazer deploy, teste o endpoint:

```bash
# Terminal
curl http://localhost:3000/api/cron/send-reminders

# Ou no browser
http://localhost:3000/api/cron/send-reminders
```

Deve retornar:
```json
{
  "success": true,
  "remindersSent": 0,
  "reviewsSent": 0
}
```

---

## 📝 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas (DATABASE_URL, RESEND_API_KEY)
- [ ] Endpoint de cron testado localmente
- [ ] Token de segurança configurado (se usar)
- [ ] Frequência do cron definida (5 minutos recomendado)
- [ ] Logs configurados para monitorar
- [ ] Email da barbearia atualizado no código
- [ ] Link do Google Reviews configurado (opcional)

---

## 🆘 Troubleshooting

**Cron não está rodando:**
1. Verificar logs do Vercel/servidor
2. Testar endpoint manualmente
3. Verificar variáveis de ambiente
4. Verificar conexão com base de dados

**Emails não estão sendo enviados:**
1. Verificar RESEND_API_KEY
2. Verificar se há marcações que precisam de lembretes
3. Verificar logs de erro
4. Testar Resend API separadamente

**Lembretes duplicados:**
1. Verificar se tem múltiplos crons rodando
2. Verificar campo `reminder_sent` na base de dados
3. Adicionar logs para debug

