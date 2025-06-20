# Lista de Verificação Rápida - Deploy VPS

## ✅ ANTES DE INICIAR O DEPLOY

### 1. Arquivos Obrigatórios no VPS
- [ ] Código da aplicação transferido para `/home/meuperfil360/app/`
- [ ] Arquivo `.env` configurado com variáveis de produção
- [ ] Arquivo `ecosystem.config.js` presente
- [ ] Scripts `deploy.sh` e `backup.sh` executáveis

### 2. Configurações de Servidor
- [ ] Node.js 20.x instalado
- [ ] PM2 instalado globalmente
- [ ] Nginx instalado e configurado
- [ ] PostgreSQL instalado (ou string de conexão externa)
- [ ] Certificado SSL configurado (Let's Encrypt)

### 3. Variáveis de Ambiente Críticas (.env)
```bash
NODE_ENV=production
PORT=3000
DOMAIN=https://www.meuperfil360.com.br
DATABASE_URL=postgresql://usuario:senha@localhost:5432/meuperfil360
STRIPE_SECRET_KEY=sk_live_sua_chave_stripe
VITE_STRIPE_PUBLIC_KEY=pk_live_sua_chave_stripe_publica
ADMIN_PASSWORD=senha_admin_super_segura
JWT_SECRET=chave_jwt_64_caracteres_minimo
ENCRYPTION_KEY=chave_encryption_64_caracteres_minimo
```

## 🚀 SEQUÊNCIA DE DEPLOY

### 1. Preparação (Execute como root)
```bash
chmod +x install-vps.sh
./install-vps.sh
```

### 2. Transferir Código (Execute no seu computador)
```bash
scp -r /caminho/projeto/* usuario@seu-ip:/home/meuperfil360/app/
```

### 3. Configurar Aplicação (Execute como meuperfil360)
```bash
su - meuperfil360
cd app
cp .env.vps .env
# Editar .env com suas configurações reais
nano .env
npm install --production
npm run build
npm run db:push
```

### 4. Configurar Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/meuperfil360
sudo ln -sf /etc/nginx/sites-available/meuperfil360 /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Configurar SSL
```bash
sudo certbot --nginx -d www.meuperfil360.com.br -d meuperfil360.com.br
```

### 6. Iniciar Aplicação
```bash
cd /home/meuperfil360/app
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔍 TESTES DE VERIFICAÇÃO

### 1. Conectividade Básica
```bash
curl -I http://www.meuperfil360.com.br
curl -I https://www.meuperfil360.com.br
```

### 2. API Funcionando
```bash
curl https://www.meuperfil360.com.br/api/health
curl https://www.meuperfil360.com.br/api/pricing
```

### 3. SSL Válido
```bash
openssl s_client -connect www.meuperfil360.com.br:443 -servername www.meuperfil360.com.br
```

### 4. Status da Aplicação
```bash
pm2 status
pm2 logs meuperfil360 --lines 20
```

## 🛠️ COMANDOS ÚTEIS PÓS-DEPLOY

### Monitoramento
```bash
# Status geral
sudo -u meuperfil360 /home/meuperfil360/status.sh

# Logs em tempo real
pm2 logs meuperfil360

# Monitoramento de recursos
pm2 monit

# Logs do Nginx
sudo tail -f /var/log/nginx/meuperfil360_access.log
sudo tail -f /var/log/nginx/meuperfil360_error.log
```

### Manutenção
```bash
# Reiniciar aplicação
pm2 restart meuperfil360

# Reload sem downtime
pm2 reload meuperfil360

# Deploy de nova versão
cd /home/meuperfil360/app && ./deploy.sh

# Backup manual
./backup.sh
```

## 🚨 RESOLUÇÃO DE PROBLEMAS

### Erro 502 Bad Gateway
1. Verificar se Node.js está rodando: `pm2 status`
2. Verificar logs: `pm2 logs meuperfil360`
3. Reiniciar aplicação: `pm2 restart meuperfil360`

### Erro de Banco de Dados
1. Verificar conexão: `psql -U meuperfil360 -h localhost -d meuperfil360`
2. Verificar variável DATABASE_URL no .env
3. Executar migrações: `npm run db:push`

### Erro SSL
1. Verificar certificados: `sudo certbot certificates`
2. Renovar se necessário: `sudo certbot renew`
3. Reiniciar Nginx: `sudo systemctl restart nginx`

### Performance Issues
1. Verificar recursos: `htop`
2. Verificar logs: `pm2 monit`
3. Ajustar configuração PM2 se necessário

## 📊 MÉTRICAS DE SUCESSO

- [ ] Site carrega em https://www.meuperfil360.com.br
- [ ] Teste DISC funciona completamente
- [ ] Pagamentos Stripe processam corretamente
- [ ] Emails são enviados
- [ ] Admin panel acessível
- [ ] SSL A+ rating
- [ ] Tempo de resposta < 2 segundos
- [ ] Uptime > 99.9%

## 📞 CONFIGURAÇÕES IMPORTANTES

### Stripe Webhook (Configure no dashboard Stripe)
- URL: `https://www.meuperfil360.com.br/api/stripe/webhook`
- Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`

### DNS (Configure no seu provedor)
- A Record: `meuperfil360.com.br` → IP do VPS
- CNAME: `www.meuperfil360.com.br` → `meuperfil360.com.br`

### Firewall
```bash
sudo ufw status
# Deve mostrar: 22/tcp, 80/tcp, 443/tcp ALLOW
```

Seguindo esta checklist, seu deploy será realizado com sucesso e segurança!