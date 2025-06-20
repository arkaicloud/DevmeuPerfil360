#!/bin/bash
echo "🚀 Iniciando deploy do MeuPerfil360..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Arquivo package.json não encontrado. Execute o script no diretório raiz do projeto."
    exit 1
fi

# Parar aplicação
log "Parando aplicação..."
pm2 stop meuperfil360 || warning "Aplicação já estava parada"

# Backup da versão atual
BACKUP_DIR="/home/meuperfil360/backup-$(date +%Y%m%d_%H%M%S)"
log "Criando backup em $BACKUP_DIR..."
cp -r /home/meuperfil360/app "$BACKUP_DIR"

# Atualizar código (se usando Git)
if [ -d ".git" ]; then
    log "Atualizando código do Git..."
    git pull origin main || error "Falha ao atualizar código do Git"
fi

# Instalar dependências
log "Instalando dependências..."
npm install --production || {
    error "Falha ao instalar dependências"
    exit 1
}

# Build da aplicação
log "Compilando aplicação..."
npm run build || {
    error "Falha no build da aplicação"
    exit 1
}

# Executar migrações do banco
log "Executando migrações do banco..."
npm run db:push || warning "Falha nas migrações (pode ser normal se não houver mudanças)"

# Verificar se os arquivos foram gerados
if [ ! -f "dist/index.js" ]; then
    error "Arquivo dist/index.js não foi gerado. Verifique o build."
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    warning "Arquivo .env não encontrado. Verifique as variáveis de ambiente."
fi

# Criar diretório de logs se não existir
mkdir -p /home/meuperfil360/logs

# Reiniciar aplicação
log "Iniciando aplicação..."
pm2 start ecosystem.config.js || {
    error "Falha ao iniciar aplicação"
    pm2 logs meuperfil360 --lines 20
    exit 1
}

# Salvar configuração PM2
pm2 save

# Aguardar a aplicação inicializar
log "Aguardando aplicação inicializar..."
sleep 5

# Verificar status
log "Verificando status da aplicação..."
pm2 status

# Testar se a aplicação está respondendo
log "Testando conectividade..."
if curl -f -s http://localhost:3000/api/pricing > /dev/null; then
    log "✅ Aplicação está respondendo corretamente!"
else
    warning "Aplicação pode não estar respondendo. Verifique os logs."
    pm2 logs meuperfil360 --lines 10
fi

# Recarregar Nginx
log "Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx || warning "Falha ao recarregar Nginx"

log "✅ Deploy concluído com sucesso!"
log "📊 Para monitorar a aplicação: pm2 monit"
log "📝 Para ver logs: pm2 logs meuperfil360"
log "🔄 Para reiniciar: pm2 restart meuperfil360"

echo ""
echo "=== Status Final ==="
pm2 status meuperfil360