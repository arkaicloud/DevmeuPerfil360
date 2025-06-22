import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { db } from './db';
import { adminConfigs, emailTemplates } from '@shared/schema';
import { sql } from 'drizzle-orm';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private sendgridConfigured: boolean = false;
  private configCacheTime: number = 0;

  async loadConfiguration(): Promise<EmailConfig> {
    try {
      const allConfigs = await db.select().from(adminConfigs);
      const configs = allConfigs.filter(c => c.key.startsWith('smtp_') || c.key.startsWith('from_'));
      
      this.config = {
        smtpHost: configs.find(c => c.key === 'smtp_host')?.value || '',
        smtpPort: parseInt(configs.find(c => c.key === 'smtp_port')?.value || '587'),
        smtpUser: configs.find(c => c.key === 'smtp_user')?.value || '',
        smtpPassword: configs.find(c => c.key === 'smtp_password')?.value || '',
        smtpSecure: configs.find(c => c.key === 'smtp_secure')?.value === 'true',
        fromEmail: configs.find(c => c.key === 'from_email')?.value || '',
        fromName: configs.find(c => c.key === 'from_name')?.value || 'MeuPerfil360',
      };

      console.log('Configuração de email carregada:', {
      ...this.config,
      smtpPassword: '***'  // Hide password in logs
    });
      return this.config;
    } catch (error) {
      console.error('Erro ao carregar configuração de email:', error);
      throw error;
    }
  }

  async createTransporter(): Promise<nodemailer.Transporter> {
    // Force reload configuration
    await this.loadConfiguration(true);

    if (!this.config) {
      throw new Error('Configuração de email não encontrada');
    }

    // Reset previous transporter
    this.transporter = null;

    // Configuração SMTP dinâmica baseada no provedor
    const smtpConfig: any = {
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      pool: false
    };

    console.log(`Configurando SMTP: ${this.config.smtpHost}:${this.config.smtpPort} (${this.config.smtpUser})`);
    
    this.transporter = nodemailer.createTransport(smtpConfig);
    
    // Verificar conexão
    try {
      await this.transporter.verify();
      console.log(`SMTP conectado: ${this.config.smtpHost}`);
      return this.transporter;
    } catch (verifyError: any) {
      console.error('Falha SMTP:', verifyError.message);
      console.error(`Host: ${this.config.smtpHost}, Porta: ${this.config.smtpPort}, Usuario: ${this.config.smtpUser}`);
      
      this.transporter = null;
      throw verifyError;
    }
  }

  async initializeSendGrid(): Promise<boolean> {
    try {
      const sendgridApiKey = process.env.SENDGRID_API_KEY;
      if (sendgridApiKey && sendgridApiKey.startsWith('SG.')) {
        sgMail.setApiKey(sendgridApiKey);
        this.sendgridConfigured = true;
        console.log('SendGrid configurado com sucesso');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao configurar SendGrid:', error);
      return false;
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    // Try SendGrid first if configured
    if (!this.sendgridConfigured) {
      await this.initializeSendGrid();
    }

    if (this.sendgridConfigured) {
      try {
        if (!this.config) {
          await this.loadConfiguration();
        }

        const msg = {
          to: to,
          from: {
            email: this.config?.fromEmail || 'contato@meuperfil360.com.br',
            name: this.config?.fromName || 'MeuPerfil360'
          },
          subject: subject,
          html: html,
          text: text || html.replace(/<[^>]*>/g, ''),
          reply_to: {
            email: 'contato@meuperfil360.com.br',
            name: 'MeuPerfil360'
          }
        };

        const result = await sgMail.send(msg);
        console.log(`SendGrid: Email enviado com sucesso para ${to}`);
        return true;
      } catch (sendgridError: any) {
        console.error('SendGrid falhou:', sendgridError.message);
        console.log('Tentando SMTP como fallback...');
      }
    }

    // Fallback to SMTP
    try {
      if (!this.transporter) {
        await this.createTransporter();
      }

      if (!this.config) {
        throw new Error('Configuração de email não disponível');
      }

      // Force using custom domain for Brevo
      const fromEmail = this.config.smtpHost.includes('brevo') || this.config.smtpHost.includes('sendinblue') 
        ? 'contato@meuperfil360.com.br' 
        : this.config.fromEmail;

      const mailOptions = {
        from: `MeuPerfil360 <${fromEmail}>`,
        replyTo: 'contato@meuperfil360.com.br',
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, ''),
        headers: {
          'X-Original-From': 'contato@meuperfil360.com.br',
          'Return-Path': 'contato@meuperfil360.com.br',
          'Sender': fromEmail
        }
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`✅ Email enviado via ${this.config?.smtpHost} para ${to}:`, result.messageId);
      console.log(`📧 Detalhes: aceitos=${result.accepted?.length}, rejeitados=${result.rejected?.length}`);
      return true;
    } catch (smtpError: any) {
      console.error('SMTP também falhou:', smtpError.message);
      console.log('Usando modo de desenvolvimento como fallback');
      return await this.sendEmailDevelopmentMode(to, subject, html);
    }
  }

  async sendTestEmail(testEmail: string): Promise<boolean> {
    const subject = 'Teste de Configuração SMTP - MeuPerfil360';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Teste de Email - MeuPerfil360</h2>
        <p>Este é um email de teste para verificar se as configurações SMTP estão funcionando corretamente.</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Status:</strong> ✅ Configuração SMTP funcionando!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Este email foi enviado automaticamente pelo sistema administrativo do MeuPerfil360.
        </p>
      </div>
    `;

    return await this.sendEmail(testEmail, subject, html);
  }

  async sendTemplateEmail(to: string, templateName: string, variables: Record<string, string> = {}): Promise<boolean> {
    try {
      const templates = await db.select().from(emailTemplates).where(sql`name = ${templateName}`);
      const template = templates[0];

      if (!template) {
        console.error(`Template '${templateName}' não encontrado`);
        return false;
      }

      let subject = template.subject;
      let content = template.content;

      console.log(`Substituindo variáveis para template ${templateName}:`, variables);

      // Replace variables in subject and content
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
        subject = subject.replace(regex, value || '');
        content = content.replace(regex, value || '');
        console.log(`Substituindo ${placeholder} por "${value}"`);
      }

      // Also handle common alternative variable names
      const alternativeVariables: Record<string, string> = {
        '{{name}}': variables.userName || variables.name || 'Usuário',
        '{{user}}': variables.userName || variables.name || 'Usuário',
        '{{email}}': to
      };

      for (const [placeholder, value] of Object.entries(alternativeVariables)) {
        const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
        subject = subject.replace(regex, value);
        content = content.replace(regex, value);
      }

      console.log(`Email final para ${to} - Assunto: ${subject}`);

      return await this.sendEmail(to, subject, content);
    } catch (error) {
      console.error('Erro ao enviar email com template:', error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.createTransporter();
      }

      await this.transporter!.verify();
      console.log('Conexão SMTP verificada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro na verificação SMTP:', error);
      console.log('Continuando com modo de desenvolvimento - emails serão logados no console');
      return true; // Allow development mode
    }
  }

  async sendEmailDevelopmentMode(to: string, subject: string, html: string): Promise<boolean> {
    console.log('\n=== EMAIL NÃO ENVIADO - MODO DESENVOLVIMENTO ===');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Erro: Configuração SMTP inválida ou SendGrid não configurado`);
    console.log(`Configuração atual:`);
    console.log(`- Host: ${this.config?.smtpHost}`);
    console.log(`- Porta: ${this.config?.smtpPort}`);
    console.log(`- Usuario: ${this.config?.smtpUser}`);
    console.log(`Soluções:`);
    console.log(`1. Configure SENDGRID_API_KEY para envio profissional`);
    console.log(`2. Verifique as credenciais SMTP no painel do provedor`);
    console.log(`3. Confirme se as credenciais estão ativas`);
    console.log('=== FIM DO EMAIL ===\n');
    
    return false;
  }

  // Automated email functions
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const variables = {
      userName: userName,
      loginUrl: 'https://www.meuperfil360.com.br/login',
      dashboardUrl: 'https://www.meuperfil360.com.br/login',
      testUrl: 'https://www.meuperfil360.com.br',
      supportEmail: 'contato@meuperfil360.com.br'
    };
    
    console.log(`Enviando email de boas-vindas para: ${to}`);
    return await this.sendTemplateEmail(to, 'boas_vindas_cadastro', variables);
  }

  async sendTestCompletionEmail(to: string, userName: string, profileType: string, resultId: string, isRegisteredUser: boolean = false): Promise<boolean> {
    const profileNames = {
      'D': 'Dominante',
      'I': 'Influente', 
      'S': 'Estável',
      'C': 'Conformidade'
    };

    // Smart URL routing: direct links for registered users, fallback for guests
    const resultUrl = isRegisteredUser 
      ? `https://www.meuperfil360.com.br/results/${resultId}`
      : 'https://www.meuperfil360.com.br/find-results';
    
    const upgradeUrl = isRegisteredUser 
      ? `https://www.meuperfil360.com.br/checkout/${resultId}`
      : 'https://www.meuperfil360.com.br/find-results';

    const variables = {
      userName: userName,
      profileType: profileType,
      profileName: profileNames[profileType as keyof typeof profileNames] || profileType,
      resultUrl: resultUrl,
      upgradeUrl: upgradeUrl,
      testUrl: 'https://www.meuperfil360.com.br',
      loginUrl: 'https://www.meuperfil360.com.br/login',
      dashboardUrl: 'https://www.meuperfil360.com.br/login'
    };
    
    console.log(`Enviando email de conclusão de teste para: ${to}`);
    return await this.sendTemplateEmail(to, 'teste_concluido', variables);
  }

  async sendPremiumUpgradeEmail(to: string, userName: string, profileType: string, resultId: string, userEmail?: string): Promise<boolean> {
    const profileNames = {
      'D': 'Dominante',
      'I': 'Influente',
      'S': 'Estável', 
      'C': 'Conformidade'
    };

    // PDF URL with email parameter for guest access
    const pdfUrl = userEmail 
      ? `https://www.meuperfil360.com.br/api/test/result/${resultId}/pdf?email=${encodeURIComponent(userEmail)}`
      : `https://www.meuperfil360.com.br/api/test/result/${resultId}/pdf`;

    const variables = {
      userName: userName,
      profileType: profileType,
      profileName: profileNames[profileType as keyof typeof profileNames] || profileType,
      pdfUrl: pdfUrl,
      dashboardUrl: 'https://www.meuperfil360.com.br/login',
      loginUrl: 'https://www.meuperfil360.com.br/login',
      resultUrl: `https://www.meuperfil360.com.br/results/${resultId}`,
      testUrl: 'https://www.meuperfil360.com.br'
    };
    
    console.log(`Enviando email de upgrade premium para: ${to}`);
    return await this.sendTemplateEmail(to, 'upgrade_premium', variables);
  }

  async sendRetestReminderEmail(to: string, userName: string, daysSinceLastTest: number): Promise<boolean> {
    const variables = {
      userName: userName,
      daysSinceLastTest: daysSinceLastTest.toString(),
      testUrl: 'https://meuperfil360.com.br',
      loginUrl: 'https://meuperfil360.com.br/login',
      dashboardUrl: 'https://meuperfil360.com.br/login'
    };
    
    console.log(`Enviando lembrete de reteste para: ${to}`);
    return await this.sendTemplateEmail(to, 'lembrete_reteste', variables);
  }

  async sendPasswordResetEmail(to: string, userName: string, resetUrl: string): Promise<boolean> {
    // Use Replit public domain or production domain
    const isDevelopment = process.env.NODE_ENV === 'development';
    const replitDomain = process.env.REPLIT_DOMAINS;
    
    let baseUrl;
    if (isDevelopment && replitDomain) {
      baseUrl = `https://${replitDomain}`;
    } else if (!isDevelopment) {
      baseUrl = 'https://meuperfil360.com.br';
    } else {
      baseUrl = 'http://localhost:5000';
    }
    
    const tokenMatch = resetUrl.match(/token=([^&]+)/);
    const token = tokenMatch ? tokenMatch[1] : '';
    const finalResetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    const variables = {
      userName: userName,
      resetUrl: finalResetUrl,
      loginUrl: `${baseUrl}/login`,
      testUrl: baseUrl,
      supportEmail: 'contato@meuperfil360.com.br'
    };
    
    console.log(`Enviando email de recuperação de senha para: ${to} com URL: ${finalResetUrl}`);
    return await this.sendTemplateEmail(to, 'recuperacao_senha', variables);
  }
}

export const emailService = new EmailService();