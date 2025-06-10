
import { DataEncryption } from './security-middleware';
import { db } from './db';
import { testResults } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class DataProtectionService {
  
  // Criptografar dados sensíveis antes de salvar
  static encryptSensitiveData(data: any): any {
    const sensitiveFields = ['guestEmail', 'guestWhatsapp', 'answers'];
    
    const encrypted = { ...data };
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        if (typeof encrypted[field] === 'object') {
          encrypted[field] = DataEncryption.encrypt(JSON.stringify(encrypted[field]));
        } else {
          encrypted[field] = DataEncryption.encrypt(String(encrypted[field]));
        }
      }
    }
    
    return encrypted;
  }
  
  // Descriptografar dados ao recuperar
  static decryptSensitiveData(data: any): any {
    const sensitiveFields = ['guestEmail', 'guestWhatsapp', 'answers'];
    
    const decrypted = { ...data };
    
    for (const field of sensitiveFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          const decryptedValue = DataEncryption.decrypt(decrypted[field]);
          
          // Tentar parse JSON se aplicável
          if (field === 'answers') {
            try {
              decrypted[field] = JSON.parse(decryptedValue);
            } catch {
              decrypted[field] = decryptedValue;
            }
          } else {
            decrypted[field] = decryptedValue;
          }
        } catch (error) {
          console.warn(`Falha ao descriptografar campo ${field}:`, error);
          // Manter valor original se falhar
        }
      }
    }
    
    return decrypted;
  }
  
  // Anonymizar dados para relatórios
  static anonymizeData(data: any): any {
    const anonymized = { ...data };
    
    // Remover ou mascarar dados pessoais
    if (anonymized.guestEmail) {
      const [local, domain] = anonymized.guestEmail.split('@');
      anonymized.guestEmail = `${local.substring(0, 2)}***@${domain}`;
    }
    
    if (anonymized.guestWhatsapp) {
      anonymized.guestWhatsapp = `***${anonymized.guestWhatsapp.slice(-4)}`;
    }
    
    if (anonymized.guestName) {
      const names = anonymized.guestName.split(' ');
      anonymized.guestName = `${names[0]} ${names.length > 1 ? names[names.length - 1][0] + '***' : ''}`;
    }
    
    return anonymized;
  }
  
  // Log de acesso a dados sensíveis
  static logDataAccess(userId: string | null, dataType: string, action: string, ip?: string): void {
    console.log(`[DATA_ACCESS] ${new Date().toISOString()} - User: ${userId || 'guest'}, Type: ${dataType}, Action: ${action}, IP: ${ip || 'unknown'}`);
    
    // Aqui poderia salvar em tabela de auditoria
    // await db.insert(accessLogs).values({...})
  }
  
  // Verificar conformidade LGPD
  static checkLGPDCompliance(data: any): boolean {
    // Verificar se dados pessoais estão sendo tratados corretamente
    const personalDataFields = ['guestEmail', 'guestWhatsapp', 'guestName'];
    
    for (const field of personalDataFields) {
      if (data[field] && typeof data[field] === 'string' && !this.isEncrypted(data[field])) {
        console.warn(`Campo ${field} não está criptografado - possível violação LGPD`);
        return false;
      }
    }
    
    return true;
  }
  
  private static isEncrypted(value: string): boolean {
    // Verificar se o valor parece estar criptografado (contém ':')
    return value.includes(':') && value.split(':').length >= 3;
  }
  
  // Direito ao esquecimento (LGPD)
  static async deleteUserData(identifier: string): Promise<boolean> {
    try {
      // Deletar todos os dados do usuário
      await db.delete(testResults)
        .where(eq(testResults.guestEmail, identifier));
        
      this.logDataAccess(null, 'personal_data', 'deletion_request', identifier);
      return true;
    } catch (error) {
      console.error('Erro ao deletar dados do usuário:', error);
      return false;
    }
  }
}
