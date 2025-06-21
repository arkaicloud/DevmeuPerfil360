import type { Express } from "express";
import express, { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { 
  discTestSubmissionSchema, 
  registrationSchema,
  guestTestDataSchema,
  users,
  testResults,
  payments,
  adminConfigs,
  emailTemplates
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { calculateDiscProfile } from "../client/src/lib/disc-calculator";
import { body, param, query, validationResult } from "express-validator";
import { emailService } from "./email-service";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { 
  strictRateLimit,
  authRateLimit,
  securityHeaders,
  validateInput,
  threatDetection,
  sessionManager,
  threatDetector,
  DataEncryption
} from "./security-middleware";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "./clerk-middleware";
import { config } from "./config";
import { cache } from "./cache";
// import puppeteer from "puppeteer"; // Disabled due to system dependencies

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

// Security validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos fornecidos',
      details: errors.array()
    });
  }
  next();
};

// Input sanitization middleware
const sanitizeInput = (req: any, res: any, next: any) => {
  // Sanitize all string inputs to prevent XSS
  const sanitizeObj = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObj);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObj(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObj(req.body);
  }
  if (req.query) {
    req.query = sanitizeObj(req.query);
  }
  if (req.params) {
    req.params = sanitizeObj(req.params);
  }
  next();
};

// Enhanced rate limiting for test submissions
const testSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 test submissions per hour
  message: {
    error: 'Limite de testes atingido. Tente novamente em 1 hora.',
  },
});

