# Manual de Deploy - MeuPerfil360.com.br
## Guia Completo para Deploy em Produção

### 1. PREPARAÇÃO DO SERVIDOR

#### 1.1 Requisitos do Sistema
```bash
# Sistema operacional: Ubuntu 20.04 ou superior
# Memória RAM: Mínimo 2GB (recomendado 4GB)
# Armazenamento: Mínimo 20GB
# CPU: 2 cores ou mais
```

#### 1.2 Instalação de Dependências
```bash
# Conectar ao servidor via SSH
ssh root@seu-servidor-ip

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Verificar versão do Node.js (deve ser 20.x)
node --version

# Instalar PM2 (gerenciador de processos)
npm install -g pm2

# Instalar Nginx (servidor web)
apt install nginx -y

# Instalar Certbot (SSL)
apt install certbot python3-certbot-nginx -y

# Instalar Git
apt install git -y
```

### 2. CONFIGURAÇÃO DO USUÁRIO E DIRETÓRIOS

#### 2.1 Criar Usuário da Aplicação
```bash
# Criar usuário específico para a aplicação
adduser meuperfil360

# Adicionar ao grupo sudo (opcional)
usermod -aG sudo meuperfil360

# Trocar para o usuário
su - meuperfil360

# Criar diretório da aplicação
mkdir -p ~/app
cd ~/app
```

### 3. DEPLOY DO CÓDIGO

#### 3.1 Transferir Código (Opção A - Git)
```bash
# Clonar repositório (substitua pela sua URL)
git clone https://github.com/seu-usuario/meuperfil360.git .

# Ou via upload direto (Opção B)
# scp -r /caminho/local/* usuario@servidor:~/app/
```

#### 3.2 Instalar Dependências
```bash
cd ~/app
npm install --omit=dev
```

#### 3.3 Build da Aplicação
```bash
# Build do frontend
npm run build

# Verificar se o build foi criado
ls -la dist/
```

### 4. CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE

#### 4.1 Criar arquivo .env
```bash
cd ~/app
nano .env
```

#### 4.2 Conteúdo do arquivo .env
```env
# CONFIGURAÇÃO DE PRODUÇÃO - MeuPerfil360
NODE_ENV=production
PORT=3000

# Domínio oficial
DOMAIN=https://meuperfil360.com.br

# Database (Neon Database - mantenha a string atual)
DATABASE_URL=postgresql://neondb_owner:npg_5yPSVcrTft9C@ep-fragrant-dawn-a5huhekp.us-east-2.aws.neon.tech/neondb?sslmode=require

# Stripe - IMPORTANTE: Trocar para chaves de PRODUÇÃO
STRIPE_SECRET_KEY=sk_live_SUA_CHAVE_SECRETA_PRODUCTION
VITE_STRIPE_PUBLIC_KEY=pk_live_SUA_CHAVE_PUBLICA_PRODUCTION
STRIPE_WEBHOOK_SECRET=whsec_SUA_WEBHOOK_SECRET_PRODUCTION

# Admin (manter as credenciais atuais)
ADMIN_EMAIL=adm@meuperfil360.com.br
ADMIN_PASSWORD=admin123456

# Security (gerar novas chaves seguras)
JWT_SECRET=sua_chave_jwt_super_segura_minimo_64_caracteres_aqui_production
ENCRYPTION_KEY=sua_chave_encryption_super_segura_minimo_64_caracteres_aqui_production
SESSION_SECRET=sua_chave_session_super_segura_minimo_64_caracteres_aqui_production

# Email (manter configuração atual do Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=meuperfil360@gmail.com
SMTP_PASSWORD=SUA_SENHA_APP_GMAIL
SMTP_FROM=naoresponda@meuperfil360.com.br
SMTP_FROM_NAME=MeuPerfil360 - DISC

# CORS para domínio oficial
CORS_ORIGINS=https://meuperfil360.com.br,https://www.meuperfil360.com.br

# Rate Limiting (produção)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. CONFIGURAÇÃO DO NGINX

#### 5.1 Criar arquivo de configuração do site
```bash
sudo nano /etc/nginx/sites-available/meuperfil360.com.br
```

#### 5.2 Conteúdo da configuração do Nginx
```nginx
server {
    listen 80;
    server_name meuperfil360.com.br www.meuperfil360.com.br;
    
    # Redirecionar HTTP para HTTPS (será configurado após SSL)
    return 301 https://meuperfil360.com.br$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.meuperfil360.com.br;
    
    # Redirecionar www para domínio principal
    return 301 https://meuperfil360.com.br$request_uri;
}

