#!/bin/bash
# Script de Backup Automatizado - MeuPerfil360

# Configurações
BACKUP_DIR="/home/meuperfil360/backups"
APP_DIR="/home/meuperfil360/app"
DB_NAME="meuperfil360"
DB_USER="meuperfil360"
RETENTION_DAYS=7

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Timestamp para os arquivos
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log "🔄 Iniciando backup do MeuPerfil360..."

# Backup do banco de dados
log "📊 Fazendo backup do banco de dados..."
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    log "✅ Backup do banco de dados concluído"
    # Comprimir o arquivo SQL
    gzip "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    log "📦 Arquivo comprimido: db_backup_$TIMESTAMP.sql.gz"
else
    error "❌ Falha no backup do banco de dados"
fi

# Backup dos arquivos da aplicação (excluindo node_modules e logs)
log "📁 Fazendo backup dos arquivos da aplicação..."
tar -czf "$BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz" \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude="logs" \
    --exclude=".git" \
    --exclude="backups" \
    -C "$(dirname "$APP_DIR")" \
    "$(basename "$APP_DIR")"

if [ $? -eq 0 ]; then
    log "✅ Backup dos arquivos concluído: app_backup_$TIMESTAMP.tar.gz"
else
    error "❌ Falha no backup dos arquivos"
fi

# Backup do arquivo .env separadamente (sensível)
if [ -f "$APP_DIR/.env" ]; then
    log "🔐 Fazendo backup das variáveis de ambiente..."
    cp "$APP_DIR/.env" "$BACKUP_DIR/env_backup_$TIMESTAMP"
    chmod 600 "$BACKUP_DIR/env_backup_$TIMESTAMP"
    log "✅ Backup do .env concluído"
fi

# Backup da configuração do Nginx
if [ -f "/etc/nginx/sites-available/meuperfil360" ]; then
    log "🌐 Fazendo backup da configuração do Nginx..."
    sudo cp "/etc/nginx/sites-available/meuperfil360" "$BACKUP_DIR/nginx_config_$TIMESTAMP"
    sudo chown $(whoami):$(whoami) "$BACKUP_DIR/nginx_config_$TIMESTAMP"
    log "✅ Backup do Nginx concluído"
fi

# Backup da configuração do PM2
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    log "⚙️ Fazendo backup da configuração do PM2..."
    cp "$APP_DIR/ecosystem.config.js" "$BACKUP_DIR/pm2_config_$TIMESTAMP.js"
    log "✅ Backup do PM2 concluído"
fi

# Limpar backups antigos
log "🧹 Removendo backups antigos (mais de $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_backup_*" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "nginx_config_*" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "pm2_config_*" -mtime +$RETENTION_DAYS -delete

# Mostrar espaço usado pelos backups
log "📈 Espaço usado pelos backups:"
du -sh "$BACKUP_DIR"

# Listar backups recentes
log "📋 Backups recentes:"
ls -lah "$BACKUP_DIR" | tail -10

log "✅ Backup concluído com sucesso!"

# Verificar integridade dos arquivos criados
log "🔍 Verificando integridade dos backups..."

# Verificar se os arquivos foram criados
LATEST_DB_BACKUP=$(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | head -1)
LATEST_APP_BACKUP=$(ls -t "$BACKUP_DIR"/app_backup_*.tar.gz 2>/dev/null | head -1)

if [ -n "$LATEST_DB_BACKUP" ] && [ -f "$LATEST_DB_BACKUP" ]; then
    DB_SIZE=$(stat -f%z "$LATEST_DB_BACKUP" 2>/dev/null || stat -c%s "$LATEST_DB_BACKUP" 2>/dev/null)
    if [ "$DB_SIZE" -gt 1000 ]; then
        log "✅ Backup do banco parece válido ($DB_SIZE bytes)"
    else
        warning "⚠️ Backup do banco pode estar corrompido (muito pequeno)"
    fi
fi

if [ -n "$LATEST_APP_BACKUP" ] && [ -f "$LATEST_APP_BACKUP" ]; then
    APP_SIZE=$(stat -f%z "$LATEST_APP_BACKUP" 2>/dev/null || stat -c%s "$LATEST_APP_BACKUP" 2>/dev/null)
    if [ "$APP_SIZE" -gt 100000 ]; then
        log "✅ Backup da aplicação parece válido ($APP_SIZE bytes)"
    else
        warning "⚠️ Backup da aplicação pode estar corrompido (muito pequeno)"
    fi
fi

log "🎉 Processo de backup finalizado!"