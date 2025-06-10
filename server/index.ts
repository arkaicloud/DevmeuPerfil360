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

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://m.stripe.network"],
      imgSrc: ["'self'", "data:", "https:", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://m.stripe.network", "https://m.stripe.com"],
      fontSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      childSrc: ["'self'", "https://js.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

  // Middlewares de segurança básicos apenas
  app.use(securityHeaders);
  // Removidos temporariamente para evitar falsos positivos:
  // app.use(strictRateLimit);
  // app.use(threatDetection);
  // app.use(validateInput);

  // CORS configuration - mais restritivo
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://meuperfil360.com.br', 'https://www.meuperfil360.com.br']
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 5, // limit each IP to 5 requests per windowMs for sensitive operations
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
  },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Very strict for admin operations
  message: {
    error: 'Muitas tentativas de login administrativo. Tente novamente em 15 minutos.',
  },
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
    const message = err.message || "Internal Server Error";

    // Log error details for debugging (but don't expose sensitive info)
    console.error(`Error ${status} on ${req.method} ${req.path}:`, {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Don't expose stack traces in production
    const responseMessage = process.env.NODE_ENV === 'production' && status === 500 
      ? "Erro interno do servidor" 
      : message;

    res.status(status).json({ message: responseMessage });
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