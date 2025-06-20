import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { securityHeaders, strictRateLimit, threatDetection, validateInput } from "./security-middleware";

const app = express();

// Trust proxy for rate limiting to work correctly behind proxies
app.set('trust proxy', 1);

// Security Headers - Fortalecidos
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://m.stripe.network"],
      imgSrc: ["'self'", "data:", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://m.stripe.network", "https://m.stripe.com"],
      fontSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      childSrc: ["'self'", "https://js.stripe.com"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

  // Middlewares de segurança - CSP desabilitado em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    app.use(securityHeaders);
    app.use(strictRateLimit);
    app.use(threatDetection);
    app.use(validateInput);
  }
  // Desenvolvimento sem restrições CSP para permitir Vite/React

  // CORS configuration for production domain
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://www.meuperfil360.com.br', 'https://meuperfil360.com.br']
      : ['http://localhost:5000', 'http://127.0.0.1:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

// Rate Limiting - Fortalecido para segurança
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Reduzido para 50 requests por IP
  message: {
    error: 'Limite de requisições excedido.',
  },
  standardHeaders: false, // Ocultar headers de rate limit
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes  
  max: 3, // Apenas 3 tentativas por 10 min
  message: {
    error: 'Muitas tentativas. Aguarde antes de tentar novamente.',
  },
  standardHeaders: false,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 2, // Máximo 2 tentativas admin por 30 min
  message: {
    error: 'Acesso negado. Limite de tentativas excedido.',
  },
  standardHeaders: false,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/auth/', strictLimiter);
app.use('/api/payment/', strictLimiter);
app.use('/api/admin/', adminLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    // Respostas sanitizadas para evitar information disclosure
    const sanitizedErrors: Record<number, string> = {
      400: "Requisição inválida",
      401: "Acesso não autorizado", 
      403: "Acesso negado",
      404: "Recurso não encontrado",
      422: "Dados inválidos",
      429: "Limite de requisições excedido",
      500: "Erro interno do servidor"
    };
    
    const responseMessage = process.env.NODE_ENV === 'production' 
      ? sanitizedErrors[status] || "Erro no servidor"
      : err.message || "Internal Server Error";

    res.status(status).json({ 
      error: responseMessage,
      timestamp: new Date().toISOString()
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();