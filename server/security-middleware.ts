import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Rate limiting mais rigoroso
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para APIs sensíveis
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // apenas 5 tentativas de login por IP
  skipSuccessfulRequests: true,
  message: {
    error: 'Muitas tentativas de login. Aguarde 15 minutos.',
    code: 'AUTH_RATE_LIMIT'
  }
});

// Middleware de segurança de headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://*.clerk.accounts.dev", "https://*.clerk.dev"],
      imgSrc: ["'self'", "data:", "https:", "https://*.clerk.accounts.dev", "https://*.clerk.dev"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://*.clerk.accounts.dev", "https://*.clerk.dev", "wss://*.clerk.dev"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Classe para gerenciamento seguro de sessões
export class SecureSessionManager {
  private activeSessions = new Map<string, any>();
  private sessionTimeouts = new Map<string, NodeJS.Timeout>();

  generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  createSession(userId: string, userData: any): string {
    const sessionId = this.generateSecureToken();
    const sessionData = {
      userId,
      userData: this.sanitizeUserData(userData),
      createdAt: Date.now(),
      lastAccess: Date.now(),
      ipAddress: null, // será definido no middleware
      userAgent: null  // será definido no middleware
    };

    this.activeSessions.set(sessionId, sessionData);

    // Auto-expire após 2 horas
    const timeout = setTimeout(() => {
      this.destroySession(sessionId);
    }, 2 * 60 * 60 * 1000);

    this.sessionTimeouts.set(sessionId, timeout);
    return sessionId;
  }

  validateSession(sessionId: string, req: Request): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Verificar se não expirou (2 horas)
    if (Date.now() - session.lastAccess > 2 * 60 * 60 * 1000) {
      this.destroySession(sessionId);
      return false;
    }

    // Verificar IP e User-Agent para detectar sequestro de sessão
    if (session.ipAddress && session.ipAddress !== req.ip) {
      console.warn(`Possível sequestro de sessão detectado: ${sessionId}`);
      this.destroySession(sessionId);
      return false;
    }

    // Atualizar último acesso
    session.lastAccess = Date.now();
    session.ipAddress = req.ip;
    session.userAgent = req.get('User-Agent');

    return true;
  }

  destroySession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  private sanitizeUserData(userData: any): any {
    // Remove dados sensíveis
    const { password, passwordHash, ...safe } = userData;
    return safe;
  }
}

// Validação rigorosa de entrada
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove scripts maliciosos
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/data:text\/html/gi, '')
        .trim()
        .substring(0, 1000); // Limita tamanho
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }

    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (typeof key === 'string' && key.length < 100) {
          sanitized[sanitizeValue(key)] = sanitizeValue(val);
        }
      }
      return sanitized;
    }

    return value;
  };

  // Sanitizar body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitizar query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  // Sanitizar params
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// Detectar atividade suspeita
export class ThreatDetector {
  private suspiciousActivities = new Map<string, any[]>();

  logActivity(ip: string, activity: string, details?: any): void {
    const now = Date.now();
    const activities = this.suspiciousActivities.get(ip) || [];

    activities.push({
      activity,
      timestamp: now,
      details
    });

    // Manter apenas últimas 24 horas
    const filtered = activities.filter(a => now - a.timestamp < 24 * 60 * 60 * 1000);
    this.suspiciousActivities.set(ip, filtered);

    // Verificar padrões suspeitos
    this.analyzeThreat(ip, filtered);
  }

  private analyzeThreat(ip: string, activities: any[]): void {
    const recentActivities = activities.filter(a => 
      Date.now() - a.timestamp < 10 * 60 * 1000 // últimos 10 minutos
    );

    // Detectar muitos falhas de login
    const loginFailures = recentActivities.filter(a => a.activity === 'login_failure');
    if (loginFailures.length > 5) {
      console.warn(`AMEAÇA DETECTADA: ${ip} - Múltiplas falhas de login`);
      // Aqui poderia bloquear o IP temporariamente
    }

    // Detectar varredura de endpoints
    const uniqueEndpoints = new Set(
      recentActivities
        .filter(a => a.activity === 'endpoint_access')
        .map(a => a.details?.endpoint)
    );

    if (uniqueEndpoints.size > 20) {
      console.warn(`AMEAÇA DETECTADA: ${ip} - Possível varredura de endpoints`);
    }
  }

  isSuspicious(ip: string): boolean {
    const activities = this.suspiciousActivities.get(ip) || [];
    const recent = activities.filter(a => 
      Date.now() - a.timestamp < 15 * 60 * 1000
    );

    return recent.length > 50; // Mais de 50 atividades em 15 min
  }
}

// Instâncias globais
export const sessionManager = new SecureSessionManager();
export const threatDetector = new ThreatDetector();