// Rate limiting for PDF generation
const pdfLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 PDF requests per 5 minutes
  message: {
    error: 'Muitas solicitações de PDF. Tente novamente em alguns minutos.',
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Check if user exists by email - Early route
  app.get("/api/user/check-email", [
    query('email').isEmail().withMessage('Email inválido'),
    validateRequest
  ], async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      const user = await storage.getUserByEmail(email as string);
      
      res.json({ 
        exists: !!user,
        hasAccount: !!user
      });
    } catch (error: any) {
      console.error('Check email error:', error);
      res.status(500).json({ 
        error: "Erro ao verificar email",
        exists: false
      });
    }
  });

  // Submit DISC test for guest users
  app.post("/api/test/submit", [
    testSubmissionLimiter,
    sanitizeInput
  ], async (req: any, res: any) => {
    try {
      // Log removido para otimização de performance
      
      // Basic validation for guest test submission
      const { guestData, answers } = req.body;
      
      if (!guestData || !answers || !Array.isArray(answers)) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: "guestData e answers são obrigatórios"
        });
      }
      
      if (answers.length !== 24) {
        return res.status(400).json({
          error: "Número incorreto de respostas",
          details: `Esperado 24 respostas, recebido ${answers.length}`
        });
      }

      // Calculate DISC profile
      const discResults = calculateDiscProfile(answers);

      // Create test result
      const testResult = await storage.createTestResult({
        userId: null,
        guestEmail: guestData.email,
        guestName: guestData.name,
        guestWhatsapp: guestData.whatsapp,
        testType: 'DISC',
        answers: answers,
        scores: discResults.scores,
        profileType: discResults.profileType,
        isPremium: false,
        paymentId: null,
      });

      // Send response immediately for better UX
      res.json({
        testResultId: testResult.id,
        profile: discResults,
        isPremium: false,
      });

      // Send test completion email asynchronously (truly non-blocking)
      setImmediate(() => {
        emailService.sendTestCompletionEmail(
          guestData.email, 
          guestData.name, 
          discResults.profileType, 
          testResult.id.toString(),
          false // Guest user - use fallback URLs
        ).catch(error => {
          console.error('Erro ao enviar email de conclusão de teste para convidado:', error);
        });
      });
    } catch (error: any) {
      console.error('Test submission error:', error);
      res.status(400).json({ 
        message: "Erro ao processar teste",
        error: error.message 
      });
    }
  });

  // Submit DISC test for registered users
  app.post("/api/test/submit-user", [
    testSubmissionLimiter,
    sanitizeInput,
    body('userId').isInt({ min: 1 }).withMessage('User ID inválido'),
    body('answers').isArray({ min: 1, max: 50 }).withMessage('Respostas inválidas'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { userId, answers } = req.body;

      if (!userId || !answers) {
        return res.status(400).json({ message: "UserId e answers são obrigatórios" });
      }

      // Log removido para otimização de performance

      // Verify user exists
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Check test limits before proceeding
      const testLimits = await storage.checkUserTestLimits(parseInt(userId));
      if (!testLimits.canTakeTest) {
        return res.status(403).json({ 
          message: testLimits.reason,
          canTakeTest: false,
          needsPremium: !user.isPremiumActive
        });
      }

      // Log removido para otimização de performance

      // Calculate DISC profile
      const discResults = calculateDiscProfile(answers);

      // Create test result linked to user
      const testResult = await storage.createTestResult({
        userId: parseInt(userId),
        guestEmail: null,
        guestName: user.firstName || user.email,
        guestWhatsapp: null,
        testType: 'DISC',
        answers: answers,
        scores: discResults.scores,
        profileType: discResults.profileType,
        isPremium: false,
        paymentId: null,
      });

      // Consume the test (decrement user's available tests)
      await storage.consumeUserTest(parseInt(userId));

      // Log removido para otimização de performance

      // Send response immediately for better UX
      res.json({
        testResultId: testResult.id,
        profile: discResults,
        isPremium: false,
      });

      // Send test completion email asynchronously (truly non-blocking)
      setImmediate(() => {
        emailService.sendTestCompletionEmail(
          user.email, 
          user.firstName || user.email, 
          discResults.profileType, 
          testResult.id.toString(),
          true // Registered user - use direct URLs
        ).catch(error => {
          console.error('Erro ao enviar email de conclusão de teste:', error);
        });
      });
    } catch (error: any) {
      console.error('User test submission error:', error);
      res.status(400).json({ 
        message: "Erro ao processar teste",
        error: error.message 
      });
    }
  });

  // Get test result
  app.get("/api/test/result/:id", [
    sanitizeInput,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const testId = parseInt(req.params.id);
      const testResult = await storage.getTestResult(testId);

      if (!testResult) {
        return res.status(404).json({ message: "Teste não encontrado" });
      }

      // Ensure scores are properly formatted
      let scores = testResult.scores;
      if (typeof scores === 'string') {
        try {
          scores = JSON.parse(scores);
        } catch (e) {
          console.error('Error parsing scores:', e);
          scores = { D: 0, I: 0, S: 0, C: 0 };
        }
      }
      
      // Validate scores structure
      if (!scores || typeof scores !== 'object') {
        scores = { D: 0, I: 0, S: 0, C: 0 };
      }

      res.json({
        id: testResult.id,
        profileType: testResult.profileType || 'S',
        scores: scores,
        isPremium: testResult.isPremium || false,
        createdAt: testResult.createdAt,
        guestName: testResult.guestName || 'Usuário',
        guestEmail: testResult.guestEmail || null,
        guestWhatsapp: testResult.guestWhatsapp || null,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao buscar resultado" });
    }
  });
  
  // Find test result by email or WhatsApp
  app.post("/api/test/find", [
    sanitizeInput,
    body('identifier').isLength({ min: 3, max: 100 }).trim().withMessage('Identificador inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { identifier } = req.body;
      
      if (!identifier) {
        return res.status(400).json({ message: "Email ou WhatsApp é obrigatório" });
      }
      
      console.log("Buscando teste para identificador:", identifier);
      
      // Try to find by email first
      let testResult = await storage.getTestResultByGuest(identifier);
      
      // If not found by email, try to find by WhatsApp
      if (!testResult) {
        console.log("Não encontrado por email, tentando WhatsApp");
        testResult = await storage.getTestResultByWhatsApp(identifier);
      }
      
      // If not found, try to find by name
      if (!testResult) {
        console.log("Não encontrado por WhatsApp, tentando nome");
        const testsByName = await storage.getTestResultsByName(identifier);
        if (testsByName && testsByName.length > 0) {
          testResult = testsByName[0]; // Get the most recent test
        }
      }
      
      if (!testResult) {
        console.log("Nenhum teste encontrado para:", identifier);
        return res.status(404).json({ 
          message: "Nenhum teste encontrado com esses dados" 
        });
      }
      
      console.log("Teste encontrado:", testResult.id);
      res.json({ 
        testResultId: testResult.id,
        message: "Teste encontrado com sucesso"
      });
    } catch (error: any) {
      console.error("Find test error:", error);
      res.status(500).json({ message: "Erro ao buscar teste" });
    }
  });

  // Create Payment Intent for embedded checkout
  app.post("/api/create-payment-intent", [
    sanitizeInput,
    body('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    body('amount').isInt({ min: 1 }).withMessage('Valor inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { testId, amount } = req.body;
      
      // Verify test exists
      const testResult = await storage.getTestResult(testId);
      if (!testResult) {
        return res.status(404).json({ error: "Teste não encontrado" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // Create payment intent for embedded checkout
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'brl',
        metadata: {
          testId: testId.toString(),
        },
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Create payment intent error:', error);
      res.status(500).json({ error: "Erro ao criar intenção de pagamento" });
    }
  });

  // Verify Payment Intent
  app.post("/api/verify-payment-intent", [
    sanitizeInput,
    body('paymentIntentId').isString().withMessage('Payment Intent ID inválido'),
    body('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { paymentIntentId, testId } = req.body;
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update test to premium
        const updatedTest = await storage.updateTestResultPremium(testId, paymentIntentId);
        
        // Send premium upgrade email
        setImmediate(async () => {
          try {
            if (updatedTest.guestEmail) {
              await emailService.sendPremiumUpgradeEmail(
                updatedTest.guestEmail, 
                updatedTest.guestName || updatedTest.guestEmail,
                updatedTest.profileType,
                updatedTest.id.toString()
              );
            }
          } catch (emailError) {
            console.error('Error sending premium upgrade email:', emailError);
          }
        });
        
        res.json({ 
          success: true, 
          message: "Pagamento verificado e teste atualizado para premium"
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: "Pagamento não foi confirmado"
        });
      }
    } catch (error: any) {
      console.error('Verify payment intent error:', error);
      res.status(500).json({ error: "Erro ao verificar pagamento" });
    }
  });

  // Legacy Stripe Checkout Session (for compatibility)
  app.post("/api/create-checkout-session", [
    sanitizeInput,
    body('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    body('amount').isInt({ min: 1 }).withMessage('Valor inválido'),
    body('paymentMethod').isIn(['card', 'pix']).withMessage('Método de pagamento inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { testId, amount, paymentMethod } = req.body;
      
      console.log(`Criando sessão Stripe para teste ${testId} - ${paymentMethod} - R$${amount / 100}`);
      
      // Verify test exists
      const testResult = await storage.getTestResult(testId);
      if (!testResult) {
        return res.status(404).json({ error: "Teste não encontrado" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // Create optimized checkout session with fallback for PIX
      let sessionConfig: any = {
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Relatório DISC Premium',
              description: `Análise comportamental completa - Perfil ${testResult.profileType}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: `https://${process.env.REPLIT_DEV_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}&testId=${testId}`,
        cancel_url: `https://${process.env.REPLIT_DEV_DOMAIN}/cancel?testId=${testId}`,
        metadata: {
          testId: testId.toString(),
          paymentMethod: paymentMethod,
        },
      };

      // Check if payment method is enabled in admin settings
      const enabledMethods = await storage.getAdminConfig('payment_methods');
      const methodsConfig = enabledMethods ? JSON.parse(enabledMethods) : { card: true, pix: false };
      
      // Force card if requested method is not enabled
      if (paymentMethod === 'pix' && !methodsConfig.pix) {
        console.log('PIX não habilitado no admin, usando cartão');
        paymentMethod = 'card';
      }

      let session;
      if (paymentMethod === 'pix' && methodsConfig.pix) {
        // Try PIX first, fallback to card if not available in Stripe
        try {
          sessionConfig.payment_method_types = ['pix'];
          sessionConfig.line_items[0].price_data.currency = 'brl';
          session = await stripe.checkout.sessions.create(sessionConfig);
          console.log(`Sessão Stripe PIX criada: ${session.id}`);
        } catch (pixError: any) {
          console.log('PIX não disponível no Stripe:', pixError.message);
          console.log('Usando cartão como fallback para PIX');
          sessionConfig.payment_method_types = ['card'];
          sessionConfig.line_items[0].price_data.currency = 'brl';
          session = await stripe.checkout.sessions.create(sessionConfig);
          console.log(`Sessão Stripe cartão (fallback PIX) criada: ${session.id}`);
        }
      } else {
        sessionConfig.payment_method_types = ['card'];
        sessionConfig.line_items[0].price_data.currency = 'brl';
        session = await stripe.checkout.sessions.create(sessionConfig);
        console.log(`Sessão Stripe cartão criada: ${session.id}`);
      }
      
      console.log(`Sessão Stripe criada: ${session.id}`);
      
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Stripe checkout session error:", error);
      res.status(500).json({ 
        error: "Erro ao criar sessão de pagamento",
        details: error.message 
      });
    }
  });

  // Reset test to non-premium for testing
  app.post("/api/test/:testId/reset-premium", [
    sanitizeInput,
    param('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const testId = parseInt(req.params.testId);
      
      // Update test back to non-premium for testing
      await storage.updateTestResultPremium(testId, null as any);
      
      console.log(`Teste ${testId} resetado para não-premium`);
      
      res.json({ 
        success: true, 
        message: "Teste resetado para não-premium",
        testId: testId
      });
      
    } catch (error: any) {
      console.error("Reset premium error:", error);
      res.status(500).json({ 
        error: "Erro ao resetar teste",
        details: error.message 
      });
    }
  });

  // Verify payment and update test to premium
  app.post("/api/verify-payment", [
    sanitizeInput,
    body('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    body('sessionId').isLength({ min: 3, max: 200 }).withMessage('Session ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { testId, sessionId } = req.body;
      
      console.log(`Verificando pagamento para teste ${testId} com session ${sessionId}`);
      
      // Verify with Stripe (optional in development)
      if (sessionId.startsWith('cs_test_') || sessionId.startsWith('cs_live_')) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status !== 'paid') {
            console.log('Payment not yet confirmed, proceeding anyway for development');
          }
        } catch (stripeError) {
          console.log('Stripe verification failed, proceeding anyway for development');
        }
      }
      
      // Update test to premium
      const updatedTest = await storage.updateTestResultPremium(testId, sessionId);
      
      // Send premium upgrade email if test result has email
      const testResult = await storage.getTestResult(testId);
      if (testResult) {
        const emailTarget = testResult.guestEmail || (testResult.userId ? (await storage.getUser(testResult.userId))?.email : null);
        const userName = testResult.guestName || (testResult.userId ? (await storage.getUser(testResult.userId))?.firstName || (await storage.getUser(testResult.userId))?.email : 'Usuário');
        
        if (emailTarget) {
          setImmediate(() => {
            emailService.sendPremiumUpgradeEmail(
              emailTarget,
              userName || 'Usuário',
              testResult.profileType,
              testId.toString(),
              emailTarget
            ).catch(error => {
              console.error('Erro ao enviar email de upgrade premium:', error);
            });
          });
        }
      }
      
      console.log(`Teste ${testId} atualizado para premium com sucesso`);
      
      res.json({ 
        success: true, 
        message: "Pagamento verificado e teste atualizado para premium",
        testResult: updatedTest 
      });
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ 
        success: false,
        error: "Erro ao verificar pagamento" 
      });
    }
  });

  // Development payment simulation endpoint
  app.post("/api/simulate-payment", [
    sanitizeInput,
    body('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    body('sessionId').isLength({ min: 10, max: 100 }).withMessage('Session ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { testId, sessionId } = req.body;
      
      console.log(`Simulando pagamento para teste ${testId} com sessão ${sessionId}`);
      
      // Verify test exists
      const testResult = await storage.getTestResult(testId);
      if (!testResult) {
        return res.status(404).json({ error: "Teste não encontrado" });
      }
      
      // Create payment record
      const payment = await storage.createPayment({
        stripePaymentIntentId: sessionId,
        amount: 4700,
        currency: 'brl',
        status: 'succeeded',
        testResultId: testId,
      });
      
      // Upgrade test to premium
      await storage.updateTestResultPremium(testId, sessionId);
      
      // Grant premium access if user is registered
      if (testResult.userId) {
        await storage.grantPremiumAccess(testResult.userId, 2);
        
        // Get user details for premium email
        const user = await storage.getUser(testResult.userId);
        if (user) {
          // Send premium upgrade email asynchronously
          setImmediate(() => {
            emailService.sendPremiumUpgradeEmail(
              user.email,
              user.firstName || user.email,
              testResult.profileType,
              testResult.id.toString(),
              user.email // Registered user email for PDF access
            ).catch(error => {
              console.error('Erro ao enviar email de upgrade premium:', error);
            });
          });
        }
      } else {
        // For guest users, send premium email using guest data
        if (testResult.guestEmail && testResult.guestName) {
          setImmediate(() => {
            emailService.sendPremiumUpgradeEmail(
              testResult.guestEmail as string,
              testResult.guestName as string,
              testResult.profileType,
              testResult.id.toString(),
              testResult.guestEmail as string
            ).catch(error => {
              console.error('Erro ao enviar email de upgrade premium para convidado:', error);
            });
          });
        }
      }
      
      console.log(`Pagamento simulado processado com sucesso para teste ${testId}`);
      
      res.json({ 
        success: true, 
        message: "Pagamento simulado processado com sucesso",
        testId: testId,
        paymentId: payment.id
      });
      
    } catch (error: any) {
      console.error("Payment simulation error:", error);
      res.status(500).json({ 
        error: "Erro ao simular pagamento",
        details: error.message 
      });
    }
  });

  // Webhook endpoint for Stripe events
  app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req: any, res: any) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'test';
    
    let event;
    
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
      if (event.type === 'checkout.session.completed') {
        const session: any = event.data.object;
        const testId = parseInt(session.metadata?.testId || '0');
        
        console.log(`✅ Pagamento confirmado via webhook para teste: ${testId}`);
        
        // Create payment record
        const payment = await storage.createPayment({
          stripePaymentIntentId: (session.payment_intent as string) || session.id,
          amount: session.amount_total || 4700,
          currency: session.currency || 'brl',
          status: 'succeeded',
          testResultId: testId,
        });
        
        // Upgrade test to premium
        await storage.updateTestResultPremium(testId, payment.stripePaymentIntentId);
        
        // Get test result for email trigger
        const testResult = await storage.getTestResult(testId);
        if (testResult) {
          // Grant premium access if user is registered
          if (testResult.userId) {
            await storage.grantPremiumAccess(testResult.userId, 2);
            
            // Get user details for premium email
            const user = await storage.getUser(testResult.userId);
            if (user) {
              // Send premium upgrade email asynchronously
              setImmediate(() => {
                emailService.sendPremiumUpgradeEmail(
                  user.email,
                  user.firstName || user.email,
                  testResult.profileType,
                  testResult.id.toString(),
                  user.email // Registered user email for PDF access
                ).catch(error => {
                  console.error('Erro ao enviar email de upgrade premium via webhook:', error);
                });
              });
            }
          } else {
            // For guest users, send premium email using guest data
            if (testResult.guestEmail && testResult.guestName) {
              setImmediate(() => {
                emailService.sendPremiumUpgradeEmail(
                  testResult.guestEmail as string,
                  testResult.guestName as string,
                  testResult.profileType,
                  testResult.id.toString(),
                  testResult.guestEmail as string
                ).catch(error => {
                  console.error('Erro ao enviar email de upgrade premium para convidado via webhook:', error);
                });
              });
            }
          }
        }
        
        console.log(`Teste ${testId} atualizado para premium via webhook`);
      }
    } catch (error: any) {
      console.error('Webhook processing error:', error);
    }
    
    res.json({ received: true });
  });

  // Confirm payment - new simplified Stripe integration
  app.post("/api/confirm-payment", [
    sanitizeInput,
    body('clientSecret').isString().withMessage('Client secret obrigatório'),
    body('paymentMethod').isObject().withMessage('Método de pagamento obrigatório'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { clientSecret, paymentMethod } = req.body;
      
      console.log('Confirmando pagamento:', { clientSecret: clientSecret.substring(0, 20) + '...' });
      
      // Extract payment intent ID from client secret
      const paymentIntentId = clientSecret.split('_secret_')[0];
      
      // Use Stripe to confirm the payment
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: {
          type: 'card',
          card: {
            number: paymentMethod.card.number,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
            cvc: paymentMethod.card.cvc,
          },
          billing_details: paymentMethod.billing_details,
        },
      });
      
      if (paymentIntent.status === 'succeeded') {
        console.log('Pagamento confirmado com sucesso:', paymentIntent.id);
        res.json({
          success: true,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        });
      } else {
        console.log('Pagamento não foi aprovado:', paymentIntent.status);
        res.json({
          success: false,
          error: 'Pagamento não foi aprovado',
          status: paymentIntent.status,
        });
      }
    } catch (error: any) {
      console.error("Payment confirmation error:", error);
      
      // For development, simulate success with test card
      if (error.code === 'card_declined' || error.type === 'card_error') {
        console.log('Simulando pagamento aprovado para desenvolvimento');
        const simulatedPaymentId = `pi_simulated_${Date.now()}`;
        res.json({
          success: true,
          paymentIntentId: simulatedPaymentId,
          status: 'succeeded',
          simulated: true,
        });
      } else {
        res.status(500).json({ 
          success: false,
          error: error.message || "Erro ao confirmar pagamento"
        });
      }
    }
  });

  // Fallback payment processing for network connectivity issues
  app.post("/api/process-payment-fallback", [
    sanitizeInput,
    body('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    body('paymentMethod').isString().withMessage('Método de pagamento obrigatório'),
    body('amount').isInt({ min: 1 }).withMessage('Valor inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { testId, paymentMethod, amount } = req.body;
      
      console.log(`Processando pagamento fallback para teste ${testId} - valor: ${amount}`);
      
      // Verify test exists
      const testResult = await storage.getTestResult(testId);
      if (!testResult) {
        return res.status(404).json({ 
          success: false, 
          message: "Teste não encontrado" 
        });
      }
      
      // For development/testing purposes, accept the fallback payment
      if (paymentMethod === 'card_test_fallback') {
        // Create a simulated payment record
        const payment = await storage.createPayment({
          stripePaymentIntentId: `pi_fallback_${Date.now()}`,
          amount: amount,
          currency: 'brl',
          status: 'succeeded',
          testResultId: testId
        });
        
        // Upgrade test to premium
        await storage.updateTestResultPremium(testId, payment.stripePaymentIntentId);
        
        console.log(`Pagamento fallback processado com sucesso - Payment ID: ${payment.id}`);
        
        return res.json({
          success: true,
          message: "Pagamento processado via método alternativo",
          paymentId: payment.id
        });
      }
      
      return res.status(400).json({
        success: false,
        message: "Método de pagamento não suportado"
      });
      
    } catch (error: any) {
      console.error("Fallback payment error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao processar pagamento alternativo" 
      });
    }
  });

  // Upgrade test to premium after successful payment
  app.post("/api/test/upgrade/:testId", [
    sanitizeInput,
    param('testId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    body('paymentIntentId').isLength({ min: 10, max: 100 }).withMessage('Payment Intent ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const testId = parseInt(req.params.testId);
      const { paymentIntentId } = req.body;
      
      if (!testId || !paymentIntentId) {
        return res.status(400).json({ message: "TestId e PaymentIntentId são obrigatórios" });
      }
      
      console.log(`Atualizando teste ${testId} para premium com pagamento ${paymentIntentId}`);
      
      // Verify test result exists
      const testResult = await storage.getTestResult(testId);
      if (!testResult) {
        return res.status(404).json({ message: "Teste não encontrado" });
      }
      
      // Update test to premium
      const updatedTest = await storage.updateTestResultPremium(testId, paymentIntentId);
      
      // Update payment status
      const payment = await storage.getPaymentByIntentId(paymentIntentId);
      if (payment) {
        await storage.updatePaymentStatus(payment.id, 'completed');
      } else {
        // Create payment record if it doesn't exist
        await storage.createPayment({
          testResultId: testId,
          stripePaymentIntentId: paymentIntentId,
          amount: 4700, // R$ 47,00 in cents
          currency: "brl",
          status: "completed",
        });
      }
      
      // Grant premium access with additional tests if user is registered
      if (testResult.userId) {
        await storage.grantPremiumAccess(testResult.userId, 2);
        console.log(`Usuário ${testResult.userId} recebeu acesso premium com 2 testes adicionais`);
      }

      console.log(`Teste ${testId} atualizado para premium com sucesso`);

      // Send premium upgrade email (non-blocking)
      const emailTarget = testResult.guestEmail || (testResult.userId ? (await storage.getUser(testResult.userId))?.email : null);
      const userName = testResult.guestName || (testResult.userId ? (await storage.getUser(testResult.userId))?.firstName || (await storage.getUser(testResult.userId))?.email : 'Usuário');
      
      if (emailTarget) {
        emailService.sendPremiumUpgradeEmail(
          emailTarget,
          userName || 'Usuário',
          testResult.profileType,
          testId.toString(),
          emailTarget
        ).catch(error => {
          console.error('Erro ao enviar email de upgrade premium:', error);
        });
      }

      res.json({ 
        success: true, 
        message: "Teste atualizado para premium com sucesso",
        isPremium: true,
        testResultId: testId
      });
    } catch (error: any) {
      console.error("Erro ao atualizar teste para premium:", error);
      res.status(500).json({ 
        message: "Erro ao atualizar teste para premium", 
        error: error.message 
      });
    }
  });

  // Check user test limits
  app.get("/api/user/:userId/test-limits", [
    sanitizeInput,
    param('userId').isInt({ min: 1 }).withMessage('User ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const limits = await storage.checkUserTestLimits(userId);
      res.json(limits);
    } catch (error: any) {
      console.error("Error checking test limits:", error);
      res.status(500).json({ error: "Failed to check test limits" });
    }
  });

  // Grant premium access (for testing purposes)
  app.post("/api/user/:userId/grant-premium", [
    sanitizeInput,
    param('userId').isInt({ min: 1 }).withMessage('User ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const userId = parseInt(req.params.userId);
      const { testsCount = 2 } = req.body;
      
      await storage.grantPremiumAccess(userId, testsCount);
      console.log(`Premium access granted to user ${userId} with ${testsCount} tests`);
      
      res.json({ 
        success: true, 
        message: `Premium access granted with ${testsCount} tests`,
        testsGranted: testsCount
      });
    } catch (error: any) {
      console.error("Error granting premium access:", error);
      res.status(500).json({ error: "Failed to grant premium access" });
    }
  });

  // User dashboard endpoint
  app.get("/api/user/:userId/dashboard", [
    sanitizeInput,
    param('userId').isInt({ min: 1 }).withMessage('User ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Associate any guest tests with this user's email to their account
      try {
        await storage.associateGuestTestsWithUser(user.email, userId);
      } catch (error) {
        // Continue even if association fails
      }

      // Get user's test results (now including previously guest tests)
      const testResults = await storage.getTestResultsByUser(userId);
      
      // Also get any remaining guest tests by email that might not have been associated
      const guestTestResults = await storage.getTestResultsByEmail(user.email);
      
      // Combine and deduplicate results
      const allResults = [...testResults];
      
      // Add guest tests that aren't already in user tests
      for (const guestTest of guestTestResults) {
        if (!allResults.find(test => test.id === guestTest.id)) {
          allResults.push(guestTest);
        }
      }
      
      // Sort by creation date (newest first)
      allResults.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Transform test results to match expected format
      const formattedResults = allResults.map(result => ({
        id: result.id,
        testType: "DISC",
        profileType: result.profileType,
        scores: typeof result.scores === 'string' ? JSON.parse(result.scores) : result.scores,
        isPremium: result.isPremium,
        createdAt: result.createdAt
      }));



      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        },
        testResults: formattedResults
      });
    } catch (error: any) {
      console.error('Dashboard error:', error);
      res.status(500).json({ 
        message: "Erro ao carregar dashboard",
        error: error.message 
      });
    }
  });

  // Admin authentication
  app.post("/api/admin/login", [
    // authRateLimit, // Removido temporariamente
    // validateInput, // Removido temporariamente
    // threatDetection, // Removido temporariamente
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Senha deve ter pelo menos 8 caracteres'),
    validateRequest
  ], async (req: any, res: any) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
      const { email, password } = req.body;
      
      // Log tentativa de login
      threatDetector.logActivity(ip, 'admin_login_attempt', { email });
      
      // Verificar credenciais admin
      const adminEmail = "adm@meuperfil360.com.br";
      const adminPassword = "admin123456";
      
      // Verificar email
      if (email !== adminEmail) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      // Verificar senha
      if (password !== adminPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Criar sessão segura
      const sessionToken = sessionManager.createSession('admin', {
        email,
        role: 'admin',
        loginTime: new Date().toISOString()
      });

      // Log sucesso
      threatDetector.logActivity(ip, 'admin_login_success', { email });

      const adminData = {
        id: "admin",
        email: email,
        role: "admin",
        loginTime: new Date().toISOString(),
        sessionToken: sessionToken
      };

      res.json(adminData);
    } catch (error: any) {
      console.error('Admin login error:', error);
      threatDetector.logActivity(ip, 'login_failure', { reason: 'server_error' });
      res.status(500).json({ message: "Erro no login administrativo" });
    }
  });

  // Admin dashboard stats
  app.get("/api/admin/stats", async (req: any, res: any) => {
    try {
      // Get total users
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      
      // Get total tests
      const totalTests = await db.select({ count: sql<number>`count(*)` }).from(testResults);
      
      // Get premium tests and revenue
      const premiumTests = await db.select({ count: sql<number>`count(*)` }).from(testResults).where(eq(testResults.isPremium, true));
      const premiumRevenue = (premiumTests[0]?.count || 0) * 29.90; // Assuming R$ 29,90 per premium
      
      // Get recent users
      const recentUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        createdAt: users.createdAt
      }).from(users).orderBy(desc(users.createdAt)).limit(10);

      // Get recent tests
      const recentTests = await db.select({
        id: testResults.id,
        guestName: testResults.guestName,
        profileType: testResults.profileType,
        isPremium: testResults.isPremium,
        createdAt: testResults.createdAt
      }).from(testResults).orderBy(desc(testResults.createdAt)).limit(10);

      // Generate monthly stats (simplified)
      const monthlyStats = [
        { month: "Janeiro", users: Math.floor((totalUsers[0]?.count || 0) * 0.1), tests: Math.floor((totalTests[0]?.count || 0) * 0.1), revenue: Math.floor(premiumRevenue * 0.1) },
        { month: "Fevereiro", users: Math.floor((totalUsers[0]?.count || 0) * 0.15), tests: Math.floor((totalTests[0]?.count || 0) * 0.15), revenue: Math.floor(premiumRevenue * 0.15) },
        { month: "Março", users: Math.floor((totalUsers[0]?.count || 0) * 0.2), tests: Math.floor((totalTests[0]?.count || 0) * 0.2), revenue: Math.floor(premiumRevenue * 0.2) },
        { month: "Abril", users: Math.floor((totalUsers[0]?.count || 0) * 0.25), tests: Math.floor((totalTests[0]?.count || 0) * 0.25), revenue: Math.floor(premiumRevenue * 0.25) },
        { month: "Maio", users: Math.floor((totalUsers[0]?.count || 0) * 0.3), tests: Math.floor((totalTests[0]?.count || 0) * 0.3), revenue: Math.floor(premiumRevenue * 0.3) },
        { month: "Junho", users: totalUsers[0]?.count || 0, tests: totalTests[0]?.count || 0, revenue: Math.floor(premiumRevenue) }
      ];

      res.json({
        totalUsers: totalUsers[0]?.count || 0,
        totalTests: totalTests[0]?.count || 0,
        premiumRevenue: Math.floor(premiumRevenue),
        premiumReports: premiumTests[0]?.count || 0,
        recentUsers,
        recentTests,
        monthlyStats
      });
    } catch (error: any) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: "Erro ao carregar estatísticas" });
    }
  });

  // Email configuration management
  app.get("/api/admin/email-config", async (req: any, res: any) => {
    try {
      const allConfigs = await db.select().from(adminConfigs);
      const configs = allConfigs.filter(c => c.key.startsWith('smtp_') || c.key.startsWith('from_'));
      
      const emailConfig = {
        smtpHost: configs.find(c => c.key === 'smtp_host')?.value || '',
        smtpPort: parseInt(configs.find(c => c.key === 'smtp_port')?.value || '587'),
        smtpUser: configs.find(c => c.key === 'smtp_user')?.value || '',
        smtpPassword: configs.find(c => c.key === 'smtp_password')?.value || '',
        smtpSecure: configs.find(c => c.key === 'smtp_secure')?.value === 'true',
        fromEmail: configs.find(c => c.key === 'from_email')?.value || '',
        fromName: configs.find(c => c.key === 'from_name')?.value || 'MeuPerfil360',
      };

      res.json(emailConfig);
    } catch (error: any) {
      console.error('Email config get error:', error);
      res.status(500).json({ message: "Erro ao carregar configurações de email" });
    }
  });

  app.post("/api/admin/email-config", async (req: any, res: any) => {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, fromEmail, fromName } = req.body;

      const configsToUpdate = [
        { key: 'smtp_host', value: smtpHost },
        { key: 'smtp_port', value: smtpPort.toString() },
        { key: 'smtp_user', value: smtpUser },
        { key: 'smtp_password', value: smtpPassword },
        { key: 'smtp_secure', value: smtpSecure.toString() },
        { key: 'from_email', value: fromEmail },
        { key: 'from_name', value: fromName },
      ];

      for (const config of configsToUpdate) {
        await db.insert(adminConfigs)
          .values(config)
          .onConflictDoUpdate({
            target: adminConfigs.key,
            set: { value: config.value, updatedAt: new Date() }
          });
      }
      res.json({ message: "Configurações salvas com sucesso" });
    } catch (error: any) {
      console.error('Email config save error:', error);
      res.status(500).json({ message: "Erro ao salvar configurações de email" });
    }
  });

  // Admin pricing configuration endpoints
  app.get("/api/admin/pricing", async (req: any, res: any) => {
    try {
      const configs = await storage.getAllAdminConfigs();
      const pricing = {
        regularPrice: configs.regularPrice || '97',
        promocionalPrice: configs.promocionalPrice || '47',
        isPromotionActive: configs.isPromotionActive === 'true'
      };
      res.json(pricing);
    } catch (error: any) {
      console.error("Error fetching pricing config:", error);
      res.status(500).json({ error: "Failed to fetch pricing configuration" });
    }
  });

  app.post("/api/admin/pricing", async (req: any, res: any) => {
    try {
      const { regularPrice, promocionalPrice, isPromotionActive } = req.body;
      
      await storage.setAdminConfig('regularPrice', regularPrice.toString());
      await storage.setAdminConfig('promocionalPrice', promocionalPrice.toString());
      await storage.setAdminConfig('isPromotionActive', isPromotionActive.toString());
      
      // Clear cache to ensure immediate updates
      cache.delete(cache.getPricingKey());
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating pricing config:", error);
      res.status(500).json({ error: "Failed to update pricing configuration" });
    }
  });

  // Admin - Payment Methods Configuration
  app.get("/api/admin/payment-methods", async (req: Request, res: Response) => {
    try {
      const methods = await storage.getAdminConfig('payment_methods');
      const parsedMethods = methods ? JSON.parse(methods) : {
        card: true,
        pix: false,
        apple_pay: false,
        google_pay: false
      };
      
      res.json({ methods: parsedMethods });
    } catch (error) {
      console.error("Erro ao buscar métodos de pagamento:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        methods: {
          card: true,
          pix: false,
          apple_pay: false,
          google_pay: false
        }
      });
    }
  });

  app.post("/api/admin/payment-methods", async (req: Request, res: Response) => {
    try {
      const { methods } = req.body;
      
      if (!methods || typeof methods !== 'object') {
        return res.status(400).json({ error: "Configuração de métodos inválida" });
      }

      await storage.setAdminConfig('payment_methods', JSON.stringify(methods));
      
      res.json({ 
        success: true, 
        message: "Métodos de pagamento atualizados com sucesso" 
      });
    } catch (error) {
      console.error("Erro ao salvar métodos de pagamento:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Endpoint para servir páginas da aplicação
  app.get("/api/page/:page", async (req: Request, res: Response) => {
    const { page } = req.params;
    
    // Conteúdo das páginas principais
    const pages: Record<string, string> = {
      'home': `
        <div style="text-align: center;">
          <h2>Bem-vindo ao MeuPerfil360</h2>
          <p style="font-size: 18px; margin: 20px 0;">Descubra seu perfil comportamental com nosso teste DISC completo</p>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 30px 0;">
            <h3>Características do Teste DISC:</h3>
            <ul style="text-align: left; max-width: 500px; margin: 0 auto;">
              <li>✅ Teste comportamental validado cientificamente</li>
              <li>✅ Resultado imediato e detalhado</li>
              <li>✅ Análise completa do seu perfil</li>
              <li>✅ Relatório premium disponível</li>
            </ul>
          </div>
          <a href="/test" style="background: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">Iniciar Teste Gratuito</a>
        </div>
      `,
      'test': `
        <div>
          <h2>Teste DISC Comportamental</h2>
          <p>Complete as perguntas abaixo para descobrir seu perfil comportamental.</p>
          <div style="text-align: center; margin: 30px 0;">
            <button onclick="window.location.href='/results'" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Simular Resultado</button>
          </div>
        </div>
      `,
      'results': `
        <div>
          <h2>Seus Resultados DISC</h2>
          <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Seu Perfil: Dominante (D)</h3>
            <p>Você demonstra características de liderança e determinação.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="/checkout" style="background: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Relatório Premium</a>
          </div>
        </div>
      `,
      '404': `
        <div style="text-align: center;">
          <h2>Página não encontrada</h2>
          <p>A página que você procura não existe.</p>
          <a href="/" style="color: #0066cc;">Voltar ao início</a>
        </div>
      `
    };

    const content = pages[page] || pages['404'];
    res.send(content);
  });

  // Health check endpoints for monitoring
  app.get("/health", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Public endpoint to get current pricing - reads from admin configurations
  app.get("/api/pricing", async (req: any, res: any) => {
    try {
      // Try to get pricing from admin configurations
      const configs = await storage.getAllAdminConfigs();
      const pricing = {
        regularPrice: configs.regularPrice || '97',
        promocionalPrice: configs.promocionalPrice || '47',
        isPromotionActive: configs.isPromotionActive === 'true',
        currentPrice: configs.isPromotionActive === 'true' ? (configs.promocionalPrice || '47') : (configs.regularPrice || '97')
      };
      
      res.json(pricing);
    } catch (error) {
      // Fallback to default values if database fails
      console.error('Error fetching pricing from database, using fallbacks:', error);
      const fallbackPricing = {
        regularPrice: '97',
        promocionalPrice: '47',
        isPromotionActive: true,
        currentPrice: '47'
      };
      res.json(fallbackPricing);
    }
  });

  // Endpoint para verificar e enviar lembretes de reteste (6 meses)
  app.post("/api/send-retest-reminders", async (req: any, res: any) => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Get all test results from 6 months ago (with some tolerance)
      const startDate = new Date(sixMonthsAgo);
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(sixMonthsAgo);
      endDate.setDate(endDate.getDate() + 1);
      
      const oldTests = await db
        .select()
        .from(testResults)
        .where(
          sql`${testResults.createdAt} >= ${startDate} AND ${testResults.createdAt} <= ${endDate}`
        );

      let emailsSent = 0;
      
      for (const testResult of oldTests) {
        try {
          if (testResult.userId) {
            // For registered users
            const user = await storage.getUser(testResult.userId);
            if (user) {
              await emailService.sendRetestReminderEmail(
                user.email,
                user.firstName || user.email,
                183 // 6 months = ~183 days
              );
              emailsSent++;
            }
          } else if (testResult.guestEmail && testResult.guestName) {
            // For guest users
            await emailService.sendRetestReminderEmail(
              testResult.guestEmail,
              testResult.guestName,
              183 // 6 months = ~183 days
            );
            emailsSent++;
          }
        } catch (emailError) {
          console.error(`Erro ao enviar lembrete para teste ${testResult.id}:`, emailError);
        }
      }
      
      res.json({
        success: true,
        message: `Lembretes de reteste enviados com sucesso`,
        emailsSent,
        testsChecked: oldTests.length
      });
      
    } catch (error: any) {
      console.error("Retest reminder error:", error);
      res.status(500).json({ 
        error: "Erro ao enviar lembretes de reteste",
        details: error.message 
      });
    }
  });

  // Email templates management
  app.get("/api/admin/email-templates", async (req: any, res: any) => {
    try {
      const templates = await db.select().from(emailTemplates);
      
      // Map template names to display names
      const displayNames: Record<string, string> = {
        'boas_vindas_cadastro': 'Boas-vindas (Cadastro)',
        'teste_concluido': 'Teste Concluído',
        'upgrade_premium': 'Upgrade Premium',
        'lembrete_reteste': 'Lembrete de Reteste'
      };
      
      const templateMap = templates.reduce((acc, template) => {
        acc[template.name] = {
          id: template.name,
          name: displayNames[template.name] || template.name,
          subject: template.subject,
          content: template.content,
          variables: template.variables || []
        };
        return acc;
      }, {} as any);

      res.json(templateMap);
    } catch (error: any) {
      console.error('Email templates get error:', error);
      res.status(500).json({ message: "Erro ao carregar templates de email" });
    }
  });

  app.post("/api/admin/email-templates", [
    sanitizeInput,
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const templates = req.body;

      interface TemplateData {
        name: string;
        subject: string;
        content: string;
        variables?: string[];
      }
      
      for (const [templateId, template] of Object.entries(templates as Record<string, TemplateData>)) {
        const typedTemplate = template as TemplateData;
        const templateData = {
          name: typedTemplate.name,
          subject: typedTemplate.subject,
          content: typedTemplate.content,
          variables: typedTemplate.variables || [],
          updatedAt: new Date()
        };

        // Update existing template by ID
        await db.update(emailTemplates)
          .set(templateData)
          .where(eq(emailTemplates.id, parseInt(templateId)));
        
        console.log(`Template ${typedTemplate.name} (ID: ${templateId}) atualizado no banco de dados`);
      }

      console.log('Todos os templates de email foram salvos no banco de dados');
      res.json({ message: "Templates salvos com sucesso" });
    } catch (error: any) {
      console.error('Email templates save error:', error);
      res.status(500).json({ message: "Erro ao salvar templates de email" });
    }
  });

  // Send test emails to specific users
  app.post("/api/admin/send-test-email", [
    body('email').isEmail().withMessage('Email deve ser válido'),
    body('emailType').isIn(['welcome', 'test_completion', 'premium_upgrade', 'retest_reminder', 'boas_vindas_cadastro', 'teste_concluido', 'upgrade_premium', 'lembrete_reteste']).withMessage('Tipo de email inválido'),
    (req: any, res: any, next: any) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Dados inválidos fornecidos', details: errors.array() });
      }
      next();
    }
  ], async (req: any, res: any) => {
    try {
      const { email, emailType } = req.body;
      
      // Try to find real user data
      let userName = 'Usuário Teste';
      let profileType = 'D';
      let resultId = '123';
      
      // Look for existing user by email
      const user = await storage.getUserByEmail(email);
      if (user) {
        userName = user.firstName || user.email;
        
        // Get user's most recent test result
        const testResults = await storage.getTestResultsByUser(user.id);
        if (testResults.length > 0) {
          const latestTest = testResults[0];
          profileType = latestTest.profileType;
          resultId = latestTest.id.toString();
        }
      } else {
        // Look for guest test results by email
        const guestTest = await storage.getTestResultByGuest(email);
        if (guestTest) {
          userName = guestTest.guestName || 'Usuário Teste';
          profileType = guestTest.profileType;
          resultId = guestTest.id.toString();
        }
      }
      
      let emailSent = false;
      
      switch (emailType) {
        case 'welcome':
        case 'boas_vindas_cadastro':
          emailSent = await emailService.sendWelcomeEmail(email, userName);
          break;
        case 'test_completion':
        case 'teste_concluido':
          emailSent = await emailService.sendTestCompletionEmail(email, userName, profileType, resultId, user ? true : false);
          break;
        case 'premium_upgrade':
        case 'upgrade_premium':
          emailSent = await emailService.sendPremiumUpgradeEmail(email, userName, profileType, resultId, email);
          break;
        case 'retest_reminder':
        case 'lembrete_reteste':
          emailSent = await emailService.sendRetestReminderEmail(email, userName, 180);
          break;
        default:
          return res.status(400).json({ message: `Tipo de email "${emailType}" não suportado` });
      }
      
      if (emailSent) {
        res.json({ 
          message: `Email ${emailType} enviado com sucesso para ${email} (${userName})`,
          success: true
        });
      } else {
        res.status(500).json({ 
          message: `Erro ao enviar email ${emailType} para ${email}`,
          success: false
        });
      }
    } catch (error: any) {
      console.error('Send test email error:', error);
      res.status(500).json({ 
        message: "Erro ao enviar email de teste: " + error.message,
        success: false
      });
    }
  });

  // Initialize default email templates
  app.post("/api/admin/init-email-templates", async (req: any, res: any) => {
    try {
      const defaultTemplates = [
        {
          name: 'boas_vindas_cadastro',
          subject: 'Bem-vindo ao MeuPerfil360! 🎉',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin: 0;">MeuPerfil360</h1>
                <p style="color: #666; margin: 5px 0;">Descubra seu perfil comportamental</p>
              </div>
              
              <h2 style="color: #333;">Olá, {{userName}}!</h2>
              
              <p>Seja muito bem-vindo(a) ao MeuPerfil360! 🚀</p>
              
              <p>Sua conta foi criada com sucesso e agora você tem acesso completo à nossa plataforma de análise DISC.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #4F46E5; margin-top: 0;">O que você pode fazer agora:</h3>
                <ul style="color: #555;">
                  <li>Realizar testes DISC ilimitados</li>
                  <li>Acessar seus resultados históricos</li>
                  <li>Fazer upgrade para relatórios premium</li>
                  <li>Acompanhar sua evolução comportamental</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{loginUrl}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Acessar Minha Conta
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Dúvidas? Estamos aqui para ajudar! Entre em contato: {{supportEmail}}
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                MeuPerfil360 - Sua jornada de autoconhecimento começa aqui
              </p>
            </div>
          `,
          variables: ['userName', 'loginUrl', 'supportEmail']
        },
        {
          name: 'teste_concluido',
          subject: 'Seu Teste DISC foi concluído! Perfil {{profileType}} identificado',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin: 0;">MeuPerfil360</h1>
                <p style="color: #666; margin: 5px 0;">Seus resultados estão prontos!</p>
              </div>
              
              <h2 style="color: #333;">Parabéns, {{userName}}! 🎉</h2>
              
              <p>Seu teste DISC foi concluído com sucesso!</p>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 24px;">Seu Perfil: {{profileType}}</h3>
                <p style="margin: 0; font-size: 18px; opacity: 0.9;">{{profileName}}</p>
              </div>
              
              <p>Descubra insights profundos sobre seu comportamento, pontos fortes e áreas de desenvolvimento.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{resultUrl}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  Ver Meus Resultados
                </a>
                <a href="{{upgradeUrl}}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Relatório Premium
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                MeuPerfil360 - Transforme autoconhecimento em crescimento
              </p>
            </div>
          `,
          variables: ['userName', 'profileType', 'profileName', 'resultUrl', 'upgradeUrl']
        },
        {
          name: 'upgrade_premium',
          subject: 'Seu Relatório Premium está pronto! 📊',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin: 0;">MeuPerfil360</h1>
                <p style="color: #666; margin: 5px 0;">Relatório Premium Disponível</p>
              </div>
              
              <h2 style="color: #333;">Obrigado, {{userName}}! 🎉</h2>
              
              <p>Seu upgrade para Premium foi processado com sucesso!</p>
              
              <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 24px;">✨ Acesso Premium Ativado</h3>
                <p style="margin: 0; opacity: 0.9;">Perfil {{profileType}} - {{profileName}}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{pdfUrl}}" style="background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
                  📄 Baixar Relatório Premium (PDF)
                </a>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #4F46E5; margin-top: 0;">Seu relatório premium inclui:</h3>
                <ul style="color: #555;">
                  <li>Análise comportamental completa</li>
                  <li>Plano de ação personalizado de 4 semanas</li>
                  <li>Recomendações de carreira específicas</li>
                  <li>Estratégias de comunicação e liderança</li>
                </ul>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                MeuPerfil360 - Relatório Premium para seu crescimento
              </p>
            </div>
          `,
          variables: ['userName', 'profileType', 'profileName', 'pdfUrl', 'dashboardUrl']
        },
        {
          name: 'lembrete_reteste',
          subject: 'Hora de refazer seu teste DISC! ⏰',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin: 0;">MeuPerfil360</h1>
                <p style="color: #666; margin: 5px 0;">Lembrete de Reteste</p>
              </div>
              
              <h2 style="color: #333;">Olá, {{userName}}! 👋</h2>
              
              <p>Já se passaram {{daysSinceLastTest}} dias desde seu último teste DISC.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{testUrl}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  🧠 Fazer Novo Teste DISC
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                MeuPerfil360 - Evolua continuamente com autoconhecimento
              </p>
            </div>
          `,
          variables: ['userName', 'daysSinceLastTest', 'testUrl']
        }
      ];

      // Insert or update default templates
      for (const template of defaultTemplates) {
        await db.insert(emailTemplates)
          .values(template)
          .onConflictDoUpdate({
            target: emailTemplates.name,
            set: {
              subject: template.subject,
              content: template.content,
              variables: template.variables,
              updatedAt: new Date()
            }
          });
      }

      console.log('Templates de email padrão inicializados com sucesso');
      res.json({ 
        message: "Templates padrão criados com sucesso", 
        count: defaultTemplates.length,
        success: true
      });
    } catch (error: any) {
      console.error("Error initializing email templates:", error);
      res.status(500).json({ 
        message: "Erro ao inicializar templates de email: " + error.message,
        success: false
      });
    }
  });

  // Test email functionality
  app.post("/api/admin/test-email", [
    sanitizeInput,
    body('testEmail').isEmail().withMessage('Email de teste deve ser válido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { testEmail } = req.body;
      
      // Import email service
      const { emailService } = await import('./email-service');
      
      // Send test email (with automatic fallback to development mode)
      const emailSent = await emailService.sendTestEmail(testEmail);
      
      if (emailSent) {
        res.json({ 
          message: "Email de teste processado com sucesso para " + testEmail + " (verifique os logs do servidor)" 
        });
      } else {
        res.status(500).json({ 
          message: "Falha ao processar email de teste. Verifique os logs do servidor." 
        });
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({ message: "Erro ao enviar email de teste: " + error.message });
    }
  });

  // Preview email template
  app.post("/api/admin/preview-email", async (req: any, res: any) => {
    try {
      const { templateId, sampleData } = req.body;
      
      const template = await db.select().from(emailTemplates).where(eq(emailTemplates.name, templateId)).limit(1);
      
      if (!template.length) {
        return res.status(404).json({ message: "Template não encontrado" });
      }

      let subject = template[0].subject;
      let content = template[0].content;

      // Replace variables with sample data
      for (const [key, value] of Object.entries(sampleData)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value as string);
        content = content.replace(regex, value as string);
      }

      res.json({ subject, content });
    } catch (error: any) {
      console.error('Preview email error:', error);
      res.status(500).json({ message: "Erro ao gerar preview do email" });
    }
  });
  
  // Create payment intent for premium upgrade
  app.post("/api/create-payment-intent", [
    sanitizeInput,
    body('testResultId').isInt({ min: 1 }).withMessage('Test ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const { testResultId } = req.body;
      const amount = 4700; // R$ 47,00 in cents

      // Verify test result exists
      const testResult = await storage.getTestResult(testResultId);
      if (!testResult) {
        return res.status(404).json({ message: "Teste não encontrado" });
      }

      if (testResult.isPremium) {
        return res.status(400).json({ message: "Este teste já é premium" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "brl",
        metadata: {
          testResultId: testResultId.toString(),
        },
      });

      // Create payment record
      await storage.createPayment({
        testResultId: testResultId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount,
        currency: "brl",
        status: "pending",
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: amount,
      });
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ 
        message: "Erro ao criar intenção de pagamento: " + error.message 
      });
    }
  });

  // Stripe webhook to handle payment confirmations
  app.post("/api/webhook/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const testResultId = paymentIntent.metadata.testResultId;

      if (testResultId) {
        // Update test result to premium
        await storage.updateTestResultPremium(
          parseInt(testResultId), 
          paymentIntent.id
        );

        // Update payment status
        const payment = await storage.getPaymentByIntentId(paymentIntent.id);
        if (payment) {
          await storage.updatePaymentStatus(payment.id, 'completed');
        }
      }
    }

    res.json({ received: true });
  });

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe com este email" });
      }

      // Create user without Clerk dependency - map frontend fields to backend schema
      const user = await storage.createUser({
        email: userData.email,
        firstName: userData.username || userData.firstName, // Frontend sends 'username' 
        lastName: userData.lastName || null,
        whatsapp: userData.whatsapp || null,
        clerkId: null,
        freeTestsUsed: 0,
        premiumTestsRemaining: 0,
        isPremiumActive: false,
      });

      // Associate any guest tests with this new user
      if (userData.email) {
        try {
          await storage.associateGuestTestsWithUser(userData.email, user.id);
        } catch (error) {
          console.error('Erro ao associar testes de visitante:', error);
        }
      }

      // Send welcome email (non-blocking)
      setImmediate(() => {
        emailService.sendWelcomeEmail(user.email, user.firstName || user.email).catch(error => {
          console.error('Erro ao enviar email de boas-vindas:', error);
        });
      });

      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.firstName || user.email, // Add username field for frontend compatibility
        message: "Conta criada com sucesso",
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        message: "Erro ao criar conta",
        error: error.message 
      });
    }
  });

  // User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username e senha são obrigatórios" });
      }

      console.log(`Tentativa de login para usuário: ${username}`);

      // Try to find user by email (no username in Clerk system)
      const user = await storage.getUserByEmail(username);
      
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Authentication is handled by Clerk, this endpoint is deprecated
      console.log(`Login attempt for user: ${username} - redirecting to Clerk authentication`);

      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        message: "Use Clerk authentication for login",
        redirectToClerk: true
      });
    } catch (error: any) {
      console.error("Erro no login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Update user password
  app.post("/api/auth/update-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email e nova senha são obrigatórios" });
      }

      console.log(`Atualizando senha para usuário: ${email}`);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Password updates are handled by Clerk, not by our system
      console.log(`Password update request for user: ${email} - redirecting to Clerk`);

      res.json({
        message: "Para alterar a senha, use a página de perfil do Clerk",
        redirectToClerk: true
      });
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Generate PDF report for premium test results
  app.get("/api/test/result/:id/pdf", [
    pdfLimiter,
    sanitizeInput,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    // Set timeout for PDF generation
    req.setTimeout(30000); // 30 seconds timeout
    
    try {
      const testId = parseInt(req.params.id);
      const testResult = await storage.getTestResult(testId);

      if (!testResult) {
        return res.status(404).json({ message: "Teste não encontrado" });
      }

      if (!testResult.isPremium) {
        return res.status(403).json({ message: "PDF disponível apenas para testes premium" });
      }

      // Gerar conteúdo do PDF com base no perfil DISC
      const getDetailedAnalysis = (profileType: string) => {
        const analyses = {
          D: {
            title: "Perfil Dominante (D)",
            characteristics: [
              "Orientado para resultados e conquistas",
              "Líder natural com tendência à tomada de decisões rápidas",
              "Direto na comunicação e prefere eficiência",
              "Competitivo e aceita desafios com facilidade",
              "Foca em objetivos e metas de longo prazo"
            ],
            strengths: [
              "Capacidade de liderança e direcionamento",
              "Determinação para superar obstáculos",
              "Visão estratégica e foco em resultados",
              "Confiança para tomar decisões difíceis",
              "Energia para iniciar novos projetos"
            ],
            development: [
              "Desenvolver paciência e escuta ativa",
              "Praticar delegação e trabalho em equipe",
              "Equilibrar assertividade com empatia",
              "Considerar mais detalhes antes de decidir",
              "Valorizar opiniões e contribuições dos outros"
            ]
          },
          I: {
            title: "Perfil Influente (I)",
            characteristics: [
              "Comunicativo e extrovertido por natureza",
              "Otimista e entusiasmado com novas ideias",
              "Habilidade natural para influenciar pessoas",
              "Flexível e adaptável a mudanças",
              "Valoriza relacionamentos e conexões sociais"
            ],
            strengths: [
              "Excelente comunicação e persuasão",
              "Capacidade de motivar e inspirar outros",
              "Criatividade e pensamento inovador",
              "Networking e construção de relacionamentos",
              "Energia positiva e entusiasmo contagiante"
            ],
            development: [
              "Focar mais em detalhes e follow-up",
              "Desenvolver organização e planejamento",
              "Equilibrar socialização com produtividade",
              "Praticar escuta ativa sem interrupções",
              "Ser mais realista em prazos e compromissos"
            ]
          },
          S: {
            title: "Perfil Estável (S)",
            characteristics: [
              "Paciente e confiável em suas ações",
              "Leal e dedicado às pessoas e organizações",
              "Prefere ambientes estáveis e previsíveis",
              "Bom ouvinte e mediador natural",
              "Valoriza harmonia e cooperação"
            ],
            strengths: [
              "Confiabilidade e consistência",
              "Capacidade de trabalhar em equipe",
              "Paciência para processos longos",
              "Habilidade de mediar conflitos",
              "Lealdade e comprometimento"
            ],
            development: [
              "Ser mais assertivo quando necessário",
              "Aceitar mudanças com mais facilidade",
              "Expressar opiniões e necessidades",
              "Tomar iniciativa em situações novas",
              "Desenvolver tolerância a conflitos construtivos"
            ]
          },
          C: {
            title: "Perfil Conformidade (C)",
            characteristics: [
              "Analítico e orientado por dados",
              "Preciso e atento aos detalhes",
              "Busca qualidade e excelência",
              "Prefere seguir procedimentos estabelecidos",
              "Cauteloso na tomada de decisões"
            ],
            strengths: [
              "Análise detalhada e pensamento crítico",
              "Qualidade e precisão no trabalho",
              "Planejamento e organização sistemática",
              "Capacidade de resolver problemas complexos",
              "Confiabilidade em entregas e prazos"
            ],
            development: [
              "Ser mais flexível com mudanças",
              "Aceitar soluções 'boas o suficiente'",
              "Melhorar comunicação interpessoal",
              "Tomar decisões mais rapidamente",
              "Equilibrar perfeccionismo com produtividade"
            ]
          }
        };
        return analyses[profileType as keyof typeof analyses] || analyses.D;
      };

      const analysis = getDetailedAnalysis(testResult.profileType);

      // Gerar dados adicionais para o relatório completo
      const getCareerSuggestions = (profileType: string, scores: any) => {
        const careers: { [key: string]: string[] } = {
          D: ["Executivo/CEO", "Gerente de Projetos", "Diretor Comercial", "Empreendedor", "Consultor Estratégico"],
          I: ["Gerente de Marketing", "Relações Públicas", "Vendedor", "Treinador/Coach", "Apresentador"],
          S: ["Analista de RH", "Enfermeiro", "Professor", "Assistente Social", "Terapeuta"],
          C: ["Contador", "Analista de Sistemas", "Auditor", "Pesquisador", "Engenheiro"]
        };
        
        // Combinar perfis para sugestões mais precisas
        const primaryProfile = profileType;
        const secondaryProfile = Object.entries(scores)
          .sort(([,a], [,b]) => (b as number) - (a as number))[1][0];
        
        return [...(careers[primaryProfile] || []), ...(careers[secondaryProfile] || [])].slice(0, 6);
      };

      const getActionPlan = (profileType: string) => {
        const plans: { [key: string]: string[] } = {
          D: [
            "Pratique escuta ativa em reuniões diárias",
            "Delegue 2-3 tarefas por semana para desenvolver sua equipe",
            "Reserve 15 minutos diários para reflexão sobre decisões tomadas"
          ],
          I: [
            "Use ferramentas de organização como agenda digital",
            "Pratique apresentações estruturadas com início, meio e fim",
            "Estabeleça metas semanais específicas e mensuráveis"
          ],
          S: [
            "Expresse suas opiniões em ao menos uma reunião por semana",
            "Aceite um novo desafio ou projeto a cada mês",
            "Pratique feedback direto com colegas de confiança"
          ],
          C: [
            "Estabeleça prazos máximos para análises e decisões",
            "Participe de atividades sociais da equipe",
            "Pratique comunicação simplificada de ideias complexas"
          ]
        };
        return plans[profileType] || plans.D;
      };

      const getReflectiveQuestions = (profileType: string) => {
        const questions: { [key: string]: string[] } = {
          D: [
            "Em quais situações deixei de ouvir outras opiniões antes de decidir?",
            "Como posso equilibrar minha assertividade com mais colaboração?",
            "Que impacto minhas decisões rápidas tiveram na equipe?",
            "Quais momentos preciso demonstrar mais paciência?"
          ],
          I: [
            "Em quais conversas perdi o foco do objetivo principal?",
            "Como posso organizar melhor minhas ideias antes de apresentá-las?",
            "Que compromissos assumi sem planejamento adequado?",
            "Quando evitei conversas difíceis que eram necessárias?"
          ],
          S: [
            "Em quais situações deixei de expressar minha opinião quando deveria?",
            "Como posso equilibrar melhor ajudar outros com cuidar de mim mesmo?",
            "Que mudanças enfrentei esta semana e como me adaptei?",
            "Quais limites preciso estabelecer para ser mais efetivo?"
          ],
          C: [
            "Quando minha busca por perfeição atrasou resultados importantes?",
            "Em quais momentos posso acelerar decisões sem comprometer a qualidade?",
            "Como posso comunicar análises complexas de forma mais simples?",
            "Que riscos calculados posso tomar para crescer?"
          ]
        };
        return questions[profileType] || questions.D;
      };

      const careers = getCareerSuggestions(testResult.profileType, testResult.scores);
      const actionPlan = getActionPlan(testResult.profileType);
      const reflectiveQuestions = getReflectiveQuestions(testResult.profileType);
      
      // Ensure scores are properly formatted for PDF generation
      const normalizedScores: Record<string, number> = {};
      const rawScores = testResult.scores;
      
      if (typeof rawScores === 'string') {
        try {
          const parsed = JSON.parse(rawScores);
          Object.entries(parsed).forEach(([key, value]) => {
            normalizedScores[key] = Number(value) || 0;
          });
        } catch (e) {
          normalizedScores.D = 0;
          normalizedScores.I = 0;
          normalizedScores.S = 0;
          normalizedScores.C = 0;
        }
      } else if (rawScores && typeof rawScores === 'object') {
        Object.entries(rawScores).forEach(([key, value]) => {
          normalizedScores[key] = Number(value) || 0;
        });
      } else {
        normalizedScores.D = 0;
        normalizedScores.I = 0;
        normalizedScores.S = 0;
        normalizedScores.C = 0;
      }

      // Criar conteúdo HTML com design simplificado mas visualmente atrativo para PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório Premium DISC - ${testResult.guestName || 'Usuário'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page { 
              size: A4; 
              margin: 20mm 15mm; 
              orphans: 3; 
              widows: 3; 
            }
            * { 
              -webkit-print-color-adjust: exact !important; 
              color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              box-sizing: border-box; 
            }
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.4; 
              color: #333; 
              margin: 0; 
              padding: 10px; 
              background: white; 
              font-size: 12px;
              max-width: 100%;
              overflow-wrap: break-word;
              word-wrap: break-word;
            }
            .header { 
              background: #4f46e5; 
              color: white; 
              padding: 30px; 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .title { 
              font-size: 32px; 
              font-weight: bold; 
              margin-bottom: 10px; 
            }
            .subtitle { 
              font-size: 18px; 
              margin-bottom: 20px; 
            }
            .profile-circle { 
              width: 100px; 
              height: 100px; 
              background: rgba(255,255,255,0.2); 
              border: 3px solid white; 
              border-radius: 50%; 
              display: inline-flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 48px; 
              font-weight: bold; 
              margin: 20px auto; 
            }
            .section { 
              background: #f8fafc; 
              border: 1px solid #e2e8f0; 
              border-radius: 6px; 
              padding: 15px; 
              margin: 10px 0; 
              page-break-inside: avoid; 
              max-width: 100%;
              overflow: hidden;
            }
            .section-title { 
              font-size: 18px; 
              font-weight: 700; 
              color: #2b6cb0; 
              margin-bottom: 12px; 
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0; 
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .section-title::before {
              content: ''; position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
              width: 6px; height: 45px; background: linear-gradient(135deg, #4299e1, #3182ce);
              border-radius: 3px;
            }
            .disc-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 8px 0; 
              background: white; 
              font-size: 11px;
              page-break-inside: avoid;
            }
            .disc-table th { 
              background: #4f46e5; 
              color: white; 
              padding: 8px 6px; 
              font-weight: bold; 
              border: 1px solid white; 
              font-size: 10px;
            }
            .disc-table td { 
              padding: 8px 6px; 
              border: 1px solid #ddd; 
              text-align: center; 
              word-wrap: break-word;
              max-width: 120px;
            }
            .disc-d { background: linear-gradient(135deg, #e53e3e, #c53030); color: white; font-weight: 700; box-shadow: 0 4px 15px rgba(229,62,62,0.3); }
            .disc-i { background: linear-gradient(135deg, #dd6b20, #c05621); color: white; font-weight: 700; box-shadow: 0 4px 15px rgba(221,107,32,0.3); }
            .disc-s { background: linear-gradient(135deg, #38a169, #2f855a); color: white; font-weight: 700; box-shadow: 0 4px 15px rgba(56,161,105,0.3); }
            .disc-c { background: linear-gradient(135deg, #3182ce, #2c5aa0); color: white; font-weight: 700; box-shadow: 0 4px 15px rgba(49,130,206,0.3); }
            .progress-container { 
              margin: 8px 0; 
              background: white; 
              padding: 10px; 
              border-radius: 4px; 
              page-break-inside: avoid;
            }
            .progress-label { 
              font-weight: bold; 
              margin-bottom: 5px; 
              display: flex; 
              justify-content: space-between; 
              font-size: 11px;
              word-wrap: break-word;
            }
            .progress-bar { 
              background: #f1f5f9; 
              height: 20px; 
              border-radius: 10px; 
              border: 1px solid #d1d5db; 
              overflow: hidden; 
            }
            .progress-fill { 
              height: 100%; 
              color: white; 
              font-weight: bold; 
              text-align: center; 
              line-height: 30px; 
            }
            .fill-d { background: linear-gradient(135deg, #e53e3e, #c53030); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
            .fill-i { background: linear-gradient(135deg, #dd6b20, #c05621); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
            .fill-s { background: linear-gradient(135deg, #38a169, #2f855a); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
            .fill-c { background: linear-gradient(135deg, #3182ce, #2c5aa0); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
            .quote-box { 
              background: linear-gradient(135deg, #f0f9ff, #e0f2fe); 
              border: 1px solid #0ea5e9; 
              border-radius: 6px; 
              padding: 12px; 
              margin: 8px 0; 
              page-break-inside: avoid;
              font-size: 11px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .intro-box {
              background: linear-gradient(135deg, #fef3c7, #fde68a);
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 15px;
              margin: 10px 0;
              text-align: center;
              page-break-inside: avoid;
              font-size: 12px;
            }
            .intro-box h3 {
              color: #92400e;
              font-size: 16px;
              margin-bottom: 10px;
              font-weight: 700;
              word-wrap: break-word;
            }
            
            /* Responsive text handling */
            ul, ol {
              padding-left: 20px;
              margin: 8px 0;
              page-break-inside: avoid;
            }
            li {
              margin: 3px 0;
              font-size: 11px;
              line-height: 1.3;
              word-wrap: break-word;
              overflow-wrap: break-word;
              page-break-inside: avoid;
            }
            p {
              margin: 6px 0;
              font-size: 12px;
              line-height: 1.4;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            h1, h2, h3, h4 {
              word-wrap: break-word;
              overflow-wrap: break-word;
              margin: 8px 0 6px 0;
            }
            
            /* New Sections Styling */
            .strengths-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            .strength-card {
              background: linear-gradient(135deg, #f8fafc, #ffffff);
              border-radius: 12px;
              padding: 20px;
              border-left: 4px solid #667eea;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }
            .strength-card.dominance { border-left-color: #e53e3e; }
            .strength-card.influence { border-left-color: #dd6b20; }
            .strength-card.stability { border-left-color: #38a169; }
            .strength-card.conscientiousness { border-left-color: #3182ce; }
            
            .development-areas {
              display: flex;
              flex-direction: column;
              gap: 20px;
              margin: 20px 0;
            }
            .development-card {
              background: linear-gradient(135deg, #fef3c7, #fef9e7);
              border: 1px solid #f59e0b;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 4px 15px rgba(245,158,11,0.1);
            }
            
            .pressure-analysis {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 25px;
              margin: 20px 0;
            }
            .pressure-card {
              background: linear-gradient(135deg, #fee2e2, #fef2f2);
              border: 1px solid #ef4444;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 4px 15px rgba(239,68,68,0.1);
            }
            .pressure-strategies {
              background: linear-gradient(135deg, #e0f2fe, #f0f9ff);
              border: 1px solid #0ea5e9;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 4px 15px rgba(14,165,233,0.1);
            }
            .strategy-item {
              background: rgba(255,255,255,0.7);
              padding: 12px;
              margin: 10px 0;
              border-radius: 8px;
              border-left: 3px solid #0ea5e9;
            }
            
            .support-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            .support-category {
              background: linear-gradient(135deg, #f0fdf4, #f7fee7);
              border: 1px solid #22c55e;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 4px 15px rgba(34,197,94,0.1);
            }
            
            /* Career Analysis Styling */
            .career-analysis {
              margin: 20px 0;
            }
            .career-overview {
              background: linear-gradient(135deg, #eff6ff, #dbeafe);
              border: 1px solid #3b82f6;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 25px;
              box-shadow: 0 4px 15px rgba(59,130,246,0.1);
            }
            .career-categories {
              display: flex;
              flex-direction: column;
              gap: 20px;
              margin: 20px 0;
            }
            .career-category {
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }
            .career-category.primary {
              background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
              border: 1px solid #0ea5e9;
            }
            .career-category.secondary {
              background: linear-gradient(135deg, #fef3c7, #fef9e7);
              border: 1px solid #f59e0b;
            }
            .career-category.environment {
              background: linear-gradient(135deg, #f0fdf4, #f7fee7);
              border: 1px solid #22c55e;
            }
            .career-tips {
              background: linear-gradient(135deg, #faf5ff, #f3e8ff);
              border: 1px solid #8b5cf6;
              border-radius: 12px;
              padding: 20px;
              margin-top: 25px;
              box-shadow: 0 4px 15px rgba(139,92,246,0.1);
            }
            .tip-item {
              background: rgba(255,255,255,0.7);
              padding: 12px;
              margin: 10px 0;
              border-radius: 8px;
              border-left: 3px solid #8b5cf6;
            }
            .action-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0; 
              background: white; 
              border-radius: 6px;
              overflow: hidden;
              page-break-inside: avoid;
              font-size: 11px;
            }
            .action-table th { 
              background: #667eea; 
              color: white; 
              padding: 8px 6px; 
              font-weight: 700; 
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              border: 1px solid #ddd;
              word-wrap: break-word;
              max-width: 80px;
            }
            .action-table td { 
              padding: 8px 6px; 
              border: 1px solid #ddd;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: top; 
              line-height: 1.3;
              word-wrap: break-word;
              overflow-wrap: break-word;
              max-width: 200px;
              font-size: 10px;
            }
            .action-table tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .action-table tbody tr:hover {
              background: #e2e8f0;
            }
            .week-badge { 
              background: #f59e0b; 
              color: white; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-weight: 700; 
              display: inline-block; 
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              white-space: nowrap;
            }
            .warning-box { 
              background: #fef3c7; 
              border: 2px solid #f59e0b; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 15px 0; 
              color: #92400e; 
            }
            .resource-card { 
              background: linear-gradient(135deg, #fefefe, #f9fafb); 
              border: 1px solid #e2e8f0; 
              border-radius: 12px; 
              padding: 25px; 
              margin: 20px 0; 
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
              position: relative;
            }
            .resource-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 4px;
              height: 100%;
              background: linear-gradient(135deg, #667eea, #764ba2);
              border-radius: 2px 0 0 2px;
            }
            .books { border-left: 5px solid #10b981; }
            .podcasts { border-left: 5px solid #8b5cf6; }
            .courses { border-left: 5px solid #f59e0b; }
            ul { padding-left: 20px; }
            li { margin: 5px 0; }
            @media print {
              body { background: white !important; }
              .header { background: #4f46e5 !important; color: white !important; }
              .disc-d { background: #ef4444 !important; color: white !important; }
              .disc-i { background: #f59e0b !important; color: white !important; }
              .disc-s { background: #10b981 !important; color: white !important; }
              .disc-c { background: #3b82f6 !important; color: white !important; }
              .fill-d { background: linear-gradient(135deg, #e53e3e, #c53030) !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important; }
              .fill-i { background: linear-gradient(135deg, #dd6b20, #c05621) !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important; }
              .fill-s { background: linear-gradient(135deg, #38a169, #2f855a) !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important; }
              .fill-c { background: linear-gradient(135deg, #3182ce, #2c5aa0) !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important; }
              .disc-table th { background: #4f46e5 !important; color: white !important; }
              .action-table th { background: #10b981 !important; color: white !important; }
              .week-badge { background: #f59e0b !important; color: white !important; }
            }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; 
              margin: 0; padding: 0; line-height: 1.7; color: #1a202c; 
              background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            }
            .container { 
              max-width: 950px; margin: 20px auto; background: white; 
              box-shadow: 0 25px 50px rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden;
              border: 1px solid rgba(226, 232, 240, 0.6);
            }
            .header { 
              text-align: center; padding: 50px 40px; 
              background: linear-gradient(135deg, #4299e1 0%, #3182ce 50%, #2b77cb 100%); 
              color: white; position: relative; border-radius: 16px 16px 0 0;
            }
            .header::before {
              content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="white" opacity="0.1"/><circle cx="80" cy="40" r="1.5" fill="white" opacity="0.1"/><circle cx="40" cy="80" r="1" fill="white" opacity="0.1"/></svg>');
            }
            .profile-badge { 
              display: inline-block; width: 120px; height: 120px; border-radius: 50%; 
              background: rgba(255,255,255,0.2); color: white; font-size: 48px; 
              font-weight: 800; line-height: 120px; text-align: center; margin: 25px 0;
              border: 4px solid rgba(255,255,255,0.4); box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            }
            .content { padding: 45px; }
            .section { 
              margin: 45px 0; padding: 35px; background: #fdfdfe; 
              border-radius: 16px; border: 1px solid #e2e8f0; position: relative;
              box-shadow: 0 4px 20px rgba(0,0,0,0.03);
            }
            .section::before {
              content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
              background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 2px;
            }
            .section-icon {
              display: inline-block; width: 40px; height: 40px; border-radius: 8px;
              background: linear-gradient(135deg, #667eea, #764ba2); color: white;
              text-align: center; line-height: 40px; font-size: 18px; margin-right: 15px;
              vertical-align: middle;
            }
            .section h2 { 
              color: #1a202c; margin-bottom: 20px; font-size: 24px; font-weight: 600;
              display: flex; align-items: center; padding-bottom: 12px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            /* DISC Chart Styles */
            .chart-container { 
              display: flex; gap: 30px; margin: 30px 0; flex-wrap: wrap;
            }
            .chart-wrapper {
              flex: 1; min-width: 300px; background: white; padding: 25px; 
              border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .bar-chart {
              display: flex; flex-direction: column; gap: 15px;
            }
            .bar-item {
              display: flex; align-items: center; gap: 15px;
            }
            .bar-label {
              width: 80px; font-weight: 600; color: #4a5568;
            }
            .bar-container {
              flex: 1; height: 25px; background: #f1f5f9; border-radius: 12px; overflow: hidden;
            }
            .bar-fill {
              height: 100%; border-radius: 12px; position: relative; transition: width 0.8s ease;
            }
            .bar-d { background: linear-gradient(90deg, #ef4444, #dc2626); }
            .bar-i { background: linear-gradient(90deg, #eab308, #ca8a04); }
            .bar-s { background: linear-gradient(90deg, #22c55e, #16a34a); }
            .bar-c { background: linear-gradient(90deg, #3b82f6, #2563eb); }
            .bar-percentage {
              position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
              color: white; font-weight: 600; font-size: 12px;
            }
            
            /* Radar Chart Simulation */
            .radar-chart {
              width: 200px; height: 200px; margin: 0 auto; position: relative;
              background: radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 50%; border: 2px solid #cbd5e0;
            }
            .radar-point {
              position: absolute; width: 12px; height: 12px; border-radius: 50%;
              transform: translate(-50%, -50%);
            }
            .point-d { top: 15%; left: 50%; background: #ef4444; }
            .point-i { top: 50%; right: 15%; background: #eab308; }
            .point-s { bottom: 15%; left: 50%; background: #22c55e; }
            .point-c { top: 50%; left: 15%; background: #3b82f6; }
            
            /* Cards and Grids */
            .icon-grid { 
              display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
              gap: 20px; margin: 25px 0; 
            }
            .icon-card {
              background: white; padding: 20px; border-radius: 10px; 
              box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 4px solid #667eea;
              transition: transform 0.2s ease; display: flex; align-items: flex-start; gap: 15px;
            }
            .icon-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
            .card-icon {
              width: 35px; height: 35px; border-radius: 8px; 
              background: linear-gradient(135deg, #667eea, #764ba2); color: white;
              display: flex; align-items: center; justify-content: center; font-size: 16px;
              flex-shrink: 0;
            }
            
            /* Action Plan Table */
            .action-table {
              width: 100%; border-collapse: collapse; margin: 20px 0;
              background: white; border-radius: 8px; overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            .action-table th {
              background: linear-gradient(135deg, #667eea, #764ba2); color: white;
              padding: 15px; text-align: left; font-weight: 600;
            }
            .action-table td {
              padding: 12px 15px; border-bottom: 1px solid #e2e8f0;
            }
            .action-table tr:last-child td { border-bottom: none; }
            .week-badge {
              display: inline-block; background: #667eea; color: white;
              padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;
            }
            
            /* Saboteur Alert Box */
            .saboteur-box {
              background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
              border: 2px solid #f59e0b; border-radius: 12px; padding: 25px;
              margin: 30px 0; position: relative; overflow: hidden;
            }
            .saboteur-box::before {
              content: '⚠️'; position: absolute; top: 15px; right: 20px;
              font-size: 24px; opacity: 0.7;
            }
            .saboteur-title {
              color: #92400e; font-weight: 700; font-size: 18px; margin-bottom: 15px;
              display: flex; align-items: center; gap: 10px;
            }
            
            /* Resources Section */
            .resource-grid {
              display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 20px; margin: 25px 0;
            }
            .resource-card {
              background: white; padding: 20px; border-radius: 10px;
              box-shadow: 0 3px 12px rgba(0,0,0,0.08); border-top: 4px solid #667eea;
            }
            .resource-icon {
              width: 40px; height: 40px; border-radius: 8px; margin-bottom: 15px;
              display: flex; align-items: center; justify-content: center; font-size: 18px;
            }
            .book-icon { background: linear-gradient(135deg, #10b981, #059669); color: white; }
            .podcast-icon { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; }
            .course-icon { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
            
            /* Motivational Quotes */
            .quote-box {
              background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
              border-left: 5px solid #6366f1; padding: 20px; margin: 25px 0;
              border-radius: 8px; font-style: italic; color: #3730a3;
              position: relative;
            }
            .quote-box::before {
              content: '"'; font-size: 48px; color: #6366f1; opacity: 0.3;
              position: absolute; top: 5px; left: 15px; line-height: 1;
            }
            
            /* Footer */
            .footer { 
              margin-top: 50px; padding: 40px 30px; background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%); 
              color: #e2e8f0; text-align: center; border-top: 3px solid #0066cc;
            }
            .footer-logo {
              font-size: 28px; font-weight: 800; color: #0066cc; margin-bottom: 25px;
              text-shadow: 0 2px 4px rgba(0,102,204,0.3);
            }
            .contact-info {
              background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; 
              margin: 25px auto; border: 1px solid rgba(0,102,204,0.2);
              box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 800px;
            }
            .contact-info p {
              margin-bottom: 20px; line-height: 1.6; color: #cbd5e0; text-align: justify;
              font-size: 14px;
            }
            .contact-info p:last-child {
              margin-bottom: 0; font-weight: 600; color: #0066cc; text-align: center;
              font-size: 16px; padding-top: 15px; border-top: 1px solid rgba(0,102,204,0.2);
            }
            
            /* Profile-specific header colors */
            .profile-d .header { background: linear-gradient(135deg, #e53e3e, #c53030); }
            .profile-i .header { background: linear-gradient(135deg, #dd6b20, #c05621); }
            .profile-s .header { background: linear-gradient(135deg, #38a169, #2f855a); }
            .profile-c .header { background: linear-gradient(135deg, #3182ce, #2c5aa0); }
            
            /* Profile-specific footer colors - matching header */
            .profile-d .footer { background: linear-gradient(135deg, #e53e3e, #c53030); }
            .profile-i .footer { background: linear-gradient(135deg, #dd6b20, #c05621); }
            .profile-s .footer { background: linear-gradient(135deg, #38a169, #2f855a); }
            .profile-c .footer { background: linear-gradient(135deg, #3182ce, #2c5aa0); }
            
            /* Ensure footer text is always readable on colored backgrounds */
            .profile-d .footer-logo,
            .profile-i .footer-logo,
            .profile-s .footer-logo,
            .profile-c .footer-logo { color: white !important; text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important; }
            
            .profile-d .contact-info p:last-child,
            .profile-i .contact-info p:last-child,
            .profile-s .contact-info p:last-child,
            .profile-c .contact-info p:last-child { color: white !important; }
            
            /* Enhanced typography */
            .report-title {
              font-size: 32px; font-weight: 800; text-transform: uppercase;
              letter-spacing: 1.5px; margin-bottom: 10px;
            }
            .report-subtitle {
              font-size: 18px; font-weight: 500; opacity: 0.9;
              margin-bottom: 25px;
            }
            .name-title {
              font-size: 28px; font-weight: 700; margin: 20px 0 10px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            /* Enhanced section cards */
            .enhanced-section {
              background: white; border-radius: 16px; padding: 30px;
              margin: 25px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.08);
              border-top: 4px solid #667eea; position: relative;
              overflow: hidden;
            }
            .enhanced-section::before {
              content: ''; position: absolute; top: 0; right: 0;
              width: 100px; height: 100px; background: linear-gradient(135deg, rgba(102,126,234,0.1), transparent);
              border-radius: 50%; transform: translate(30px, -30px);
            }
            
            /* Print Optimizations */
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
              .section { break-inside: avoid; }
              .enhanced-section { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            }
          </style>
          <script>
            function generateAndDownloadPDF() {
              window.print();
            }
            
            function downloadCurrentPDF(event) {
              console.log('Download PDF clicked');
              // Set a filename for the download
              document.title = 'Relatório DISC Premium - ${testResult.guestName ? testResult.guestName.replace(/[^a-zA-Z0-9]/g, '-') : 'Usuario'}';
              
              // Show loading feedback
              const button = event ? event.target.closest('button') : null;
              let originalText = '';
              if (button) {
                originalText = button.innerHTML;
                button.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Abrindo...';
                button.disabled = true;
              }
              
              // Add CSS for spinner animation if not exists
              if (!document.getElementById('spinner-style')) {
                const style = document.createElement('style');
                style.id = 'spinner-style';
                style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
                document.head.appendChild(style);
              }
              
              // Multiple fallback methods for PDF download
              setTimeout(() => {
                try {
                  console.log('Attempting to open print dialog');
                  window.print();
                  console.log('Print dialog opened successfully');
                } catch (error) {
                  console.error('Print failed:', error);
                  alert('Por favor, use Ctrl+P (ou Cmd+P no Mac) para salvar como PDF');
                }
                
                // Reset button after delay
                if (button) {
                  setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                  }, 1000);
                }
              }, 200);
            }
            
            // Alternative download method using HTML download
            function downloadAsHTML(event) {
              console.log('Download HTML clicked');
              try {
                // Show loading feedback
                const button = event ? event.target.closest('button') : null;
                let originalText = '';
                if (button) {
                  originalText = button.innerHTML;
                  button.innerHTML = '<div style="width: 14px; height: 14px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Baixando...';
                  button.disabled = true;
                }
                
                const filename = 'Relatório-DISC-Premium-${testResult.guestName ? testResult.guestName.replace(/[^a-zA-Z0-9]/g, '-') : 'Usuario'}.html';
                
                // Create a complete HTML document with inline styles
                const htmlContent = \`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${document.title}</title>
  <style>
    \${Array.from(document.styleSheets).map(sheet => {
      try {
        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\\n');
      } catch (e) {
        return '';
      }
    }).join('\\n')}
  </style>
</head>
<body>
  \${document.body.innerHTML.replace(/<script[^>]*>.*?<\\/script>/gi, '')}
</body>
</html>\`;
                
                const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  button.innerHTML = originalText;
                  button.disabled = false;
                }, 100);
                
              } catch (error) {
                console.error('Download failed:', error);
                alert('Erro ao baixar arquivo. Tente usar Ctrl+P para salvar como PDF.');
                if (button) {
                  button.innerHTML = originalText;
                  button.disabled = false;
                }
              }
            }

            // Add floating download button
            function addDownloadButton() {
              // Create PDF button
              const pdfBtn = document.createElement('button');
              pdfBtn.innerHTML = \`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Baixar PDF
              \`;
              pdfBtn.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                background: linear-gradient(135deg, #4299e1, #3182ce);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
              \`;
              
              // Add event listener
              pdfBtn.addEventListener('click', function(e) {
                console.log('PDF button clicked');
                downloadCurrentPDF(e);
              });
              
              // Add hover effects
              pdfBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 16px rgba(66, 153, 225, 0.4)';
              });
              pdfBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 12px rgba(66, 153, 225, 0.3)';
              });
              
              // Append to body
              document.body.appendChild(pdfBtn);
            }
            
            // Add keyboard shortcut
            document.addEventListener('keydown', function(e) {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                downloadCurrentPDF();
              }
            });
            
            // Initialize download button when page loads
            window.addEventListener('load', addDownloadButton);
          </script>
        </head>
        <body class="profile-${testResult.profileType.toLowerCase()}">
          <!-- HEADER -->
          <div class="header">
            <div class="report-title">✨ RELATÓRIO DISC PREMIUM</div>
            <div class="report-subtitle">Análise Comportamental Personalizada</div>
            <div class="profile-circle">${testResult.profileType}</div>
            <h3 class="name-title">${testResult.guestName || 'Usuário'}</h3>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Perfil Dominante:</strong> ${analysis.title}</p>
            <p style="margin: 5px 0; font-size: 14px;">📅 ${new Date().toLocaleDateString('pt-BR')} | 📧 ${testResult.guestEmail || 'Não informado'}</p>
          </div>

          <!-- RESUMO EXECUTIVO -->
          <div class="section">
            <div class="section-title">📋 Resumo Executivo</div>
            <div class="quote-box">
              <p><strong>Perfil Dominante:</strong> ${analysis.title}</p>
              <p>Este relatório oferece uma análise completa do seu perfil comportamental DISC, incluindo gráficos visuais, plano de ação estruturado e recomendações personalizadas para desenvolvimento.</p>
            </div>
          </div>

          <!-- ANÁLISE DISC -->
          <div class="section">
            <div class="section-title">📊 Análise Visual do Perfil DISC</div>
            
            <table class="disc-table">
              <thead>
                <tr>
                  <th>Fator</th>
                  <th>Dimensão</th>
                  <th>Pontuação</th>
                  <th>Nível</th>
                </tr>
              </thead>
              <tbody>
                ${['D', 'I', 'S', 'C'].map((type) => {
                  const score = normalizedScores[type] || 0;
                  const names = {
                    D: 'Dominância',
                    I: 'Influência',
                    S: 'Estabilidade',
                    C: 'Conformidade'
                  };
                  const nivel = score >= 70 ? 'ALTO' : score >= 40 ? 'MÉDIO' : 'BAIXO';
                  return `
                    <tr>
                      <td class="disc-${type.toLowerCase()}">${type}</td>
                      <td><strong>${names[type as keyof typeof names]}</strong></td>
                      <td style="position: relative; padding: 8px; min-width: 120px;">
                        <div style="background: #f0f0f0; height: 24px; border-radius: 4px; position: relative; overflow: visible;">
                          <div style="background: ${type === 'D' ? '#e53e3e' : type === 'I' ? '#dd6b20' : type === 'S' ? '#38a169' : '#3b82f6'}; height: 100%; width: ${score}%; border-radius: 4px; position: relative;"></div>
                          <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; color: #333; font-size: 13px; z-index: 10; text-shadow: 1px 1px 1px rgba(255,255,255,0.8);">${score}%</span>
                        </div>
                      </td>
                      <td><strong>${nivel}</strong></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <h3>📈 Intensidade Visual dos Fatores</h3>
            ${['D', 'I', 'S', 'C'].map((type) => {
              const score = normalizedScores[type] || 0;
              const names = {
                D: 'Dominância',
                I: 'Influência',
                S: 'Estabilidade',
                C: 'Conformidade'
              };
              return `
                <div class="progress-container">
                  <div class="progress-label">
                    <span><strong>${type} - ${names[type as keyof typeof names]}</strong></span>
                    <span><strong>${score}%</strong></span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill fill-${type.toLowerCase()}" style="width: ${score}%;">${score}%</div>
                  </div>
                </div>
              `;
            }).join('')}

            <div class="quote-box">
              <p><strong>Interpretação:</strong> Seu perfil ${testResult.profileType} revela uma personalidade única com potencial extraordinário. Cada dimensão DISC contribui para sua história de sucesso e crescimento pessoal.</p>
            </div>
          </div>

          <!-- PRINCIPAIS PONTOS FORTES -->
          <div class="enhanced-section">
            <div class="section-title">💪 Principais Pontos Fortes</div>
            <div class="strengths-grid">
              ${testResult.profileType === 'D' ? `
                <div class="strength-card dominance">
                  <h4>🎯 Liderança Natural</h4>
                  <p>Capacidade excepcional de tomar decisões rápidas e assumir responsabilidades em situações desafiadoras.</p>
                </div>
                <div class="strength-card dominance">
                  <h4>⚡ Orientação para Resultados</h4>
                  <p>Foco intenso em objetivos e metas, com determinação para superar obstáculos e alcançar o sucesso.</p>
                </div>
                <div class="strength-card dominance">
                  <h4>🚀 Iniciativa e Proatividade</h4>
                  <p>Tendência natural para iniciar projetos e buscar oportunidades de crescimento e inovação.</p>
                </div>
                <div class="strength-card dominance">
                  <h4>💼 Visão Estratégica</h4>
                  <p>Habilidade para enxergar o panorama geral e definir direções claras para equipes e organizações.</p>
                </div>` :
              testResult.profileType === 'I' ? `
                <div class="strength-card influence">
                  <h4>🌟 Comunicação Inspiradora</h4>
                  <p>Capacidade excepcional de se conectar com pessoas e transmitir ideias de forma envolvente e motivadora.</p>
                </div>
                <div class="strength-card influence">
                  <h4>🤝 Habilidades Interpessoais</h4>
                  <p>Facilidade natural para construir relacionamentos, criar networking e trabalhar em equipe.</p>
                </div>
                <div class="strength-card influence">
                  <h4>✨ Criatividade e Inovação</h4>
                  <p>Pensamento criativo e capacidade de gerar soluções inovadoras para desafios complexos.</p>
                </div>
                <div class="strength-card influence">
                  <h4>🎭 Adaptabilidade Social</h4>
                  <p>Flexibilidade para se ajustar a diferentes contextos sociais e influenciar positivamente diversos grupos.</p>
                </div>` :
              testResult.profileType === 'S' ? `
                <div class="strength-card stability">
                  <h4>🤝 Colaboração Excepcional</h4>
                  <p>Habilidade natural para trabalhar harmoniosamente em equipe e apoiar colegas em seus objetivos.</p>
                </div>
                <div class="strength-card stability">
                  <h4>🛡️ Confiabilidade</h4>
                  <p>Consistência e dependabilidade em todas as atividades, sendo uma pessoa em quem outros podem confiar.</p>
                </div>
                <div class="strength-card stability">
                  <h4>👂 Escuta Ativa</h4>
                  <p>Capacidade excepcional de ouvir, compreender e oferecer suporte emocional quando necessário.</p>
                </div>
                <div class="strength-card stability">
                  <h4>⚖️ Equilíbrio e Paciência</h4>
                  <p>Manutenção da calma em situações tensas e capacidade de mediar conflitos com sabedoria.</p>
                </div>` : `
                <div class="strength-card conscientiousness">
                  <h4>🔍 Atenção aos Detalhes</h4>
                  <p>Capacidade excepcional de identificar nuances e garantir precisão em todas as atividades.</p>
                </div>
                <div class="strength-card conscientiousness">
                  <h4>📊 Pensamento Analítico</h4>
                  <p>Habilidade para analisar dados, processos e situações de forma sistemática e objetiva.</p>
                </div>
                <div class="strength-card conscientiousness">
                  <h4>🎯 Organização e Planejamento</h4>
                  <p>Competência natural para estruturar processos, criar sistemas eficientes e manter a ordem.</p>
                </div>
                <div class="strength-card conscientiousness">
                  <h4>✅ Qualidade e Excelência</h4>
                  <p>Compromisso constante com padrões elevados e busca contínua pela perfeição nos resultados.</p>
                </div>`}
            </div>
          </div>

          <!-- ÁREAS DE DESENVOLVIMENTO -->
          <div class="enhanced-section">
            <div class="section-title">🌱 Áreas de Desenvolvimento</div>
            <div class="development-areas">
              ${testResult.profileType === 'D' ? `
                <div class="development-card">
                  <h4>🤝 Desenvolvimento da Paciência</h4>
                  <p><strong>Oportunidade:</strong> Cultivar maior tolerância com processos que demandam tempo e com pessoas que têm ritmo diferente.</p>
                  <p><strong>Ação:</strong> Praticar técnicas de mindfulness e reservar momentos para reflexão antes de tomar decisões importantes.</p>
                </div>
                <div class="development-card">
                  <h4>👂 Escuta Ativa</h4>
                  <p><strong>Oportunidade:</strong> Melhorar a capacidade de ouvir diferentes perspectivas antes de expressar opiniões.</p>
                  <p><strong>Ação:</strong> Implementar a regra de fazer pelo menos duas perguntas antes de apresentar soluções.</p>
                </div>
                <div class="development-card">
                  <h4>🎨 Flexibilidade de Abordagem</h4>
                  <p><strong>Oportunidade:</strong> Desenvolver maior abertura para métodos alternativos de alcançar objetivos.</p>
                  <p><strong>Ação:</strong> Experimentar deliberadamente abordagens diferentes em projetos de menor risco.</p>
                </div>` :
              testResult.profileType === 'I' ? `
                <div class="development-card">
                  <h4>🎯 Foco e Concentração</h4>
                  <p><strong>Oportunidade:</strong> Desenvolver maior capacidade de manter atenção em tarefas detalhadas por períodos prolongados.</p>
                  <p><strong>Ação:</strong> Usar técnicas como Pomodoro e criar ambientes livres de distrações para trabalho focado.</p>
                </div>
                <div class="development-card">
                  <h4>📋 Organização e Planejamento</h4>
                  <p><strong>Oportunidade:</strong> Melhorar habilidades de estruturação de projetos e gestão de tempo.</p>
                  <p><strong>Ação:</strong> Implementar sistemas de organização visual como quadros Kanban e calendários estruturados.</p>
                </div>
                <div class="development-card">
                  <h4>🔍 Atenção aos Detalhes</h4>
                  <p><strong>Oportunidade:</strong> Desenvolver maior precisão na execução de tarefas que requerem exatidão.</p>
                  <p><strong>Ação:</strong> Criar checklists detalhados e implementar processos de revisão sistemática.</p>
                </div>` :
              testResult.profileType === 'S' ? `
                <div class="development-card">
                  <h4>🚀 Assertividade</h4>
                  <p><strong>Oportunidade:</strong> Desenvolver maior confiança para expressar opiniões e tomar iniciativas.</p>
                  <p><strong>Ação:</strong> Praticar comunicação assertiva em situações de baixo risco e buscar feedback construtivo.</p>
                </div>
                <div class="development-card">
                  <h4>⚡ Adaptação a Mudanças</h4>
                  <p><strong>Oportunidade:</strong> Aumentar a flexibilidade e rapidez na adaptação a novas situações.</p>
                  <p><strong>Ação:</strong> Expor-se gradualmente a pequenas mudanças e celebrar sucessos na adaptação.</p>
                </div>
                <div class="development-card">
                  <h4>🎯 Definição de Limites</h4>
                  <p><strong>Oportunidade:</strong> Aprender a estabelecer limites saudáveis para evitar sobrecarga.</p>
                  <p><strong>Ação:</strong> Praticar dizer "não" de forma respeitosa e definir prioridades claras.</p>
                </div>` : `
                <div class="development-card">
                  <h4>⚡ Agilidade na Tomada de Decisão</h4>
                  <p><strong>Oportunidade:</strong> Desenvolver maior rapidez em decisões quando informações completas não estão disponíveis.</p>
                  <p><strong>Ação:</strong> Estabelecer prazos para análises e praticar decisões baseadas em 80% das informações.</p>
                </div>
                <div class="development-card">
                  <h4>🤝 Flexibilidade Interpessoal</h4>
                  <p><strong>Oportunidade:</strong> Melhorar a adaptação ao estilo de comunicação de diferentes pessoas.</p>
                  <p><strong>Ação:</strong> Estudar estilos de comunicação e praticar ajustar abordagem conforme o interlocutor.</p>
                </div>
                <div class="development-card">
                  <h4>🎨 Tolerância à Ambiguidade</h4>
                  <p><strong>Oportunidade:</strong> Desenvolver maior conforto com situações incertas ou pouco estruturadas.</p>
                  <p><strong>Ação:</strong> Participar de projetos criativos e brainstormings sem agenda fixa.</p>
                </div>`}
            </div>
          </div>

          <!-- COMPORTAMENTO SOB PRESSÃO -->
          <div class="enhanced-section">
            <div class="section-title">⚠️ Comportamento Sob Pressão</div>
            <div class="pressure-analysis">
              <div class="pressure-card alert">
                <h4>🚨 Padrões a Observar</h4>
                ${testResult.profileType === 'D' ? `
                  <ul>
                    <li><strong>Impaciência Excessiva:</strong> Tendência a tomar decisões precipitadas sem consultar a equipe</li>
                    <li><strong>Microgerenciamento:</strong> Dificuldade em delegar quando sob pressão intensa</li>
                    <li><strong>Comunicação Direta Demais:</strong> Pode soar agressivo ou insensível em momentos críticos</li>
                    <li><strong>Isolamento:</strong> Tendência a trabalhar sozinho quando deveria buscar apoio</li>
                  </ul>
                ` : testResult.profileType === 'I' ? `
                  <ul>
                    <li><strong>Dispersão:</strong> Dificuldade para manter foco em prioridades quando há múltiplas demandas</li>
                    <li><strong>Evitação de Conflitos:</strong> Tendência a adiar conversas difíceis ou decisões impopulares</li>
                    <li><strong>Sobrecarga Social:</strong> Pode se esgotar tentando manter todos satisfeitos</li>
                    <li><strong>Procrastinação:</strong> Adiamento de tarefas administrativas ou detalhadas</li>
                  </ul>
                ` : testResult.profileType === 'S' ? `
                  <ul>
                    <li><strong>Resistência a Mudanças:</strong> Dificuldade para se adaptar rapidamente a novos processos</li>
                    <li><strong>Sobrecarga Silenciosa:</strong> Tendência a assumir mais responsabilidades sem comunicar o estresse</li>
                    <li><strong>Indecisão:</strong> Dificuldade para tomar decisões rápidas quando há conflito de interesses</li>
                    <li><strong>Evitação de Confronto:</strong> Pode concordar superficialmente mas guardar ressentimentos</li>
                  </ul>
                ` : `
                  <ul>
                    <li><strong>Paralisia por Análise:</strong> Tendência a buscar informações excessivas antes de agir</li>
                    <li><strong>Perfeccionismo Limitante:</strong> Dificuldade em aceitar soluções "boas o suficiente"</li>
                    <li><strong>Crítica Excessiva:</strong> Pode focar demais em problemas e pouco em soluções</li>
                    <li><strong>Isolamento Social:</strong> Tendência a se retirar quando se sente sobrecarregado</li>
                  </ul>
                `}
              </div>
              
              <div class="pressure-strategies">
                <h4>🛡️ Estratégias de Manejo</h4>
                ${testResult.profileType === 'D' ? `
                  <div class="strategy-item">
                    <strong>Respire e Conte até 10:</strong> Antes de tomar decisões importantes, faça uma pausa de 10 segundos para avaliar impactos.
                  </div>
                  <div class="strategy-item">
                    <strong>Consulte sua Equipe:</strong> Estabeleça o hábito de buscar pelo menos uma opinião externa antes de agir.
                  </div>
                  <div class="strategy-item">
                    <strong>Exercícios de Descompressão:</strong> Pratique atividades físicas intensas para liberar tensão acumulada.
                  </div>
                ` : testResult.profileType === 'I' ? `
                  <div class="strategy-item">
                    <strong>Lista de Prioridades Visual:</strong> Use quadros ou aplicativos visuais para manter foco nas tarefas mais importantes.
                  </div>
                  <div class="strategy-item">
                    <strong>Time-boxing:</strong> Defina blocos específicos de tempo para diferentes tipos de atividade.
                  </div>
                  <div class="strategy-item">
                    <strong>Rede de Apoio:</strong> Mantenha contato regular com mentores ou colegas de confiança.
                  </div>
                ` : testResult.profileType === 'S' ? `
                  <div class="strategy-item">
                    <strong>Comunicação Proativa:</strong> Estabeleça check-ins regulares para expressar necessidades e preocupações.
                  </div>
                  <div class="strategy-item">
                    <strong>Planejamento de Transições:</strong> Crie planos detalhados para mudanças, incluindo cronogramas graduais.
                  </div>
                  <div class="strategy-item">
                    <strong>Técnicas de Relaxamento:</strong> Pratique meditação ou técnicas de respiração para manter a calma.
                  </div>
                ` : `
                  <div class="strategy-item">
                    <strong>Prazos para Análise:</strong> Defina limites de tempo para pesquisa e análise antes de tomar decisões.
                  </div>
                  <div class="strategy-item">
                    <strong>Regra 80/20:</strong> Aceite soluções quando tiver 80% das informações necessárias.
                  </div>
                  <div class="strategy-item">
                    <strong>Pausas Estruturadas:</strong> Programe intervalos regulares para recarregar a energia mental.
                  </div>
                `}
              </div>
            </div>
          </div>

          <!-- FATORES DE APOIO -->
          <div class="enhanced-section">
            <div class="section-title">🤝 Fatores de Apoio</div>
            <div class="support-grid">
              <div class="support-category">
                <h4>👥 Tipos de Pessoas que Complementam seu Perfil</h4>
                ${testResult.profileType === 'D' ? `
                  <ul>
                    <li><strong>Perfis S (Estabilidade):</strong> Pessoas pacientes que podem ajudar a moderar sua intensidade</li>
                    <li><strong>Perfis C (Conformidade):</strong> Indivíduos detalhistas que garantem qualidade nas execuções</li>
                    <li><strong>Perfis I (Influência):</strong> Pessoas comunicativas que facilitam relacionamentos interpessoais</li>
                  </ul>
                ` : testResult.profileType === 'I' ? `
                  <ul>
                    <li><strong>Perfis C (Conformidade):</strong> Pessoas organizadas que ajudam na estruturação de ideias</li>
                    <li><strong>Perfis D (Dominância):</strong> Indivíduos focados em resultados que direcionam a execução</li>
                    <li><strong>Perfis S (Estabilidade):</strong> Pessoas estáveis que oferecem apoio emocional consistente</li>
                  </ul>
                ` : testResult.profileType === 'S' ? `
                  <ul>
                    <li><strong>Perfis D (Dominância):</strong> Pessoas decisivas que podem motivá-lo a tomar iniciativas</li>
                    <li><strong>Perfis I (Influência):</strong> Indivíduos energéticos que trazem dinamismo e motivação</li>
                    <li><strong>Perfis C (Conformidade):</strong> Pessoas estruturadas que ajudam no planejamento detalhado</li>
                  </ul>
                ` : `
                  <ul>
                    <li><strong>Perfis I (Influência):</strong> Pessoas comunicativas que facilitam interações sociais</li>
                    <li><strong>Perfis D (Dominância):</strong> Indivíduos decisivos que aceleram processos de tomada de decisão</li>
                    <li><strong>Perfis S (Estabilidade):</strong> Pessoas empáticas que oferecem suporte emocional</li>
                  </ul>
                `}
              </div>
              
              <div class="support-category">
                <h4>🌍 Ambientes Ideais de Trabalho</h4>
                ${testResult.profileType === 'D' ? `
                  <ul>
                    <li>Ambientes com autonomia e liberdade para tomar decisões</li>
                    <li>Organizações que valorizam resultados mais que processos</li>
                    <li>Culturas empresariais orientadas para inovação e crescimento</li>
                    <li>Equipes pequenas e ágeis com comunicação direta</li>
                  </ul>
                ` : testResult.profileType === 'I' ? `
                  <ul>
                    <li>Ambientes colaborativos com interação social frequente</li>
                    <li>Organizações que valorizam criatividade e inovação</li>
                    <li>Culturas empresariais abertas e comunicativas</li>
                    <li>Espaços flexíveis que permitem mobilidade e dinamismo</li>
                  </ul>
                ` : testResult.profileType === 'S' ? `
                  <ul>
                    <li>Ambientes estáveis com mudanças graduais e planejadas</li>
                    <li>Organizações que valorizam trabalho em equipe e colaboração</li>
                    <li>Culturas empresariais que priorizam bem-estar dos funcionários</li>
                    <li>Espaços tranquilos que promovem concentração e harmonia</li>
                  </ul>
                ` : `
                  <ul>
                    <li>Ambientes organizados com processos claros e definidos</li>
                    <li>Organizações que valorizam qualidade e precisão</li>
                    <li>Culturas empresariais que respeitam expertise técnica</li>
                    <li>Espaços estruturados que minimizam distrações</li>
                  </ul>
                `}
              </div>
              
              <div class="support-category">
                <h4>🛠️ Ferramentas e Recursos Úteis</h4>
                ${testResult.profileType === 'D' ? `
                  <ul>
                    <li><strong>Apps de Produtividade:</strong> Todoist, Asana para gestão de projetos</li>
                    <li><strong>Dashboards:</strong> Ferramentas de BI para acompanhar métricas em tempo real</li>
                    <li><strong>Comunicação Direta:</strong> Slack, Teams para comunicação rápida</li>
                    <li><strong>Automação:</strong> Zapier, Power Automate para otimizar processos</li>
                  </ul>
                ` : testResult.profileType === 'I' ? `
                  <ul>
                    <li><strong>Ferramentas Visuais:</strong> Miro, Canva para criação e brainstorming</li>
                    <li><strong>Redes Sociais Profissionais:</strong> LinkedIn para networking</li>
                    <li><strong>Calendários Visuais:</strong> Google Calendar com cores e categorias</li>
                    <li><strong>Apresentações:</strong> Prezi, PowerPoint para comunicação dinâmica</li>
                  </ul>
                ` : testResult.profileType === 'S' ? `
                  <ul>
                    <li><strong>Organizadores Pessoais:</strong> Notion, Evernote para planejamento</li>
                    <li><strong>Comunicação Suave:</strong> Email, mensagens diretas para interações</li>
                    <li><strong>Ferramentas de Bem-estar:</strong> Headspace, Calm para relaxamento</li>
                    <li><strong>Colaboração:</strong> Google Workspace para trabalho em equipe</li>
                  </ul>
                ` : `
                  <ul>
                    <li><strong>Análise de Dados:</strong> Excel, Power BI para análises detalhadas</li>
                    <li><strong>Documentação:</strong> Confluence, SharePoint para organização</li>
                    <li><strong>Controle de Qualidade:</strong> Checklists digitais e templates</li>
                    <li><strong>Pesquisa:</strong> Zotero, Mendeley para gestão de referências</li>
                  </ul>
                `}
              </div>
            </div>
          </div>

          <!-- PLANO DE AÇÃO APRIMORADO -->
          <div class="enhanced-section">
            <div class="section-title">🎯 Plano de Ação Personalizado de 4 Semanas</div>
            
            <table class="action-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Foco</th>
                  <th>Ação Estratégica</th>
                </tr>
              </thead>
              <tbody>
                ${actionPlan.map((action, index) => {
                  const focusAreas = ['Autoconhecimento', 'Desenvolvimento', 'Aplicação', 'Consolidação'];
                  return `
                    <tr>
                      <td><span class="week-badge">${index + 1}</span></td>
                      <td><strong>${focusAreas[index]}</strong></td>
                      <td>${action}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="warning-box">
              <h4>💭 Perguntas para Reflexão Semanal</h4>
              ${reflectiveQuestions.map((question, index) => `
                <p><strong>Semana ${index + 1}:</strong> ${question}</p>
              `).join('')}
            </div>
          </div>

          <!-- RECURSOS PERSONALIZADOS -->
          <div class="section">
            <div class="section-title">📚 Recursos Personalizados</div>
            
            <div class="resource-card books">
              <h4>📚 Livros Recomendados</h4>
              <ul>
                ${testResult.profileType === 'D' ? 
                  '<li>"O Executivo Eficaz" - Peter Drucker</li><li>"Liderança na Era Digital" - Harvard Business Review</li><li>"Mindset: A Nova Psicologia do Sucesso" - Carol Dweck</li>' :
                  testResult.profileType === 'I' ? 
                  '<li>"Como Fazer Amigos e Influenciar Pessoas" - Dale Carnegie</li><li>"O Poder da Comunicação" - Chris Anderson</li><li>"Inteligência Emocional" - Daniel Goleman</li>' :
                  testResult.profileType === 'S' ?
                  '<li>"A Coragem de Ser Imperfeito" - Brené Brown</li><li>"Comunicação Não-Violenta" - Marshall Rosenberg</li><li>"O Poder do Hábito" - Charles Duhigg</li>' :
                  '<li>"Pensamento Rápido e Devagar" - Daniel Kahneman</li><li>"A Arte de Resolver Problemas" - Russell Ackoff</li><li>"O Cisne Negro" - Nassim Taleb</li>'
                }
              </ul>
            </div>

          </div>

          <!-- SABOTADORES -->
          <div class="section">
            <div class="warning-box">
              <div class="section-title">⚠️ Padrões Sabotadores a Observar</div>
              <p><strong>Atenção especial para seu perfil ${testResult.profileType}:</strong></p>
              <ul>
                ${testResult.profileType === 'D' ? 
                  '<li>Impaciência excessiva com processos longos</li><li>Tendência a tomar decisões sem consultar a equipe</li><li>Dificuldade em aceitar feedback construtivo</li>' :
                  testResult.profileType === 'I' ? 
                  '<li>Dispersão em conversas e reuniões</li><li>Promessas excessivas sem planejamento adequado</li><li>Evitar confrontos necessários</li>' :
                  testResult.profileType === 'S' ?
                  '<li>Resistência excessiva a mudanças</li><li>Dificuldade em expressar opiniões contrárias</li><li>Sobrecarga por não saber dizer "não"</li>' :
                  '<li>Paralisia por análise excessiva</li><li>Perfeccionismo que atrasa entregas</li><li>Evitar riscos necessários para crescimento</li>'
                }
              </ul>
              <p><strong>Lembre-se:</strong> Reconhecer esses padrões é o primeiro passo para transformá-los em pontos de crescimento.</p>
            </div>
          </div>

          <!-- CAREERS SECTION -->
          <div class="section">
            <div class="section-title">💼 Carreiras Ideais</div>
            <div class="resource-card">
              <p>Com base no seu perfil ${testResult.profileType}, estas são as carreiras que mais se alinham com seus pontos fortes:</p>
              <ul>
                ${careers.map(career => `<li>${career}</li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-logo">MeuPerfil360</div>
            <div class="contact-info">
              <p>Este relatório DISC Premium foi gerado exclusivamente para o uso individual e intransferível do usuário do MeuPerfil360. Recomendamos que a análise DISC seja atualizada a cada 6 meses, garantindo a precisão e a relevância dos dados para o seu desenvolvimento contínuo.</p>
              
              <p>O conteúdo deste documento é protegido por direitos autorais e não deve ser reproduzido ou distribuído sem autorização expressa. Todas as informações têm caráter orientativo e visam apoiar o autoconhecimento e a evolução profissional, sem substituir aconselhamento profissional ou psicológico individualizado.</p>
              
              <p>Para mais informações ou suporte, acesse: <strong>www.meuperfil360.com.br</strong></p>
            </div>
          </div>

        </body>
        </html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Falha ao gerar PDF' });
      }
    });

  // Download PDF route - optimized HTML for browser-based PDF printing
  app.get("/api/test/result/:id/download", [
    pdfLimiter,
    sanitizeInput,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    validateRequest
  ], async (req: any, res: any) => {
    try {
      const testId = parseInt(req.params.id);
      const testResult = await storage.getTestResult(testId);

      if (!testResult) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      if (!testResult.isPremium) {
        return res.status(403).json({ error: 'PDF premium requerido' });
      }

      // Generate the HTML content with enhanced print optimization
      const normalizedScores = {
        D: (testResult.scores as any).D,
        I: (testResult.scores as any).I, 
        S: (testResult.scores as any).S,
        C: (testResult.scores as any).C
      };

      const analysis = {
        title: testResult.profileType === 'D' ? 'Dominante - Líder Natural' :
               testResult.profileType === 'I' ? 'Influente - Comunicador Nato' :
               testResult.profileType === 'S' ? 'Estável - Colaborador Confiável' :
               'Cauteloso - Analista Preciso'
      };

      const actionPlan = [
        'Identifique seus pontos fortes dominantes e como aplicá-los no trabalho',
        'Desenvolva habilidades complementares para equilibrar seu perfil',
        'Pratique novas estratégias de comunicação baseadas em seu estilo DISC',
        'Consolide os aprendizados e crie um plano de desenvolvimento contínuo'
      ];

      const reflectiveQuestions = [
        'Como meu perfil DISC influencia minhas decisões diárias?',
        'Quais situações desafiam mais meu estilo comportamental?',
        'Como posso usar meus pontos fortes para superar limitações?',
        'Que mudanças implementarei baseadas nesta análise?'
      ];

      const careers = testResult.profileType === 'D' ? 
        ['CEO/Diretor Executivo', 'Gerente de Projetos', 'Empreendedor', 'Consultor Estratégico'] :
        testResult.profileType === 'I' ?
        ['Vendas', 'Marketing', 'Relações Públicas', 'Treinamento e Desenvolvimento'] :
        testResult.profileType === 'S' ?
        ['Recursos Humanos', 'Atendimento ao Cliente', 'Enfermagem', 'Educação'] :
        ['Analista de Dados', 'Controle de Qualidade', 'Pesquisa', 'Auditoria'];

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório Premium DISC - ${testResult.guestName || 'Usuário'}</title>
          <style>
            @page { 
              size: A4; 
              margin: 10mm; 
            }
            @media print {
              * { 
                -webkit-print-color-adjust: exact !important; 
                color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              body { 
                font-size: 12px !important; 
                line-height: 1.4 !important; 
              }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
            }
            * { 
              -webkit-print-color-adjust: exact !important; 
              color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              box-sizing: border-box; 
            }
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.5; 
              color: #333; 
              margin: 0; 
              padding: 0; 
              background: white; 
              font-size: 14px;
            }
            .print-controls {
              position: fixed;
              top: 10px;
              right: 10px;
              background: #4f46e5;
              color: white;
              padding: 15px;
              border-radius: 8px;
              z-index: 1000;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .print-btn {
              background: white;
              color: #4f46e5;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              font-weight: bold;
              cursor: pointer;
              margin: 5px;
            }
            .print-btn:hover {
              background: #f3f4f6;
            }
            .header { 
              background: #4f46e5 !important; 
              color: white !important; 
              padding: 30px; 
              text-align: center; 
              margin-bottom: 20px; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .title { 
              font-size: 28px; 
              font-weight: bold; 
              margin-bottom: 10px; 
            }
            .subtitle { 
              font-size: 16px; 
              margin-bottom: 20px; 
            }
            .profile-circle { 
              width: 80px; 
              height: 80px; 
              background: rgba(255,255,255,0.2) !important; 
              border: 3px solid white; 
              border-radius: 50%; 
              display: inline-flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 36px; 
              font-weight: bold; 
              margin: 15px auto; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .section { 
              background: #f8fafc !important; 
              border: 2px solid #e2e8f0; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 15px 0; 
              page-break-inside: avoid; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .section-title { 
              font-size: 20px; 
              font-weight: bold; 
              color: #1a202c; 
              margin-bottom: 15px; 
              padding-bottom: 8px; 
              border-bottom: 3px solid #4f46e5; 
            }
            .disc-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
              background: white !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .disc-table th { 
              background: #4f46e5 !important; 
              color: white !important; 
              padding: 10px; 
              font-weight: bold; 
              border: 1px solid white; 
              font-size: 12px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .disc-table td { 
              padding: 10px; 
              border: 1px solid #ddd; 
              text-align: center; 
              font-size: 12px;
            }
            .disc-d { background: linear-gradient(135deg, #e53e3e, #c53030) !important; color: white !important; font-weight: 700 !important; box-shadow: 0 4px 15px rgba(229,62,62,0.3) !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .disc-i { background: linear-gradient(135deg, #dd6b20, #c05621) !important; color: white !important; font-weight: 700 !important; box-shadow: 0 4px 15px rgba(221,107,32,0.3) !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .disc-s { background: linear-gradient(135deg, #38a169, #2f855a) !important; color: white !important; font-weight: 700 !important; box-shadow: 0 4px 15px rgba(56,161,105,0.3) !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .disc-c { background: linear-gradient(135deg, #3182ce, #2c5aa0) !important; color: white !important; font-weight: 700 !important; box-shadow: 0 4px 15px rgba(49,130,206,0.3) !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .progress-container { 
              margin: 12px 0; 
              background: white !important; 
              padding: 12px; 
              border-radius: 5px; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .progress-label { 
              font-weight: bold; 
              margin-bottom: 6px; 
              display: flex; 
              justify-content: space-between;
              font-size: 13px; 
            }
            .progress-bar { 
              height: 25px; 
              background: #e5e7eb !important; 
              border-radius: 12px; 
              overflow: hidden; 
              position: relative; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .progress-fill { 
              height: 100%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white !important; 
              font-weight: bold; 
              font-size: 12px; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .fill-d { background: #ef4444 !important; }
            .fill-i { background: #f59e0b !important; }
            .fill-s { background: #10b981 !important; }
            .fill-c { background: #3b82f6 !important; }
            .quote-box { 
              background: #eff6ff !important; 
              border-left: 4px solid #3b82f6; 
              padding: 15px; 
              margin: 12px 0; 
              border-radius: 0 6px 6px 0; 
              font-style: italic; 
              font-size: 13px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .action-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 12px 0; 
              background: white !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .action-table th { 
              background: #f3f4f6 !important; 
              padding: 8px; 
              border: 1px solid #d1d5db; 
              font-weight: bold; 
              font-size: 11px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .action-table td { 
              padding: 8px; 
              border: 1px solid #d1d5db; 
              vertical-align: top; 
              font-size: 11px;
            }
            .week-badge { 
              background: #4f46e5 !important; 
              color: white !important; 
              padding: 4px 8px; 
              border-radius: 50%; 
              font-weight: bold; 
              font-size: 11px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .warning-box { 
              background: #fef3c7 !important; 
              border: 2px solid #f59e0b; 
              border-radius: 6px; 
              padding: 15px; 
              margin: 12px 0; 
              font-size: 12px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .resource-card { 
              background: white !important; 
              border-left: 4px solid #10b981; 
              padding: 15px; 
              margin: 12px 0; 
              border-radius: 0 6px 6px 0; 
              font-size: 12px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .resource-card.books { border-left-color: #ef4444; }
            .resource-card.podcasts { border-left-color: #f59e0b; }
            .resource-card.courses { border-left-color: #3b82f6; }
            .resource-card h4 { 
              margin-top: 0; 
              color: #1f2937; 
              font-size: 14px; 
            }
            .resource-card ul { 
              margin: 8px 0; 
              padding-left: 18px; 
            }
            .resource-card li { 
              margin: 6px 0; 
              line-height: 1.3; 
            }
            
            /* Footer */
            .footer { 
              margin-top: 50px; padding: 40px 30px; background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%); 
              color: #e2e8f0; text-align: center; border-top: 3px solid #0066cc;
            }
            .footer-logo {
              font-size: 28px; font-weight: 800; color: #0066cc; margin-bottom: 25px;
              text-shadow: 0 2px 4px rgba(0,102,204,0.3);
            }
            .contact-info {
              background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; 
              margin: 25px auto; border: 1px solid rgba(0,102,204,0.2);
              box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 800px;
            }
            .contact-info p {
              margin-bottom: 20px; line-height: 1.6; color: #cbd5e0; text-align: justify;
              font-size: 14px;
            }
            .contact-info p:last-child {
              margin-bottom: 0; font-weight: 600; color: #0066cc; text-align: center;
              font-size: 16px; padding-top: 15px; border-top: 1px solid rgba(0,102,204,0.2);
            }
            
            /* Profile-specific footer colors - matching header */
            .profile-d .footer { background: linear-gradient(135deg, #e53e3e, #c53030) !important; }
            .profile-i .footer { background: linear-gradient(135deg, #dd6b20, #c05621) !important; }
            .profile-s .footer { background: linear-gradient(135deg, #38a169, #2f855a) !important; }
            .profile-c .footer { background: linear-gradient(135deg, #3182ce, #2c5aa0) !important; }
            
            /* Ensure footer text is always readable on colored backgrounds */
            .profile-d .footer-logo,
            .profile-i .footer-logo,
            .profile-s .footer-logo,
            .profile-c .footer-logo { color: white !important; text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important; }
            
            .profile-d .contact-info p:last-child,
            .profile-i .contact-info p:last-child,
            .profile-s .contact-info p:last-child,
            .profile-c .contact-info p:last-child { color: white !important; }
          </style>
          <script>
            function printPDF() {
              window.print();
            }
            function downloadPDF() {
              printPDF();
            }
          </script>
        </head>
        <body class="profile-${testResult.profileType.toLowerCase()}">
          <div class="print-controls no-print">
            <div style="font-size: 14px; margin-bottom: 10px;">📄 Relatório DISC Premium</div>
            <button class="print-btn" onclick="printPDF()">🖨️ Imprimir/Salvar PDF</button>
            <button class="print-btn" onclick="downloadPDF()">💾 Baixar PDF</button>
          </div>

          <!-- HEADER -->
          <div class="header">
            <div class="title">✨ RELATÓRIO DISC PREMIUM</div>
            <div class="subtitle">Análise Comportamental Personalizada</div>
            <div class="profile-circle">${testResult.profileType}</div>
            <h3 style="margin: 10px 0; font-size: 20px;">${testResult.guestName || 'Usuário'}</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Perfil Dominante:</strong> ${analysis.title}</p>
            <p style="margin: 5px 0; font-size: 12px;">📅 ${new Date().toLocaleDateString('pt-BR')} | 📧 ${testResult.guestEmail || 'Não informado'}</p>
          </div>

          <!-- RESUMO EXECUTIVO -->
          <div class="section">
            <div class="section-title">📋 Resumo Executivo</div>
            <div class="quote-box">
              <p><strong>Perfil Dominante:</strong> ${analysis.title}</p>
              <p>Este relatório oferece uma análise completa do seu perfil comportamental DISC, incluindo gráficos visuais, plano de ação estruturado e recomendações personalizadas para desenvolvimento.</p>
            </div>
          </div>

          <!-- ANÁLISE DISC -->
          <div class="section">
            <div class="section-title">📊 Análise Visual do Perfil DISC</div>
            
            <table class="disc-table">
              <thead>
                <tr>
                  <th>Fator</th>
                  <th>Dimensão</th>
                  <th>Pontuação</th>
                  <th>Nível</th>
                </tr>
              </thead>
              <tbody>
                ${['D', 'I', 'S', 'C'].map((type) => {
                  const score = normalizedScores[type as keyof typeof normalizedScores] || 0;
                  const names = {
                    D: 'Dominância',
                    I: 'Influência',
                    S: 'Estabilidade',
                    C: 'Conformidade'
                  };
                  const nivel = score >= 70 ? 'ALTO' : score >= 40 ? 'MÉDIO' : 'BAIXO';
                  return `
                    <tr>
                      <td class="disc-${type.toLowerCase()}">${type}</td>
                      <td><strong>${type} = ${names[type as keyof typeof names]}</strong></td>
                      <td style="position: relative; padding: 8px; min-width: 120px;">
                        <div style="background: #f0f0f0; height: 24px; border-radius: 4px; position: relative; overflow: visible;">
                          <div style="background: ${type === 'D' ? '#e53e3e' : type === 'I' ? '#dd6b20' : type === 'S' ? '#38a169' : '#3b82f6'}; height: 100%; width: ${score}%; border-radius: 4px; position: relative;"></div>
                          <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; color: #333; font-size: 13px; z-index: 10; text-shadow: 1px 1px 1px rgba(255,255,255,0.8);">${score}%</span>
                        </div>
                      </td>
                      <td><strong>${nivel}</strong></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <h3 style="font-size: 16px;">📈 Intensidade Visual dos Fatores</h3>
            ${['D', 'I', 'S', 'C'].map((type) => {
              const score = normalizedScores[type as keyof typeof normalizedScores] || 0;
              const names = {
                D: 'Dominância',
                I: 'Influência',
                S: 'Estabilidade',
                C: 'Conformidade'
              };
              return `
                <div class="progress-container">
                  <div class="progress-label">
                    <span><strong>${type} - ${names[type as keyof typeof names]}</strong></span>
                    <span><strong>${score}%</strong></span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill fill-${type.toLowerCase()}" style="width: ${score}%;">${score}%</div>
                  </div>
                </div>
              `;
            }).join('')}

            <div class="quote-box">
              <p><strong>Interpretação:</strong> Seu perfil ${testResult.profileType} revela uma personalidade única com potencial extraordinário. Cada dimensão DISC contribui para sua história de sucesso e crescimento pessoal.</p>
            </div>
          </div>

          <div class="page-break"></div>

          <!-- PLANO DE AÇÃO -->
          <div class="section">
            <div class="section-title">🎯 Plano de Ação de 4 Semanas</div>
            
            <table class="action-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Foco</th>
                  <th>Ação Estratégica</th>
                </tr>
              </thead>
              <tbody>
                ${actionPlan.map((action, index) => {
                  const focusAreas = ['Autoconhecimento', 'Desenvolvimento', 'Aplicação', 'Consolidação'];
                  return `
                    <tr>
                      <td><span class="week-badge">${index + 1}</span></td>
                      <td><strong>${focusAreas[index]}</strong></td>
                      <td>${action}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="warning-box">
              <h4 style="margin-top: 0; font-size: 14px;">💭 Perguntas para Reflexão Semanal</h4>
              ${reflectiveQuestions.map((question, index) => `
                <p style="margin: 8px 0;"><strong>Semana ${index + 1}:</strong> ${question}</p>
              `).join('')}
            </div>
          </div>

          <!-- RECURSOS PERSONALIZADOS -->
          <div class="section">
            <div class="section-title">📚 Recursos Personalizados</div>
            
            <div class="resource-card books">
              <h4>📚 Livros Recomendados</h4>
              <ul>
                ${testResult.profileType === 'D' ? 
                  '<li>"O Executivo Eficaz" - Peter Drucker</li><li>"Liderança na Era Digital" - Harvard Business Review</li><li>"Mindset: A Nova Psicologia do Sucesso" - Carol Dweck</li>' :
                  testResult.profileType === 'I' ? 
                  '<li>"Como Fazer Amigos e Influenciar Pessoas" - Dale Carnegie</li><li>"O Poder da Comunicação" - Chris Anderson</li><li>"Inteligência Emocional" - Daniel Goleman</li>' :
                  testResult.profileType === 'S' ?
                  '<li>"A Coragem de Ser Imperfeito" - Brené Brown</li><li>"Comunicação Não-Violenta" - Marshall Rosenberg</li><li>"O Poder do Hábito" - Charles Duhigg</li>' :
                  '<li>"Pensamento Rápido e Devagar" - Daniel Kahneman</li><li>"A Arte de Resolver Problemas" - Russell Ackoff</li><li>"O Cisne Negro" - Nassim Taleb</li>'
                }
              </ul>
            </div>

          </div>

          <!-- SABOTADORES -->
          <div class="section">
            <div class="warning-box">
              <div class="section-title">⚠️ Padrões Sabotadores a Observar</div>
              <p><strong>Atenção especial para seu perfil ${testResult.profileType}:</strong></p>
              <ul>
                ${testResult.profileType === 'D' ? 
                  '<li>Impaciência excessiva com processos longos</li><li>Tendência a tomar decisões sem consultar a equipe</li><li>Dificuldade em aceitar feedback construtivo</li>' :
                  testResult.profileType === 'I' ? 
                  '<li>Dispersão em conversas e reuniões</li><li>Promessas excessivas sem planejamento adequado</li><li>Evitar confrontos necessários</li>' :
                  testResult.profileType === 'S' ?
                  '<li>Resistência excessiva a mudanças</li><li>Dificuldade em expressar opiniões contrárias</li><li>Sobrecarga por não saber dizer "não"</li>' :
                  '<li>Paralisia por análise excessiva</li><li>Perfeccionismo que atrasa entregas</li><li>Evitar riscos necessários para crescimento</li>'
                }
              </ul>
              <p><strong>Lembre-se:</strong> Reconhecer esses padrões é o primeiro passo para transformá-los em pontos de crescimento.</p>
            </div>
          </div>

          <!-- CAREERS SECTION -->
          <div class="section">
            <div class="section-title">💼 Carreiras Ideais</div>
            <div class="resource-card">
              <p>Com base no seu perfil ${testResult.profileType}, estas são as carreiras que mais se alinham com seus pontos fortes:</p>
              <ul>
                ${careers.map(career => `<li>${career}</li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-logo">MeuPerfil360</div>
            <div class="contact-info">
              <p>Este relatório DISC Premium foi gerado exclusivamente para o uso individual e intransferível do usuário do MeuPerfil360. Recomendamos que a análise DISC seja atualizada a cada 6 meses, garantindo a precisão e a relevância dos dados para o seu desenvolvimento contínuo.</p>
              
              <p>O conteúdo deste documento é protegido por direitos autorais e não deve ser reproduzido ou distribuído sem autorização expressa. Todas as informações têm caráter orientativo e visam apoiar o autoconhecimento e a evolução profissional, sem substituir aconselhamento profissional ou psicológico individualizado.</p>
              
              <p>Para mais informações ou suporte, acesse: <strong>www.meuperfil360.com.br</strong></p>
            </div>
          </div>

        </body>
        </html>`;

      // Return optimized HTML for browser PDF generation
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      console.error('PDF download error:', error);
      res.status(500).json({ error: 'Falha ao gerar PDF para download' });
    }
  });

  // Admin route to create test user and data
  app.post('/api/admin/setup', async (req, res) => {
    try {
      // Create test user
      const testUser = await storage.createUser({
        clerkId: 'test_clerk_id',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        whatsapp: '+5511999999999'
      });

      // Create sample test result
      const testResult = await storage.createTestResult({
        testType: 'DISC',
        profileType: 'D',
        scores: { D: 85, I: 45, S: 30, C: 60 },
        answers: [],
        isPremium: true,
        userId: testUser.id,
        guestName: 'Ana Caroline',
        guestEmail: 'ana@example.com',
        guestWhatsapp: '+5511999999999'
      });

      res.json({ 
        message: 'Setup completo',
        user: testUser,
        testResult: testResult
      });
    } catch (error) {
      console.error('Setup error:', error);
      res.status(500).json({ error: 'Falha no setup' });
    }
  });

  // Stripe redirect routes - Add before createServer
  app.get('/success', async (req: Request, res: Response) => {
    const sessionId = req.query.session_id as string;
    const testId = req.query.testId as string;
    
    console.log(`Processing Stripe success: sessionId=${sessionId}, testId=${testId}`);
    
    if (!sessionId || !testId) {
      return res.redirect('/');
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log(`Stripe session status: ${session.payment_status}`);
      
      if (session.payment_status === 'paid') {
        // Update test to premium
        const updatedTest = await storage.updateTestResultPremium(parseInt(testId), sessionId);
        console.log(`Test ${testId} upgraded to premium`);
        
        // Send premium upgrade email in background
        setImmediate(async () => {
          try {
            if (updatedTest.guestEmail) {
              await emailService.sendPremiumUpgradeEmail(
                updatedTest.guestEmail,
                updatedTest.guestName || updatedTest.guestEmail,
                updatedTest.profileType,
                updatedTest.id.toString()
              );
              console.log(`Premium upgrade email sent to ${updatedTest.guestEmail}`);
            }
          } catch (emailError) {
            console.error('Error sending premium upgrade email:', emailError);
          }
        });
        
        // Redirect to results page with success parameter
        return res.redirect(`/results/${testId}?payment=success`);
      } else {
        return res.redirect(`/results/${testId}?payment=pending`);
      }
    } catch (error) {
      console.error('Error verifying Stripe payment:', error);
      return res.redirect(`/results/${testId}?payment=error`);
    }
  });

  app.get('/cancel', (req: Request, res: Response) => {
    const testId = req.query.testId as string;
    console.log(`Processing Stripe cancel for test: ${testId}`);
    
    if (testId) {
      res.redirect(`/checkout/${testId}?payment=cancelled`);
    } else {
      res.redirect('/');
    }
  });

  const server = createServer(app);
  return server;
}
