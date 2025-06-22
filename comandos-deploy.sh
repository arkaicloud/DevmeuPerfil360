#!/bin/bash
# ============================================
# COMANDOS DE DEPLOY - MeuPerfil360.com.br
# Execute estes comandos em sequência no servidor
# ============================================

echo "🚀 Iniciando deploy do MeuPerfil360.com.br..."

# 1. PREPARAÇÃO DO SISTEMA
echo "📦 1. Instalando dependências do sistema..."
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm install -g pm2

# 2. CRIAÇÃO DO USUÁRIO
echo "👤 2. Configurando usuário da aplicação..."
sudo adduser meuperfil360
sudo usermod -aG sudo meuperfil360

# 3. PREPARAÇÃO DO DIRETÓRIO (execute como usuário meuperfil360)
echo "📁 3. Preparando diretórios..."
echo "Execute os próximos comandos como usuário meuperfil360:"
echo "su - meuperfil360"
echo "mkdir -p ~/app ~/backups"
echo "cd ~/app"

# 4. CLONE DO REPOSITÓRIO
echo "📥 4. Fazendo download do código..."
echo "git clone [URL_DO_SEU_REPOSITORIO] ."
echo "# OU via SCP: scp -r /caminho/local/* usuario@servidor:~/app/"

# 5. INSTALAÇÃO DE DEPENDÊNCIAS
echo "📦 5. Instalando dependências da aplicação..."
echo "cd ~/app"
echo "npm install --omit=dev"
echo "npm run build"
echo "npx tsc -b"

# 6. CONFIGURAÇÃO DO NGINX
echo "🌐 6. Configurando Nginx..."
cat > /tmp/meuperfil360.conf << 'EOF'
server {
    listen 80;
    server_name meuperfil360.com.br www.meuperfil360.com.br;
    return 301 https://meuperfil360.com.br$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.meuperfil360.com.br;
    return 301 https://meuperfil360.com.br$request_uri;
}

server {
    listen 443 ssl http2;
    server_name meuperfil360.com.br;
    
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
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
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo mv /tmp/meuperfil360.conf /etc/nginx/sites-available/meuperfil360.com.br
sudo ln -s /etc/nginx/sites-available/meuperfil360.com.br /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 7. CONFIGURAÇÃO SSL
echo "🔒 7. Configurando SSL..."
echo "Execute: sudo certbot --nginx -d meuperfil360.com.br -d www.meuperfil360.com.br"

# 8. CONFIGURAÇÃO DA APLICAÇÃO
echo "⚙️  8. Configurando aplicação..."
echo "Copie o arquivo .env.production para .env e configure as variáveis:"
echo "cp .env.production .env"
echo "nano .env"

# 9. INICIALIZAÇÃO COM PM2
echo "🏃 9. Iniciando aplicação..."
echo "mkdir -p ~/app/logs"
echo "cd ~/app"
echo "pm2 start ecosystem.config.js"
echo "pm2 save"
echo "pm2 startup"

# 10. CONFIGURAÇÃO DO BANCO
echo "💾 10. Configurando banco de dados..."
echo "npm run db:push"

echo "✅ Deploy finalizado!"
echo ""
echo "🔧 PRÓXIMOS PASSOS OBRIGATÓRIOS:"
echo "1. Configurar DNS: meuperfil360.com.br -> IP do servidor"
echo "2. Trocar chaves Stripe para produção (sk_live_...)"
echo "3. Gerar chaves de segurança: openssl rand -hex 32"
echo "4. Executar SSL: certbot --nginx -d meuperfil360.com.br"
echo "5. Configurar webhook Stripe: https://meuperfil360.com.br/api/stripe/webhook"
echo ""
echo "🌐 URLs importantes:"
echo "- Site: https://meuperfil360.com.br"
echo "- Admin: https://meuperfil360.com.br/admin/login"
echo "- Health: https://meuperfil360.com.br/health"