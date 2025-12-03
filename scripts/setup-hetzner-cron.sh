#!/bin/bash

# Script para configurar cron job na Hetzner
# Uso: bash scripts/setup-hetzner-cron.sh

echo "🚀 Configurando Cron Job para Barbearia Cabanitas"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
  echo "⚠️  Por favor rode como root: sudo bash scripts/setup-hetzner-cron.sh"
  exit
fi

# Pedir URL do domínio
read -p "📝 Digite o domínio da aplicação (ex: cabanitas.com): " DOMAIN

# Gerar token secreto
CRON_SECRET=$(openssl rand -hex 32)
echo "🔐 Token secreto gerado: $CRON_SECRET"
echo ""

# Adicionar ao .env se não existir
if ! grep -q "CRON_SECRET" .env; then
  echo "CRON_SECRET=$CRON_SECRET" >> .env
  echo "✅ Token adicionado ao .env"
else
  echo "⚠️  CRON_SECRET já existe no .env"
fi

# Criar script de cron
cat > /usr/local/bin/cabanitas-cron.sh << EOF
#!/bin/bash
curl -X GET -H "Authorization: Bearer $CRON_SECRET" https://$DOMAIN/api/cron/send-reminders >> /var/log/cabanitas-cron.log 2>&1
EOF

chmod +x /usr/local/bin/cabanitas-cron.sh
echo "✅ Script de cron criado em /usr/local/bin/cabanitas-cron.sh"

# Adicionar ao crontab
CRON_LINE="*/5 * * * * /usr/local/bin/cabanitas-cron.sh"
(crontab -l 2>/dev/null | grep -v "cabanitas-cron.sh"; echo "$CRON_LINE") | crontab -
echo "✅ Cron job adicionado (roda a cada 5 minutos)"

# Criar arquivo de log
touch /var/log/cabanitas-cron.log
chmod 644 /var/log/cabanitas-cron.log
echo "✅ Arquivo de log criado em /var/log/cabanitas-cron.log"

echo ""
echo "🎉 Configuração completa!"
echo ""
echo "📋 Próximos passos:"
echo "1. Reinicie a aplicação Next.js para carregar o novo CRON_SECRET"
echo "2. Aguarde 5 minutos para o primeiro cron rodar"
echo "3. Verifique os logs: tail -f /var/log/cabanitas-cron.log"
echo ""
echo "🔧 Comandos úteis:"
echo "  Ver cron jobs: crontab -l"
echo "  Ver logs: tail -f /var/log/cabanitas-cron.log"
echo "  Testar manualmente: /usr/local/bin/cabanitas-cron.sh"
echo ""

