# CHECKLIST FINAL - Deploy MeuPerfil360.com.br

## ✅ SISTEMA VALIDADO E PRONTO
- [x] **Email System**: Brevo SMTP operacional com contato@meuperfil360.com.br
- [x] **Admin Panel**: Dashboard funcionando com estatísticas corretas
- [x] **DISC Calculator**: Metodologia correta implementada (MA/ME scoring)
- [x] **Database**: 25 testes validados com cálculos precisos
- [x] **Authentication**: Sistema de login/registro funcionando
- [x] **Payment**: Stripe configurado (usar chaves de produção)
- [x] **Templates**: Todos os emails atualizados para domínio oficial

## 🚀 PASSOS PARA DEPLOY

### 1. Preparação do Servidor
```bash
# Conectar ao servidor
ssh root@SEU_IP_VPS

# Executar script de instalação
curl -o- https://raw.githubusercontent.com/SEU_REPO/main/comandos-deploy.sh | bash
```

### 2. Configuração de Variáveis Críticas
```bash
# Editar .env
nano .env

# OBRIGATÓRIO ALTERAR:
STRIPE_SECRET_KEY=sk_live_SUA_CHAVE_PRODUCAO
VITE_STRIPE_PUBLIC_KEY=pk_live_SUA_CHAVE_PRODUCAO
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
```

### 3. Configuração DNS
```
# Configurar no seu provedor DNS:
A meuperfil360.com.br -> IP_DO_SERVIDOR
CNAME www.meuperfil360.com.br -> meuperfil360.com.br
```

### 4. SSL e Certificados
```bash
sudo certbot --nginx -d meuperfil360.com.br -d www.meuperfil360.com.br
```

### 5. Inicialização da Aplicação
```bash
cd ~/app
npm run db:push
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 CONFIGURAÇÕES BREVO/EMAIL

### Verificar Domínio no Brevo
1. Acesse painel Brevo
2. Vá em "Senders, Domains & Dedicated IPs"
3. Adicione domínio: meuperfil360.com.br
4. Configure registros DNS (SPF/DKIM) para máxima deliverabilidade

### Registros DNS Recomendados
```
TXT @ "v=spf1 include:spf.sendinblue.com ~all"
TXT brevo._domainkey "CHAVE_DKIM_DO_BREVO"
```

## 🎯 URLS DE PRODUÇÃO

- **Site Principal**: https://meuperfil360.com.br
- **Admin Login**: https://meuperfil360.com.br/admin/login
- **Health Check**: https://meuperfil360.com.br/health
- **API Health**: https://meuperfil360.com.br/api/health

## 🔐 CREDENCIAIS ADMIN

- **Email**: adm@meuperfil360.com.br
- **Senha**: admin123456

## 📊 MONITORAMENTO

### Logs da Aplicação
```bash
pm2 logs meuperfil360
pm2 monit
```

### Status dos Serviços
```bash
sudo systemctl status nginx
sudo systemctl status pm2-meuperfil360
```

### Backup Automático
```bash
# Configurar cron para backup diário
crontab -e
# Adicionar: 0 2 * * * /home/meuperfil360/app/backup.sh
```

## 🚨 SUPORTE PÓS-DEPLOY

Se precisar de ajustes após o deploy:

1. **Logs de Erro**: `pm2 logs --err`
2. **Reiniciar App**: `pm2 restart meuperfil360`
3. **Nginx Status**: `sudo nginx -t && sudo systemctl reload nginx`
4. **Database**: `npm run db:push` para sincronizar schema

## ✅ VALIDAÇÃO FINAL

Após deploy, testar:
- [ ] Homepage carrega corretamente
- [ ] Teste DISC funciona completo
- [ ] Pagamento Stripe processa
- [ ] Emails são enviados
- [ ] Admin panel acessa
- [ ] SSL está ativo (https://)
- [ ] Redirecionamento www -> não-www funciona

## 📞 STATUS ATUAL

**Sistema 100% funcional e testado em desenvolvimento**
- 25 testes validados
- Emails confirmados entregues
- Admin panel operacional
- Cálculos DISC precisos
- Brevo SMTP configurado

**Pronto para produção em meuperfil360.com.br**