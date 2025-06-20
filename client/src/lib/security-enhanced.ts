import CryptoJS from 'crypto-js';

// Configurações de segurança
const SECURITY_CONFIG = {
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 horas
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutos
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hora
  ENCRYPTION_KEY: import.meta.env.VITE_ENCRYPTION_KEY || 'meuperfil360-secure-key'
};

// Rate limiting para tentativas de login
class SecurityManager {
  private loginAttempts: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }> = new Map();
  private sessionTimeouts: Map<string, number> = new Map();

  // Validação de entrada com sanitização
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>\"']/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .substring(0, 1000); // Limitar tamanho
  }

  // Validação robusta de email
  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = this.sanitizeInput(email);
    
    if (!emailRegex.test(sanitized)) return false;
    if (sanitized.length > 254) return false;
    if (sanitized.includes('..')) return false;
    
    return true;
  }

  // Validação de senha forte
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Pelo menos 1 maiúscula');
    if (!/[a-z]/.test(password)) errors.push('Pelo menos 1 minúscula');
    if (!/[0-9]/.test(password)) errors.push('Pelo menos 1 número');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Pelo menos 1 símbolo');
    if (password.length > 128) errors.push('Máximo 128 caracteres');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Controle de tentativas de login
  checkLoginAttempts(identifier: string): { allowed: boolean; remainingAttempts?: number; lockoutTime?: number } {
    const attempts = this.loginAttempts.get(identifier);
    const now = Date.now();
    
    if (!attempts) {
      return { allowed: true };
    }
    
    // Verificar se ainda está bloqueado
    if (attempts.lockedUntil && now < attempts.lockedUntil) {
      return {
        allowed: false,
        lockoutTime: Math.ceil((attempts.lockedUntil - now) / 60000) // minutos
      };
    }
    
    // Reset se passou tempo suficiente
    if (now - attempts.lastAttempt > SECURITY_CONFIG.LOCKOUT_DURATION) {
      this.loginAttempts.delete(identifier);
      return { allowed: true };
    }
    
    // Verificar limite de tentativas
    if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      this.loginAttempts.set(identifier, {
        ...attempts,
        lockedUntil: now + SECURITY_CONFIG.LOCKOUT_DURATION
      });
      return { allowed: false, lockoutTime: 30 };
    }
    
    return {
      allowed: true,
      remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts.count
    };
  }

  // Registrar tentativa de login
  recordLoginAttempt(identifier: string, success: boolean): void {
    const now = Date.now();
    
    if (success) {
      this.loginAttempts.delete(identifier);
      return;
    }
    
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    this.loginAttempts.set(identifier, {
      count: attempts.count + 1,
      lastAttempt: now
    });
  }

  // Criptografia de dados sensíveis
  encryptSensitiveData(data: any): string {
    try {
      const jsonData = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonData, SECURITY_CONFIG.ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Erro na criptografia:', error);
      throw new Error('Erro ao processar dados');
    }
  }

  // Descriptografia de dados
  decryptSensitiveData(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      throw new Error('Dados corrompidos');
    }
  }

  // Geração de token seguro
  generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Validação de sessão
  validateSession(token: string): boolean {
    try {
      const sessionData = this.decryptSensitiveData(token);
      const now = Date.now();
      
      if (!sessionData.timestamp || !sessionData.expiry) return false;
      if (now > sessionData.expiry) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  // Armazenamento seguro de sessão
  setSecureSession(userId: string, userData: any): void {
    const now = Date.now();
    const sessionData = {
      userId,
      userData: this.sanitizeUserData(userData),
      timestamp: now,
      expiry: now + SECURITY_CONFIG.TOKEN_EXPIRY,
      sessionId: this.generateSecureToken()
    };
    
    const encryptedSession = this.encryptSensitiveData(sessionData);
    localStorage.setItem('adminToken', encryptedSession);
    
    // Configurar timeout de sessão
    this.sessionTimeouts.set(userId, window.setTimeout(() => {
      this.clearSession(userId);
    }, SECURITY_CONFIG.SESSION_TIMEOUT));
  }

  // Sanitização de dados do usuário
  sanitizeUserData(userData: any): any {
    if (!userData || typeof userData !== 'object') return {};
    
    const sanitized: any = {};
    
    // Campos permitidos e sanitizados
    if (userData.id) sanitized.id = String(userData.id).substring(0, 100);
    if (userData.email) sanitized.email = this.sanitizeInput(userData.email);
    if (userData.role) sanitized.role = this.sanitizeInput(userData.role);
    if (userData.loginTime) sanitized.loginTime = userData.loginTime;
    
    // Nunca expor dados sensíveis
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.secret;
    delete sanitized.token;
    
    return sanitized;
  }

  // Limpeza de sessão
  clearSession(userId?: string): void {
    localStorage.removeItem('adminToken');
    if (userId && this.sessionTimeouts.has(userId)) {
      clearTimeout(this.sessionTimeouts.get(userId));
      this.sessionTimeouts.delete(userId);
    }
  }

  // Reset de segurança para desenvolvimento
  resetSecurityLimits(): void {
    // Limpar tentativas de login
    this.loginAttempts.clear();
    
    // Limpar atividades suspeitas
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('activity_')) {
        localStorage.removeItem(key);
      }
    });
    
    this.securityLog('Limites de segurança resetados');
  }

  // Validação de CSRF token
  generateCSRFToken(): string {
    const token = this.generateSecureToken();
    sessionStorage.setItem('csrfToken', token);
    return token;
  }

  validateCSRFToken(token: string): boolean {
    const storedToken = sessionStorage.getItem('csrfToken');
    return storedToken === token && token.length === 64;
  }

  // Detecção de atividade suspeita
  detectSuspiciousActivity(action: string, frequency: number = 10, windowMs: number = 60000): boolean {
    // Modo desenvolvimento - limites mais flexíveis
    if (import.meta.env.DEV) {
      frequency = 15; // Mais tentativas permitidas em dev
      windowMs = 30000; // Janela menor em dev
    }
    
    const key = `activity_${action}`;
    const now = Date.now();
    const activities = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Filtrar atividades dentro da janela de tempo
    const recentActivities = activities.filter((time: number) => now - time < windowMs);
    
    if (recentActivities.length >= frequency) {
      console.warn(`Atividade suspeita detectada: ${action}`);
      return true;
    }
    
    // Armazenar nova atividade
    recentActivities.push(now);
    localStorage.setItem(key, JSON.stringify(recentActivities.slice(-frequency)));
    
    return false;
  }

  // Log de segurança (apenas em desenvolvimento)
  securityLog(event: string, details?: any): void {
    if (import.meta.env.DEV) {
      // Security event logged internally - details removed for privacy
    }
    
    // Em produção, enviar para serviço de monitoramento
    if (import.meta.env.PROD) {
      // TODO: Implementar envio para serviço de log de segurança
    }
  }
}

export const securityManager = new SecurityManager();

// Headers de segurança para requisições
export const getSecureHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'X-CSRF-Token': securityManager.generateCSRFToken()
});

// Middleware para validação de entrada
export const validateAndSanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return securityManager.sanitizeInput(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(validateAndSanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = securityManager.sanitizeInput(key);
      sanitized[sanitizedKey] = validateAndSanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

export { SECURITY_CONFIG };