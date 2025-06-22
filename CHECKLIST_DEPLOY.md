# ✅ CHECKLIST DE DEPLOY - MeuPerfil360.com.br

## PRÉ-REQUISITOS (Antes de executar comandos)

### 🌐 DNS e Domínio
- [ ] Domínio meuperfil360.com.br apontando para IP do servidor
- [ ] Subdomínio www.meuperfil360.com.br apontando para o mesmo IP
- [ ] Propagação DNS confirmada (ping meuperfil360.com.br)

### 🔑 Chaves e Credenciais
- [ ] Chaves Stripe PRODUCTION obtidas (sk_live_ e pk_live_)
- [ ] Webhook Stripe configurado para https://meuperfil360.com.br/api/stripe/webhook
- [ ] Senha de aplicativo Gmail gerada para SMTP
- [ ] Chaves de segurança geradas (JWT_SECRET, ENCRYPTION_KEY, SESSION_SECRET)

## DEPLOY NO SERVIDOR

### 📦 1. Preparação do Sistema
```bash
# Conectar ao servidor
ssh root@SEU_IP_SERVIDOR

# Executar script de preparação
chmod +x comandos-deploy.sh
./comandos-deploy.sh
```
- [ ] Node.js 20.x instalado
- [ ] PM2 instalado globalmente
- [ ] Nginx instalado
- [ ] Certbot instalado
- [ ] Usuário meuperfil360 criado

### 📁 2. Código da Aplicação
```bash
# Trocar para usuário da aplicação
su - meuperfil360
cd ~/app

# Clonar repositório (substitua pela URL correta)
git clone https://github.com/SEU_USUARIO/meuperfil360.git .
```
- [ ] Código transferido para ~/app
- [ ] Dependências instaladas (npm install --omit=dev)
- [ ] Build do frontend criado (npm run build)
- [ ] Build do backend criado (npx tsc -b)

### ⚙️ 3. Configuração de Ambiente
```bash
# Copiar template de produção
cp .env.production .env
nano .env
```
**Configurar estas variáveis obrigatoriamente:**
- [ ] STRIPE_SECRET_KEY=sk_live_... (PRODUÇÃO)
- [ ] VITE_STRIPE_PUBLIC_KEY=pk_live_... (PRODUÇÃO)
- [ ] STRIPE_WEBHOOK_SECRET=whsec_... (PRODUÇÃO)
- [ ] SMTP_PASSWORD=... (senha app Gmail)
- [ ] JWT_SECRET=... (64 caracteres)
- [ ] ENCRYPTION_KEY=... (64 caracteres)
- [ ] SESSION_SECRET=... (64 caracteres)

### 🌐 4. Configuração do Nginx
```bash
# Verificar configuração
sudo nginx -t
sudo systemctl reload nginx
```
- [ ] Arquivo de configuração criado
- [ ] Site habilitado no Nginx
- [ ] Site padrão removido
- [ ] Nginx recarregado sem erros

### 🔒 5. Configuração SSL
```bash
# Gerar certificados SSL
sudo certbot --nginx -d meuperfil360.com.br -d www.meuperfil360.com.br
```
- [ ] Certificados SSL gerados
- [ ] HTTPS funcionando
- [ ] Redirecionamento HTTP->HTTPS ativo
- [ ] Renovação automática configurada

### 🚀 6. Inicialização da Aplicação
```bash
cd ~/app
mkdir -p logs

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Executar comando mostrado pelo PM2
```
- [ ] Aplicação iniciada com PM2
- [ ] PM2 configurado para boot automático
- [ ] Logs sendo gerados

### 💾 7. Banco de Dados
```bash
# Aplicar schema
npm run db:push
```
- [ ] Schema aplicado ao banco
- [ ] Conexão com Neon Database funcionando
- [ ] Tabelas criadas corretamente

## VERIFICAÇÕES FINAIS

### 🧪 8. Testes de Funcionamento
- [ ] Site carregando: https://meuperfil360.com.br
- [ ] Admin acessível: https://meuperfil360.com.br/admin/login
- [ ] Health check: https://meuperfil360.com.br/health
- [ ] Redirecionamento www funcionando
- [ ] SSL válido (cadeado verde)

### 🔄 9. Funcionalidades Críticas
- [ ] Teste DISC funcionando completo
- [ ] Sistema de login operacional
- [ ] Dashboard carregando
- [ ] Checkout com Stripe funcionando
- [ ] Geração de PDF premium
- [ ] Envio de emails automático
- [ ] Busca de resultados operacional

### 📊 10. Webhook e Pagamentos
```bash
# No painel Stripe (https://dashboard.stripe.com/webhooks)
# Adicionar endpoint: https://meuperfil360.com.br/api/stripe/webhook
# Eventos: checkout.session.completed, payment_intent.succeeded
```
- [ ] Webhook Stripe configurado
- [ ] Teste de pagamento realizado
- [ ] Upgrade premium funcionando
- [ ] Email de confirmação enviado

## MONITORAMENTO E MANUTENÇÃO

### 📈 11. Comandos de Monitoramento
```bash
# Status da aplicação
pm2 status
pm2 logs meuperfil360

# Status do Nginx
sudo systemctl status nginx

# Uso de recursos
pm2 monit
```
- [ ] Logs sem erros críticos
- [ ] CPU e memória em níveis normais
- [ ] Todos os processos rodando

### 🔄 12. Backup e Segurança
```bash
# Configurar backup
chmod +x ~/backup.sh
crontab -e
# Adicionar: 0 2 * * * /home/meuperfil360/backup.sh
```
- [ ] Script de backup configurado
- [ ] Cron job para backup diário
- [ ] Firewall configurado (portas 22, 80, 443)

## URLS IMPORTANTES

- 🌐 **Site Principal**: https://meuperfil360.com.br
- 👨‍💼 **Admin Panel**: https://meuperfil360.com.br/admin/login
- ❤️ **Health Check**: https://meuperfil360.com.br/health
- 💳 **Stripe Dashboard**: https://dashboard.stripe.com
- 📧 **Email SMTP**: Gmail App Passwords

## CONTATOS DE EMERGÊNCIA

- 🔧 **Suporte Técnico**: [SEU_EMAIL]
- 💰 **Stripe Support**: https://support.stripe.com
- 🌐 **DNS Provider**: [PROVEDOR_DNS]
- 🏢 **Hosting Provider**: [PROVEDOR_SERVIDOR]

---

## ✅ DEPLOY COMPLETO!

Quando todos os itens estiverem marcados, a aplicação estará totalmente funcional em produção no domínio meuperfil360.com.br.

**Última verificação**: Acesse https://meuperfil360.com.br e faça um teste completo da jornada do usuário (teste DISC → resultado → upgrade premium → PDF).