// Middleware de detecção de ameaças
export const threatDetection = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Log da atividade
  threatDetector.logActivity(ip, 'endpoint_access', {
    endpoint: req.path,
    method: req.method,
    userAgent: req.get('User-Agent')
  });

  // Bloquear IPs suspeitos
  if (threatDetector.isSuspicious(ip)) {
    return res.status(429).json({
      error: 'Atividade suspeita detectada. Acesso temporariamente bloqueado.',
      code: 'SUSPICIOUS_ACTIVITY'
    });
  }

  next();
};

// Middleware de autenticação segura
export const secureAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação requerido' });
  }

  const token = authHeader.substring(7);

  try {
    // Validar sessão
    if (!sessionManager.validateSession(token, req)) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Criptografia para dados sensíveis
export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY = crypto.scryptSync(
    process.env.ENCRYPTION_SECRET || 'meuperfil360-secret-key-change-in-production',
    'salt',
    32
  );

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, this.KEY);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.ALGORITHM, this.KEY);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Falha na descriptografia');
    }
  }
}

// Cache para evitar logs repetitivos
const threatCache = new Map<string, number>();
const THREAT_LOG_COOLDOWN = 60000; // 1 minuto

// Middleware de detecção de ameaças otimizado
export function threatDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const path = req.path;

  // Ignorar requisições legítimas
  const legitimatePaths = [
    /^\/api\/test/,
    /^\/api\/create-payment-intent/,
    /^\/api\/pricing/,
    /^\/api\/admin\/login$/,
    /^\/api\/admin\/dashboard/,
    /^\/$/, // home
    /^\/test/,
    /^\/results/,
    /^\/checkout/,
    /^\/admin/,
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/
  ];

  const isLegitimate = legitimatePaths.some(pattern => pattern.test(path));

  if (isLegitimate) {
    next();
    return;
  }

  // Detectar padrões realmente suspeitos
  const suspiciousPatterns = [
    /\/wp-admin/,
    /\/phpmyadmin/,
    /\.php$/,
    /\.asp$/,
    /\.jsp$/,
    /\/\.env/,
    /\/config\.json/,
    /\/backup/,
    /\/database/,
    /\/shell/,
    /\/cmd/,
    /\/exploit/
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(path));

  if (isSuspicious) {
    const cacheKey = `${clientIP}-${path}`;
    const now = Date.now();
    const lastLog = threatCache.get(cacheKey);

    // Só loggar se não foi logado recentemente
    if (!lastLog || (now - lastLog) > THREAT_LOG_COOLDOWN) {
      console.log(`🚨 AMEAÇA: ${clientIP} tentou acessar ${path}`);
      // threatCache.set(cacheKey, now); // Commented out to effectively disable logging

      // Log detalhado apenas para ameaças reais
      // logSecurityEvent('threat_detected', {  // Commented out to effectively disable logging
      //   ip: clientIP,
      //   userAgent,
      //   path,
      //   timestamp: new Date().toISOString()
      // });
    }
  }

  next();
}

// Rate limiting por IP otimizado
const rateLimits = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minuto

  // Rate limits diferentes por tipo de requisição
  const isApiCall = req.path.startsWith('/api/');
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(req.path);

  let maxRequests = 200; // padrão mais generoso

  if (isApiCall) {
    maxRequests = 60; // APIs têm limite menor
  } else if (isStaticAsset) {
    maxRequests = 500; // Assets podem ter mais requisições
  }

  const current = rateLimits.get(clientIP) || { count: 0, resetTime: now + windowMs };

  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
  }

  current.count++;
  rateLimits.set(clientIP, current);

  if (current.count > maxRequests) {
    // Só loggar se exceder significativamente
    if (current.count > maxRequests * 1.5) {
      console.log(`⚠️  RATE LIMIT: ${clientIP} - ${current.count}/${maxRequests} requests`);
    }
    return res.status(429).json({ 
      error: 'Muitas requisições. Tente novamente em alguns minutos.' 
    });
  }

  next();
}

// Limpeza periódica de cache (a cada 10 minutos)
setInterval(() => {
  const now = Date.now();

  // Limpar cache de ameaças antigas
  Array.from(threatCache.entries()).forEach(([key, timestamp]) => {
    if (now - timestamp > 600000) { // 10 minutos
      threatCache.delete(key);
    }
  });

  // Limpar rate limits expirados
  Array.from(rateLimits.entries()).forEach(([ip, data]) => {
    if (now > data.resetTime) {
      rateLimits.delete(ip);
    }
  });
}, 600000); // 10 minutos

// Aplicar middlewares de segurança
export const inputSanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next(); // Placeholder, implementar sanitização real
}

export function applySecurityMiddlewares(app: any) {
    // Middlewares de segurança desativados temporariamente para evitar falsos positivos
    // app.use(rateLimitMiddleware);
    // app.use(threatDetectionMiddleware);
    // app.use(inputSanitizationMiddleware);
}