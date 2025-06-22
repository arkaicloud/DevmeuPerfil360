#!/bin/bash
# Script de Instalação Inicial para VPS - MeuPerfil360

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Execute este script como root (sudo ./install-vps.sh)"
    exit 1
fi

log "🚀 Iniciando instalação do MeuPerfil360 no VPS..."

# Atualizar sistema
log "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar Node.js 20.x
log "📦 Instalando Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verificar instalação do Node.js
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log "✅ Node.js instalado: $NODE_VERSION"
log "✅ NPM instalado: $NPM_VERSION"

# Instalar PM2
log "📦 Instalando PM2..."
npm install -g pm2

# Instalar Nginx
log "📦 Instalando Nginx..."
apt install nginx -y
systemctl enable nginx

# Instalar PostgreSQL
log "📦 Instalando PostgreSQL..."
apt install postgresql postgresql-contrib -y
systemctl enable postgresql

# Instalar Certbot para SSL
log "📦 Instalando Certbot..."
apt install certbot python3-certbot-nginx -y

# Instalar utilitários úteis
log "📦 Instalando utilitários..."
apt install htop curl wget git unzip -y

# Configurar Firewall
log "🔒 Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp  
ufw allow 443/tcp
ufw --force enable

# Criar usuário para aplicação
log "👤 Criando usuário meuperfil360..."
if id "meuperfil360" &>/dev/null; then
    warning "Usuário meuperfil360 já existe"
else
    adduser --disabled-password --gecos "" meuperfil360
    usermod -aG sudo meuperfil360
    log "✅ Usuário meuperfil360 criado"
fi

# Criar diretórios necessários
log "📁 Criando estrutura de diretórios..."
mkdir -p /home/meuperfil360/app
mkdir -p /home/meuperfil360/logs
mkdir -p /home/meuperfil360/backups
chown -R meuperfil360:meuperfil360 /home/meuperfil360/

# Configurar PostgreSQL
log "🗄️ Configurando PostgreSQL..."
sudo -u postgres psql << EOF
CREATE USER meuperfil360 WITH PASSWORD 'meuperfil360_temp_pass';
CREATE DATABASE meuperfil360 OWNER meuperfil360;
GRANT ALL PRIVILEGES ON DATABASE meuperfil360 TO meuperfil360;
\q
EOF

# Criar arquivo de configuração do Nginx
log "🌐 Criando configuração básica do Nginx..."
cat > /etc/nginx/sites-available/meuperfil360 << 'EOF'
server {
    listen 80;
    server_name www.meuperfil360.com.br meuperfil360.com.br;

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

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Ativar site no Nginx
ln -sf /etc/nginx/sites-available/meuperfil360 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t
if [ $? -eq 0 ]; then
    log "✅ Configuração do Nginx válida"
    systemctl restart nginx
else
    error "❌ Erro na configuração do Nginx"
fi

# Configurar logrotate para logs da aplicação
log "📝 Configurando rotação de logs..."
cat > /etc/logrotate.d/meuperfil360 << 'EOF'
/home/meuperfil360/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 meuperfil360 meuperfil360
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Configurar backup automático
log "💾 Configurando backup automático..."
cat > /etc/cron.d/meuperfil360-backup << 'EOF'
# Backup diário às 2h da manhã
0 2 * * * meuperfil360 /home/meuperfil360/app/backup.sh >> /home/meuperfil360/logs/backup.log 2>&1
EOF

# Otimizações do sistema
log "⚡ Aplicando otimizações do sistema..."

# Aumentar limites de arquivos abertos
cat >> /etc/security/limits.conf << 'EOF'
meuperfil360 soft nofile 65536
meuperfil360 hard nofile 65536
EOF

# Otimizações de rede
cat >> /etc/sysctl.conf << 'EOF'
# Otimizações para aplicação web
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fin_timeout = 30
EOF

sysctl -p

# Criar script de status do sistema
log "📊 Criando script de monitoramento..."
cat > /home/meuperfil360/status.sh << 'EOF'
#!/bin/bash
echo "=== STATUS DO MEUPERFIL360 ==="
echo "Data: $(date)"
echo ""
echo "--- Aplicação ---"
pm2 status meuperfil360
echo ""
echo "--- Nginx ---"
systemctl status nginx --no-pager -l
echo ""
echo "--- PostgreSQL ---"
systemctl status postgresql --no-pager -l  
echo ""
echo "--- Uso de Disco ---"
df -h /
echo ""
echo "--- Uso de Memória ---"
free -h
echo ""
echo "--- Processos ---"
ps aux | grep -E "(node|nginx|postgres)" | grep -v grep
echo ""
echo "--- Logs Recentes (últimas 10 linhas) ---"
tail -10 /home/meuperfil360/logs/combined.log 2>/dev/null || echo "Logs ainda não criados"
EOF

chmod +x /home/meuperfil360/status.sh
chown meuperfil360:meuperfil360 /home/meuperfil360/status.sh

# Mostrar informações finais
log "✅ Instalação concluída com sucesso!"
echo ""
info "📋 PRÓXIMOS PASSOS:"
echo "1. Faça upload do código da aplicação para /home/meuperfil360/app/"
echo "2. Configure o arquivo .env com suas variáveis de produção"
echo "3. Execute: su - meuperfil360"
echo "4. Execute: cd app && npm install --production"
echo "5. Execute: npm run build"
echo "6. Execute: npm run db:push"
echo "7. Execute: pm2 start ecosystem.config.js"
echo "8. Configure SSL: sudo certbot --nginx -d www.meuperfil360.com.br"
echo ""
info "🔧 COMANDOS ÚTEIS:"
echo "- Ver status: sudo -u meuperfil360 /home/meuperfil360/status.sh"
echo "- Ver logs: pm2 logs meuperfil360"
echo "- Reiniciar app: pm2 restart meuperfil360"
echo "- Backup manual: sudo -u meuperfil360 /home/meuperfil360/app/backup.sh"
echo ""
info "🎯 Dados de acesso ao banco:"
echo "- Host: localhost"
echo "- Usuário: meuperfil360" 
echo "- Senha: meuperfil360_temp_pass (ALTERE IMEDIATAMENTE!)"
echo "- Database: meuperfil360"
echo ""
warning "⚠️  IMPORTANTE: Altere a senha do PostgreSQL antes de colocar em produção!"
warning "⚠️  Configure todas as variáveis no arquivo .env antes de iniciar a aplicação!"

log "🎉 VPS configurado e pronto para deploy!"