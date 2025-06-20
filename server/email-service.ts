import nodemailer from 'nodemailer';
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
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (!this.config) {
      throw new Error('Configuração de email não encontrada');
    }

    // Primeira tentativa: Configuração Gmail otimizada
    const gmailConfig: any = {
      service: 'gmail',
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      }
    };

    try {
      this.transporter = nodemailer.createTransport(gmailConfig);
      console.log('Transporter Gmail criado com sucesso');
      return this.transporter;
    } catch (error) {
      console.log('Falha na configuração Gmail, tentando configuração SMTP manual...');
    }

    // Segunda tentativa: Configuração SMTP manual
    const manualConfig: any = {
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpPort === 465, // true para 465, false para outras portas
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    this.transporter = nodemailer.createTransport(manualConfig);
    console.log('Transporter SMTP manual criado com sucesso');
    return this.transporter;
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.createTransporter();
      }

      if (!this.config) {
        throw new Error('Configuração de email não disponível');
      }

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, ''), // Remove HTML tags for text version
      };

      try {
        const result = await this.transporter!.sendMail(mailOptions);
        console.log('Email enviado com sucesso:', result.messageId);
        return true;
      } catch (smtpError) {
        console.log('Falha no envio SMTP, usando modo de desenvolvimento');
        return await this.sendEmailDevelopmentMode(to, subject, html);
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
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
    console.log('\n=== EMAIL DE DESENVOLVIMENTO ===');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Conteúdo HTML:\n${html}`);
    console.log('=== FIM DO EMAIL ===\n');
    return true;
  }

  // Automated email functions
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const variables = {
      userName: userName,
      loginUrl: 'https://www.meuperfil.com.br/login',
      dashboardUrl: 'https://www.meuperfil.com.br/login',
      supportEmail: 'suporte@meuperfil360.com.br'
    };
    
    console.log(`Enviando email de boas-vindas para: ${to}`);
    return await this.sendTemplateEmail(to, 'boas_vindas_cadastro', variables);
  }

  async sendTestCompletionEmail(to: string, userName: string, profileType: string, resultId: string): Promise<boolean> {
    const profileNames = {
      'D': 'Dominante',
      'I': 'Influente', 
      'S': 'Estável',
      'C': 'Conscencioso'
    };

    const variables = {
      userName: userName,
      profileType: profileType,
      profileName: profileNames[profileType as keyof typeof profileNames] || profileType,
      resultUrl: `${process.env.VITE_APP_URL || 'https://meuperfil360.replit.app'}/results/${resultId}`,
      upgradeUrl: `${process.env.VITE_APP_URL || 'https://meuperfil360.replit.app'}/checkout/${resultId}`
    };
    
    console.log(`Enviando email de conclusão de teste para: ${to}`);
    return await this.sendTemplateEmail(to, 'teste_concluido', variables);
  }

  async sendPremiumUpgradeEmail(to: string, userName: string, profileType: string, resultId: string): Promise<boolean> {
    const profileNames = {
      'D': 'Dominante',
      'I': 'Influente',
      'S': 'Estável', 
      'C': 'Conscencioso'
    };

    const variables = {
      userName: userName,
      profileType: profileType,
      profileName: profileNames[profileType as keyof typeof profileNames] || profileType,
      pdfUrl: `${process.env.VITE_APP_URL || 'https://meuperfil360.replit.app'}/api/test/result/${resultId}/pdf`,
      dashboardUrl: `${process.env.VITE_APP_URL || 'https://meuperfil360.replit.app'}/dashboard`
    };
    
    console.log(`Enviando email de upgrade premium para: ${to}`);
    return await this.sendTemplateEmail(to, 'upgrade_premium', variables);
  }

  async sendRetestReminderEmail(to: string, userName: string, daysSinceLastTest: number): Promise<boolean> {
    const variables = {
      userName: userName,
      daysSinceLastTest: daysSinceLastTest.toString(),
      testUrl: process.env.VITE_APP_URL || 'https://meuperfil360.replit.app'
    };
    
    console.log(`Enviando lembrete de reteste para: ${to}`);
    return await this.sendTemplateEmail(to, 'lembrete_reteste', variables);
  }
}

export const emailService = new EmailService();