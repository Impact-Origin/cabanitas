# 🚀 Migração para Neon PostgreSQL - Concluída!

## ✅ O que foi feito:

1. ✅ Instalado `@neondatabase/serverless`
2. ✅ Criado schema SQL para PostgreSQL (`schema.sql`)
3. ✅ Reescrito `src/lib/db.ts` para usar Neon
4. ✅ Atualizado todas as API routes para async/await
5. ✅ Removido dependência do SQLite

---

## 🔧 Configuração Necessária:

### Passo 1: Adicionar Variável de Ambiente

Crie/atualize o ficheiro `.env.local` na raiz do projeto:

```env
# Neon Database URL
DATABASE_URL=postgresql://neondb_owner:npg_XzkvW6EY0gJb@ep-crimson-wind-ahmo4r5a-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_secret_here

# Google Business Review Link
GOOGLE_REVIEW_LINK=https://g.page/r/YOUR_PLACE_ID/review

# Email da barbearia
BARBERSHOP_EMAIL=barbearia.cabanitas@example.com
```

---

### Passo 2: Criar Tabelas no Neon

**Opção A - Automático (Recomendado):**

As tabelas serão criadas automaticamente quando iniciar o servidor pela primeira vez!

**Opção B - Manual (via Neon Console):**

1. Aceda ao [Neon Console](https://console.neon.tech)
2. Selecione o seu projeto
3. Vá para "SQL Editor"
4. Cole o conteúdo do ficheiro `schema.sql`
5. Execute

---

### Passo 3: Iniciar o Servidor

```bash
bun run dev
```

O servidor vai:
1. Conectar ao Neon
2. Criar tabelas automaticamente (se não existirem)
3. Iniciar em http://localhost:3001

---

### Passo 4: Criar Utilizador Admin

```bash
curl -X POST http://localhost:3001/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","secret":"create-admin-secret-2025"}'
```

**Resposta esperada:**
```json
{
  "message": "Admin user created successfully",
  "username": "admin",
  "warning": "Please delete /api/admin/create route after setup"
}
```

⚠️ **Importante**: Após criar o admin, apague o ficheiro `/src/app/api/admin/create/route.ts` por segurança!

---

## 📊 Estrutura da Base de Dados:

### Tabela: `bookings`
```sql
- id (SERIAL PRIMARY KEY)
- service (VARCHAR)
- barber (VARCHAR)
- date (DATE)
- time (VARCHAR)
- name (VARCHAR)
- phone (VARCHAR)
- email (VARCHAR, nullable)
- observations (TEXT, nullable)
- status (VARCHAR, default: 'pending')
- created_at (TIMESTAMP)
- created_by (VARCHAR, default: 'client')
- reminder_sent (BOOLEAN, default: FALSE)
- review_sent (BOOLEAN, default: FALSE)
```

### Tabela: `admin_users`
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR, UNIQUE)
- password (VARCHAR)
- created_at (TIMESTAMP)
```

### Índices:
- `idx_bookings_date` - Para queries por data
- `idx_bookings_status` - Para queries por estado
- `idx_bookings_date_time` - Para queries combinadas
- `idx_unique_booking` - Previne marcações duplicadas

---

## 🔄 Diferenças vs SQLite:

| Aspecto | SQLite (Antes) | Neon PostgreSQL (Agora) |
|---------|----------------|-------------------------|
| **Localização** | Ficheiro local (`cabanitas.db`) | Cloud (Neon) |
| **Backups** | Manual | Automático |
| **Escalabilidade** | Limitada | Ilimitada |
| **Concurrent Writes** | Limitado | Excelente |
| **Produção** | Não recomendado | Recomendado |
| **Queries** | Síncronas | Assíncronas (async/await) |

---

## 🧪 Testar a Migração:

### 1. Testar Criação de Marcação (Cliente):
1. Aceda a http://localhost:3001
2. Clique em "Marcações"
3. Complete o wizard
4. Verifique se a marcação aparece no dashboard admin

### 2. Testar Dashboard Admin:
1. Login: http://localhost:3001/admin/login
2. Verifique se o calendário carrega
3. Crie uma marcação manual
4. Verifique se aparece no calendário

### 3. Verificar Base de Dados:
```bash
# Via Neon Console
https://console.neon.tech

# Ou via psql
psql "postgresql://neondb_owner:npg_XzkvW6EY0gJb@ep-crimson-wind-ahmo4r5a-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Ver marcações
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10;

# Ver admins
SELECT id, username, created_at FROM admin_users;
```

---

## 🚨 Resolução de Problemas:

### Erro: "Connection refused"
- Verifique se `DATABASE_URL` está correto no `.env.local`
- Verifique se o Neon está ativo (pode estar em sleep mode)

### Erro: "relation 'bookings' does not exist"
- As tabelas não foram criadas
- Execute o `schema.sql` manualmente no Neon Console

### Erro: "password authentication failed"
- Verifique as credenciais na `DATABASE_URL`
- Regenere a password no Neon Console se necessário

### Erro: "too many connections"
- Use connection pooling (já configurado com `-pooler`)
- Verifique se não tem múltiplas instâncias a correr

---

## 📈 Vantagens do Neon:

✅ **Serverless**: Escala automaticamente
✅ **Branching**: Crie branches da BD para testes
✅ **Backups**: Automáticos e point-in-time recovery
✅ **Performance**: Muito mais rápido que SQLite
✅ **Produção**: Pronto para deploy
✅ **Monitoring**: Dashboard com métricas
✅ **Free Tier**: Generoso para começar

---

## 🎉 Migração Completa!

O sistema agora usa **Neon PostgreSQL** em vez de SQLite!

Todos os ficheiros foram atualizados e estão prontos para usar.

**Próximos passos:**
1. ✅ Adicionar `DATABASE_URL` ao `.env.local`
2. ✅ Iniciar servidor (`bun run dev`)
3. ✅ Criar utilizador admin
4. ✅ Testar sistema completo
5. ✅ Deploy para produção (Vercel recomendado)

---

## 📞 Suporte:

Se tiver problemas:
1. Verifique os logs do servidor
2. Verifique o Neon Console para erros
3. Teste a conexão manualmente com `psql`

**Tudo pronto! 🚀**

