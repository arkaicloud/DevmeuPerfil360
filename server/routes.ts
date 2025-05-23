import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { 
  discTestSubmissionSchema, 
  registrationSchema,
  guestTestDataSchema
} from "@shared/schema";
import { calculateDiscProfile } from "../client/src/lib/disc-calculator";
import bcrypt from "bcrypt";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Submit DISC test for guest users
  app.post("/api/test/submit", async (req, res) => {
    try {
      const validatedData = discTestSubmissionSchema.parse(req.body);
      const { guestData, answers } = validatedData;

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

      res.json({
        testResultId: testResult.id,
        profile: discResults,
        isPremium: false,
      });
    } catch (error: any) {
      console.error('Test submission error:', error);
      res.status(400).json({ 
        message: "Erro ao processar teste",
        error: error.message 
      });
    }
  });

  // Get test result
  app.get("/api/test/result/:id", async (req, res) => {
    try {
      const testId = parseInt(req.params.id);
      const testResult = await storage.getTestResult(testId);

      if (!testResult) {
        return res.status(404).json({ message: "Teste não encontrado" });
      }

      res.json({
        id: testResult.id,
        profileType: testResult.profileType,
        scores: testResult.scores,
        isPremium: testResult.isPremium,
        createdAt: testResult.createdAt,
        guestName: testResult.guestName,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao buscar resultado" });
    }
  });
  
  // Find test result by email or WhatsApp
  app.post("/api/test/find", async (req, res) => {
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

  // Upgrade test to premium after successful payment
  app.post("/api/test/upgrade/:testId", async (req, res) => {
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
      
      console.log(`Teste ${testId} atualizado para premium com sucesso`);
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
  
  // Create payment intent for premium upgrade
  app.post("/api/create-payment-intent", async (req, res) => {
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
      const validatedData = registrationSchema.parse(req.body);
      const { confirmPassword, ...userData } = validatedData;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe com este email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password!, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
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

      const user = await storage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Usuário ou senha incorretos" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Usuário ou senha incorretos" });
      }

      console.log(`Login realizado com sucesso para usuário: ${username}`);

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        message: "Login realizado com sucesso",
      });
    } catch (error: any) {
      console.error("Erro no login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Generate PDF report for premium test results
  app.get("/api/test/result/:id/pdf", async (req, res) => {
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
            title: "Perfil Conscencioso (C)",
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

      // Criar conteúdo HTML para conversão em PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório DISC - ${testResult.guestName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .profile-badge { display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: #3b82f6; color: white; font-size: 36px; font-weight: bold; line-height: 80px; text-align: center; margin: 20px 0; }
            .section { margin: 30px 0; }
            .section h2 { color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
            .scores { display: flex; justify-content: space-between; margin: 20px 0; }
            .score-item { text-align: center; flex: 1; }
            .score-bar { width: 100%; height: 20px; background: #e5e7eb; border-radius: 10px; margin: 10px 0; }
            .score-fill { height: 100%; border-radius: 10px; }
            .score-d { background: #ef4444; }
            .score-i { background: #eab308; }
            .score-s { background: #22c55e; }
            .score-c { background: #3b82f6; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Completo DISC</h1>
            <h2>${testResult.guestName}</h2>
            <div class="profile-badge">${testResult.profileType}</div>
            <h3>${analysis.title}</h3>
            <p>Data: ${new Date(testResult.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="section">
            <h2>Pontuações DISC</h2>
            <div class="scores">
              ${Object.entries(testResult.scores).map(([type, score]) => `
                <div class="score-item">
                  <strong>${type}</strong>
                  <div class="score-bar">
                    <div class="score-fill score-${type.toLowerCase()}" style="width: ${score}%"></div>
                  </div>
                  <span>${score}%</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="section">
            <h2>Características Principais</h2>
            <ul>
              ${analysis.characteristics.map(char => `<li>${char}</li>`).join('')}
            </ul>
          </div>

          <div class="section">
            <h2>Pontos Fortes</h2>
            <ul>
              ${analysis.strengths.map(strength => `<li>${strength}</li>`).join('')}
            </ul>
          </div>

          <div class="section">
            <h2>Áreas de Desenvolvimento</h2>
            <ul>
              ${analysis.development.map(dev => `<li>${dev}</li>`).join('')}
            </ul>
          </div>

          <div class="footer">
            <p>Relatório gerado por MeuPerfil360 - Teste DISC Profissional</p>
            <p>Este relatório é baseado em suas respostas e oferece insights para desenvolvimento pessoal e profissional.</p>
          </div>
        </body>
        </html>
      `;

      // Por enquanto, retornamos o HTML. Em produção, você usaria uma biblioteca como puppeteer para gerar PDF real
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-disc-${testResult.guestName}.html"`);
      res.send(htmlContent);

    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      res.status(500).json({ message: "Erro ao gerar relatório PDF" });
    }
  });

  // Get user dashboard data
  app.get("/api/user/:userId/dashboard", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const testResults = await storage.getTestResultsByUser(userId);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        testResults: testResults.map(result => ({
          id: result.id,
          testType: result.testType,
          profileType: result.profileType,
          scores: result.scores,
          isPremium: result.isPremium,
          createdAt: result.createdAt,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao carregar dashboard" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
