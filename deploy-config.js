
// Configuração de deployment para www.meuperfil360.com.br
const config = {
  production: {
    domain: 'www.meuperfil360.com.br',
    cors: {
      allowedOrigins: [
        'https://meuperfil360.com.br',
        'https://www.meuperfil360.com.br'
      ]
    },
    security: {
      strictMode: true,
      rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100 // máximo 100 requisições por IP
      }
    }
  },
  development: {
    cors: {
      allowAll: true
    },
    security: {
      strictMode: false
    }
  }
};

module.exports = config;
