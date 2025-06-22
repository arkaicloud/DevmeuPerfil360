# 🚀 RESUMO DE DEPLOY - MeuPerfil360.com.br

## ARQUIVOS CRIADOS PARA DEPLOY

### 📋 Manuais e Documentação
- **DEPLOY_PRODUCTION.md** - Manual completo passo a passo
- **CHECKLIST_DEPLOY.md** - Lista de verificação com todos os itens
- **comandos-deploy.sh** - Script automatizado para configuração do servidor

### ⚙️ Configurações de Produção
- **.env.production** - Template com todas as variáveis de ambiente
- **server/config.ts** - Atualizado para domínio meuperfil360.com.br

## COMANDOS ESSENCIAIS

### 1. No Servidor (após conectar via SSH)
```bash
# Executar script de configuração
chmod +x comandos-deploy.sh
./comandos-deploy.sh
```

### 2. Configuração de Ambiente
```bash
# Copiar template e configurar
cp .env.production .env
nano .env

# Configurar estas variáveis OBRIGATORIAMENTE:
# STRIPE_SECRET_KEY=sk_live_...
# VITE_STRIPE_PUBLIC_KEY=pk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# SMTP_PASSWORD=...
# JWT_SECRET=... (openssl rand -hex 32)
# ENCRYPTION_KEY=... (openssl rand -hex 32)
# SESSION_SECRET=... (openssl rand -hex 32)
```

### 3. SSL e Inicialização
```bash
# Gerar SSL (após DNS configurado)
sudo certbot --nginx -d meuperfil360.com.br -d www.meuperfil360.com.br

# Iniciar aplicação
cd ~/app
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## CONFIGURAÇÕES CRÍTICAS

### 🌐 DNS (Antes de tudo)
- **meuperfil360.com.br** → IP do servidor
- **www.meuperfil360.com.br** → IP do servidor

### 🔑 Stripe Production
- Trocar todas as chaves para **sk_live_** e **pk_live_**
- Configurar webhook: **https://meuperfil360.com.br/api/stripe/webhook**
- Eventos: checkout.session.completed, payment_intent.succeeded

### 📧 Email SMTP
- Manter Gmail atual: meuperfil360@gmail.com
- Gerar senha de aplicativo no Google

## VERIFICAÇÕES FINAIS

### ✅ URLs para Testar
- https://meuperfil360.com.br
- https://meuperfil360.com.br/admin/login
- https://meuperfil360.com.br/health

### ✅ Fluxo Completo
1. Teste DISC completo
2. Registro de usuário
3. Login no dashboard
4. Upgrade premium via Stripe
5. Download do PDF
6. Recebimento de emails

## CONTATOS IMPORTANTES

- **Admin**: adm@meuperfil360.com.br / admin123456
- **Email Suporte**: suporte@meuperfil360.com.br
- **Stripe Dashboard**: https://dashboard.stripe.com

---

**Status**: ✅ PRONTO PARA DEPLOY

Todos os arquivos estão configurados e prontos para deploy no domínio **meuperfil360.com.br**.