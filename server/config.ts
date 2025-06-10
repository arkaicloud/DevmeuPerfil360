
// Configuração segura e validação de variáveis de ambiente
export const config = {
  // Verificar variáveis críticas
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

function generateSecureKey(): string {
  const crypto = require('crypto');
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
