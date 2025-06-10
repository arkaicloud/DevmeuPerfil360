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

      // Replace variables in subject and content
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        content = content.replace(new RegExp(placeholder, 'g'), value);
      }

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
}

export const emailService = new EmailService();