server {
    listen 443 ssl http2;
    server_name meuperfil360.com.br;
    
    # SSL será configurado pelo Certbot
    
    # Configurações de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Proxy para aplicação Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 5.3 Ativar o site
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/meuperfil360.com.br /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 6. CONFIGURAÇÃO SSL (HTTPS)

#### 6.1 Gerar certificados SSL
```bash
# Gerar certificados para o domínio
sudo certbot --nginx -d meuperfil360.com.br -d www.meuperfil360.com.br

# Verificar renovação automática
sudo certbot renew --dry-run
```

### 7. CONFIGURAÇÃO DO PM2

#### 7.1 Criar arquivo de configuração do PM2
```bash
cd ~/app
nano ecosystem.config.js
```

#### 7.2 Conteúdo do ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'meuperfil360',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
```

### 8. INICIALIZAÇÃO DA APLICAÇÃO

#### 8.1 Criar diretório de logs
```bash
mkdir -p ~/app/logs
```

#### 8.2 Compilar TypeScript e iniciar aplicação
```bash
cd ~/app

# Build do backend TypeScript
npx tsc -b

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Configurar inicialização automática
pm2 startup
# Execute o comando que o PM2 mostrar (como sudo)
```

### 9. CONFIGURAÇÃO DO BANCO DE DADOS

#### 9.1 Executar migrações
```bash
cd ~/app

# Aplicar schema ao banco de dados
npm run db:push

# Verificar conexão com banco
npm run db:studio
# Acesse http://localhost:5555 (temporariamente)
```

### 10. VERIFICAÇÕES FINAIS

#### 10.1 Verificar status dos serviços
```bash
# Status da aplicação
pm2 status

# Status do Nginx
sudo systemctl status nginx

# Logs da aplicação
pm2 logs meuperfil360

# Testar aplicação
curl -I https://meuperfil360.com.br
```

#### 10.2 Configurar Webhook do Stripe
```
URL do Webhook: https://meuperfil360.com.br/api/stripe/webhook
Eventos: checkout.session.completed, payment_intent.succeeded
```

### 11. COMANDOS DE MANUTENÇÃO

#### 11.1 Atualizações da aplicação
```bash
cd ~/app

# Parar aplicação
pm2 stop meuperfil360

# Atualizar código
git pull origin main

# Reinstalar dependências se necessário
npm install --omit=dev

# Build
npm run build
npx tsc -b

# Reiniciar aplicação
pm2 restart meuperfil360
```

#### 11.2 Monitoramento
```bash
# Logs em tempo real
pm2 logs meuperfil360 --lines 100

# Status dos processos
pm2 monit

# Reiniciar se necessário
pm2 restart meuperfil360

# Verificar uso de recursos
pm2 show meuperfil360
```

### 12. BACKUP E SEGURANÇA

#### 12.1 Configurar backup automático
```bash
# Criar script de backup
nano ~/backup.sh
```

```bash
#!/bin/bash
# Backup script para MeuPerfil360

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/meuperfil360/backups"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup da aplicação
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /home/meuperfil360 app/

# Backup do banco de dados (se usando PostgreSQL local)
# pg_dump meuperfil360 > $BACKUP_DIR/db_$DATE.sql

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup concluído: $DATE"
```

```bash
# Tornar executável
chmod +x ~/backup.sh

# Adicionar ao crontab (backup diário às 2:00)
crontab -e
# Adicionar linha: 0 2 * * * /home/meuperfil360/backup.sh
```

### 13. TROUBLESHOOTING

#### 13.1 Problemas comuns
```bash
# Aplicação não inicia
pm2 logs meuperfil360

# Erro de permissão
sudo chown -R meuperfil360:meuperfil360 /home/meuperfil360/app

# Problema de porta
sudo netstat -tulpn | grep :3000

# Reiniciar todos os serviços
sudo systemctl restart nginx
pm2 restart meuperfil360
```

#### 13.2 URLs importantes
- Site: https://meuperfil360.com.br
- Admin: https://meuperfil360.com.br/admin/login
- Health Check: https://meuperfil360.com.br/health

## IMPORTANTE: LISTA DE TAREFAS PRÉ-DEPLOY

### ✅ Obrigatório antes do deploy:

1. **Stripe Production Keys**: Substituir todas as chaves sk_test_ por sk_live_
2. **Domínio DNS**: Apontar meuperfil360.com.br para o IP do servidor
3. **Email SMTP**: Verificar credenciais do Gmail ou configurar SMTP dedicado
4. **Chaves de Segurança**: Gerar novas chaves JWT, ENCRYPTION e SESSION
5. **SSL Certificate**: Executar certbot após DNS estar funcionando
6. **Webhook Stripe**: Configurar endpoint https://meuperfil360.com.br/api/stripe/webhook

### 🔧 Configurações recomendadas:

1. **Firewall**: Abrir apenas portas 22, 80, 443
2. **Monitoring**: Configurar alertas para uso de CPU/memória
3. **Backup**: Implementar backup automático diário
4. **Updates**: Configurar atualizações automáticas de segurança

## Pronto para Produção! 🚀