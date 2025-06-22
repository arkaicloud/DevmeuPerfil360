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
  },
  
  recuperacao_senha: {
    name: "Recuperação de Senha",
    subject: "Redefinir sua senha - MeuPerfil360",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Redefinir Senha</h1>
          <p style="color: #e8e8ff; margin: 10px 0 0 0; font-size: 16px;">Solicitação de nova senha para sua conta</p>
        </div>
        
        <div style="padding: 40px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Olá <strong>{{userName}}</strong>,</p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Recebemos uma solicitação para redefinir a senha da sua conta no MeuPerfil360.
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Importante:</strong> Este link é válido por apenas 1 hora e pode ser usado apenas uma vez.
            </p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="{{resetUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h4 style="color: #495057; margin: 0 0 10px 0;">Não solicitou esta alteração?</h4>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              Se você não solicitou a redefinição de senha, pode ignorar este email com segurança. 
              Sua senha permanecerá inalterada.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; line-height: 1.5;">
            <strong>Precisa de ajuda?</strong><br>
            Entre em contato conosco: <a href="mailto:{{supportEmail}}" style="color: #667eea;">{{supportEmail}}</a><br>
            Ou acesse: <a href="{{testUrl}}" style="color: #667eea;">{{testUrl}}</a>
          </p>
          
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            Por questões de segurança, não compartilhe este email. Se o link não funcionar, copie e cole o URL completo no seu navegador.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            © 2025 MeuPerfil360. Todos os direitos reservados.<br>
            Desenvolvido por <a href="https://www.arkaicloud.com.br" style="color: #667eea;">Arkai</a>
          </p>
        </div>
      </div>
    `,
    variables: ["userName", "resetUrl", "loginUrl", "testUrl", "supportEmail"]
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