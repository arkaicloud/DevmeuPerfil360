
// Configuração segura e validação de variáveis de ambiente
export const config = {
  // Configuração para produção - usar variável de ambiente ou fallback
  domain: process.env.DOMAIN || (process.env.NODE_ENV === 'production' 
    ? 'https://meuperfil360.com.br' 
    : 'http://localhost:5000'),
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || (process.env.NODE_ENV === 'production' 
      ? ['https://meuperfil360.com.br', 'https://www.meuperfil360.com.br'] 
      : ['http://localhost:5000', 'http://127.0.0.1:5000']),
    credentials: true,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "adm@meuperfil360.com.br",
    password: process.env.ADMIN_PASSWORD,
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || generateSecureKey(),
    encryptionKey: process.env.ENCRYPTION_KEY || generateSecureKey(),
  },
  database: {
    url: process.env.DATABASE_URL,
  }
};

import crypto from 'crypto';

function generateSecureKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validar configurações críticas
export function validateConfig() {
  const errors = [];

  if (!config.stripe.secretKey) {
    errors.push('STRIPE_SECRET_KEY é obrigatória');
  }

  if (!config.admin.password) {
    console.warn('ADMIN_PASSWORD não definida, usando padrão (INSEGURO)');
  }

  if (errors.length > 0) {
    console.error('Erro de configuração:', errors);
    process.exit(1);
  }
}

// Executar validação na inicialização
validateConfig();
