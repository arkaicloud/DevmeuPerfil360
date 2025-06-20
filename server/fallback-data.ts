// Essential fallback data for system stability during database outages

export const fallbackPricing = {
  regularPrice: '97',
  promocionalPrice: '47',
  isPromoActive: 'true'
};

export const fallbackEmailTemplates = {
  boas_vindas_cadastro: {
    subject: 'Bem-vindo ao MeuPerfil360! 🎉',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">MeuPerfil360</h1>
        <h2>Bem-vindo, {{userName}}!</h2>
        <p>Sua conta foi criada com sucesso. Acesse sua área pessoal:</p>
        <a href="{{loginUrl}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Acessar Dashboard
        </a>
      </div>
    `
  },
  teste_concluido: {
    subject: 'Seu Teste DISC foi concluído! Perfil {{profileType}} identificado',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">MeuPerfil360</h1>
        <h2>Parabéns, {{userName}}! 🎉</h2>
        <p>Seu teste DISC foi concluído com sucesso!</p>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
          <h3>Seu Perfil: {{profileType}} - {{profileName}}</h3>
        </div>
        <a href="{{resultUrl}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Ver Resultados
        </a>
      </div>
    `
  }
};

export const fallbackAdminConfig = {
  ...fallbackPricing,
  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  smtpSecure: 'false',
  fromEmail: 'noreply@meuperfil360.com.br',
  fromName: 'Meu Perfil 360 - DISC'
};