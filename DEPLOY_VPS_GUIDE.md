# Guia Completo de Deploy - MeuPerfil360
## Deploy para VPS com domínio www.meuperfil360.com.br

### 1. PREPARAÇÃO DO VPS

#### 1.1 Instalação de Dependências no VPS
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gerenciamento de processos
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y

# Instalar PostgreSQL (se não tiver banco externo)
sudo apt install postgresql postgresql-contrib -y

# Instalar SSL/TLS
sudo apt install certbot python3-certbot-nginx -y
```

#### 1.2 Configuração do Usuário
```bash
# Criar usuário para aplicação
sudo adduser meuperfil360
sudo usermod -aG sudo meuperfil360

# Trocar para o usuário
su - meuperfil360

# Criar diretório da aplicação
mkdir -p /home/meuperfil360/app
cd /home/meuperfil360/app
```

### 2. TRANSFERÊNCIA DO CÓDIGO

#### 2.1 Upload dos Arquivos
```bash
# Via SCP (execute no seu computador local)
scp -r /caminho/para/projeto/* usuario@seu-ip:/home/meuperfil360/app/

# Ou via Git (clone no VPS)
git clone https://github.com/seu-usuario/seu-repositorio.git .
```

#### 2.2 Instalação de Dependências
```bash
cd /home/meuperfil360/app
npm install --production
```

### 3. CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE

#### 3.1 Criar arquivo .env de produção
**Arquivo: `/home/meuperfil360/app/.env`**
```bash
# Configuração de Produção - MeuPerfil360
NODE_ENV=production
PORT=3000

# Domínio de Produção
DOMAIN=https://www.meuperfil360.com.br

# Database - Substitua pela sua string de conexão
DATABASE_URL=postgresql://usuario:senha@localhost:5432/meuperfil360

# Stripe (Production Keys) - Substitua pelas suas chaves
STRIPE_SECRET_KEY=sk_live_seu_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_live_seu_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret

# Admin Configuration
ADMIN_EMAIL=adm@meuperfil360.com.br
ADMIN_PASSWORD=sua_senha_admin_segura

# Security - Gere chaves seguras
JWT_SECRET=sua_chave_jwt_super_segura_64_caracteres_minimo
ENCRYPTION_KEY=sua_chave_encryption_super_segura_64_caracteres_minimo
SESSION_SECRET=sua_chave_session_super_segura_64_caracteres_minimo

# Email Configuration - Configure seu SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app_gmail
SMTP_FROM=noreply@meuperfil360.com.br
SMTP_FROM_NAME=MeuPerfil360

# CORS Origins
CORS_ORIGINS=https://www.meuperfil360.com.br,https://meuperfil360.com.br

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. CONFIGURAÇÃO DO BANCO DE DADOS

#### 4.1 PostgreSQL Local (se não usar banco externo)
```bash
# Criar usuário e banco
sudo -u postgres psql
CREATE USER meuperfil360 WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE meuperfil360 OWNER meuperfil360;
GRANT ALL PRIVILEGES ON DATABASE meuperfil360 TO meuperfil360;
\q

# Atualizar .env com a string de conexão
DATABASE_URL=postgresql://meuperfil360:sua_senha_segura@localhost:5432/meuperfil360
```

#### 4.2 Executar Migrações
```bash
cd /home/meuperfil360/app
npm run db:push
```

### 5. BUILD DA APLICAÇÃO

#### 5.1 Compilar o Projeto
```bash
cd /home/meuperfil360/app
npm run build
```

### 6. CONFIGURAÇÃO DO NGINX

#### 6.1 Configuração do Servidor Web
**Arquivo: `/etc/nginx/sites-available/meuperfil360`**
```nginx
server {
    listen 80;
    server_name www.meuperfil360.com.br meuperfil360.com.br;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.meuperfil360.com.br meuperfil360.com.br;

    # SSL Configuration (será configurado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/www.meuperfil360.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.meuperfil360.com.br/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Servir arquivos estáticos
    location / {
        root /home/meuperfil360/app/dist/public;
        try_files $uri $uri/ @backend;
    }

    # Proxy para API
    location @backend {
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

    # API Routes
    location /api/ {
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

    # Configurações de Cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/meuperfil360/app/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
```

#### 6.2 Ativar o Site
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/meuperfil360 /etc/nginx/sites-enabled/

# Remover configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 7. CONFIGURAÇÃO SSL/TLS

#### 7.1 Certificado Let's Encrypt
```bash
# Obter certificado SSL
sudo certbot --nginx -d www.meuperfil360.com.br -d meuperfil360.com.br

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. CONFIGURAÇÃO DO PM2

#### 8.1 Arquivo de Configuração PM2
**Arquivo: `/home/meuperfil360/app/ecosystem.config.js`**
```javascript
module.exports = {
  apps: [{
    name: 'meuperfil360',
    script: 'dist/index.js',
    cwd: '/home/meuperfil360/app',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/meuperfil360/logs/err.log',
    out_file: '/home/meuperfil360/logs/out.log',
    log_file: '/home/meuperfil360/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### 8.2 Iniciar Aplicação
```bash
# Criar diretório de logs
mkdir -p /home/meuperfil360/logs

# Iniciar aplicação
cd /home/meuperfil360/app
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Configurar inicialização automática
pm2 startup
# Execute o comando que o PM2 mostrar
```

### 9. CONFIGURAÇÃO DO FIREWALL

#### 9.1 UFW (Ubuntu Firewall)
```bash
# Configurar firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Verificar status
sudo ufw status
```

### 10. ALTERAÇÕES NECESSÁRIAS NO CÓDIGO

#### 10.1 Arquivo `server/index.ts` (Linha 15-20)
```typescript
// Alterar porta para variável de ambiente
const PORT = process.env.PORT || 3000;

// Alterar bind de localhost para 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 10.2 Arquivo `package.json` (Linha 9)
```json
{
  "scripts": {
    "start": "NODE_ENV=production node dist/index.js",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node18"
  }
}
```

#### 10.3 Arquivo `server/config.ts` (Linha 5-11)
```typescript
export const config = {
  // Usar variável de ambiente para domínio
  domain: process.env.DOMAIN || 'https://www.meuperfil360.com.br',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['https://www.meuperfil360.com.br'],
    credentials: true,
  },
  // ... resto da configuração
};
```

### 11. SCRIPTS DE DEPLOY

#### 11.1 Script de Deploy
**Arquivo: `deploy.sh`**
```bash
#!/bin/bash
echo "🚀 Iniciando deploy do MeuPerfil360..."

# Parar aplicação
pm2 stop meuperfil360

# Backup da versão atual
cp -r /home/meuperfil360/app /home/meuperfil360/backup-$(date +%Y%m%d_%H%M%S)

# Atualizar código (se usando Git)
git pull origin main

# Instalar dependências
npm install --production

# Build da aplicação
npm run build

# Executar migrações
npm run db:push

# Reiniciar aplicação
pm2 start ecosystem.config.js

# Verificar status
pm2 status

echo "✅ Deploy concluído com sucesso!"
```

#### 11.2 Tornar executável
```bash
chmod +x deploy.sh
```

### 12. MONITORAMENTO E LOGS

#### 12.1 Comandos PM2 Úteis
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs meuperfil360

# Reiniciar aplicação
pm2 restart meuperfil360

# Monitorar recursos
pm2 monit

# Reload sem downtime
pm2 reload meuperfil360
```

#### 12.2 Logs do Sistema
```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs da aplicação
tail -f /home/meuperfil360/logs/combined.log
```

### 13. BACKUP E SEGURANÇA

#### 13.1 Script de Backup
**Arquivo: `backup.sh`**
```bash
#!/bin/bash
# Backup do banco de dados
pg_dump -U meuperfil360 -h localhost meuperfil360 > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup dos arquivos
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /home/meuperfil360/app
```

#### 13.2 Cron para Backup Automático
```bash
# Adicionar ao crontab
crontab -e

# Backup diário às 2h da manhã
0 2 * * * /home/meuperfil360/backup.sh
```

### 14. TESTE DE PRODUÇÃO

#### 14.1 Verificações Finais
```bash
# Testar conectividade
curl -I https://www.meuperfil360.com.br

# Testar API
curl https://www.meuperfil360.com.br/api/pricing

# Verificar SSL
openssl s_client -connect www.meuperfil360.com.br:443 -servername www.meuperfil360.com.br
```

### 15. SOLUÇÃO DE PROBLEMAS

#### 15.1 Problemas Comuns
- **Erro 502**: Verificar se o Node.js está rodando na porta 3000
- **Erro SSL**: Verificar certificados e configuração do Nginx
- **Erro de Banco**: Verificar string de conexão e permissões
- **Erro 404**: Verificar configuração do Nginx e arquivos estáticos

#### 15.2 Comandos de Debug
```bash
# Verificar processos
ps aux | grep node

# Verificar portas
netstat -tulpn | grep :3000

# Testar conexão de banco
psql -U meuperfil360 -h localhost -d meuperfil360

# Verificar logs do sistema
journalctl -u nginx -f
```

## RESUMO DOS ARQUIVOS A ALTERAR

1. **server/index.ts**: Alterar porta e bind address
2. **server/config.ts**: Usar variáveis de ambiente para domínio
3. **package.json**: Otimizar scripts de build e start
4. **Criar .env**: Configurações de produção
5. **Criar ecosystem.config.js**: Configuração PM2
6. **Criar configuração Nginx**: Proxy reverso e SSL
7. **Criar scripts de deploy e backup**: Automação

## CHECKLIST FINAL

- [ ] VPS configurado com Node.js, Nginx, PostgreSQL
- [ ] Código transferido e dependências instaladas
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados criado e migrado
- [ ] Aplicação compilada (build)
- [ ] Nginx configurado com SSL
- [ ] PM2 configurado e aplicação rodando
- [ ] Firewall configurado
- [ ] Backup automatizado
- [ ] Testes de produção realizados

Este guia cobre todos os aspectos necessários para fazer o deploy completo do seu SaaS no VPS. Siga os passos em ordem e adapte as configurações conforme sua infraestrutura específica.