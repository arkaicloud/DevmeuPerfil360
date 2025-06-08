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
import puppeteer from "puppeteer";

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

  // Submit DISC test for registered users
  app.post("/api/test/submit-user", async (req, res) => {
    try {
      const { userId, answers } = req.body;

      if (!userId || !answers) {
        return res.status(400).json({ message: "UserId e answers são obrigatórios" });
      }

      console.log(`Criando teste para usuário registrado ID: ${userId}`);

      // Verify user exists
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Calculate DISC profile
      const discResults = calculateDiscProfile(answers);

      // Create test result linked to user
      const testResult = await storage.createTestResult({
        userId: parseInt(userId),
        guestEmail: null,
        guestName: user.username,
        guestWhatsapp: null,
        testType: 'DISC',
        answers: answers,
        scores: discResults.scores,
        profileType: discResults.profileType,
        isPremium: false,
        paymentId: null,
      });

      console.log(`Teste criado com sucesso para usuário ${userId}: ${testResult.id}`);

      res.json({
        testResultId: testResult.id,
        profile: discResults,
        isPremium: false,
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
  app.get("/api/test/result/:id", async (req, res) => {
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

      // Try to find user by username first, then by email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
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

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      await storage.updateUserPassword(user.id, hashedPassword);

      console.log(`Senha atualizada com sucesso para usuário: ${email}`);

      res.json({
        message: "Senha atualizada com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);
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
            @page { size: A4; margin: 15mm; }
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
              border: 2px solid #e2e8f0; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 20px 0; 
              page-break-inside: avoid; 
            }
            .section-title { 
              font-size: 24px; 
              font-weight: bold; 
              color: #1a202c; 
              margin-bottom: 15px; 
              padding-bottom: 10px; 
              border-bottom: 3px solid #4f46e5; 
            }
            .disc-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
              background: white; 
            }
            .disc-table th { 
              background: #4f46e5; 
              color: white; 
              padding: 12px; 
              font-weight: bold; 
              border: 1px solid white; 
            }
            .disc-table td { 
              padding: 12px; 
              border: 1px solid #ddd; 
              text-align: center; 
            }
            .disc-d { background: #ef4444; color: white; font-weight: bold; }
            .disc-i { background: #f59e0b; color: white; font-weight: bold; }
            .disc-s { background: #10b981; color: white; font-weight: bold; }
            .disc-c { background: #3b82f6; color: white; font-weight: bold; }
            .progress-container { 
              margin: 15px 0; 
              background: white; 
              padding: 15px; 
              border-radius: 5px; 
            }
            .progress-label { 
              font-weight: bold; 
              margin-bottom: 8px; 
              display: flex; 
              justify-content: space-between; 
            }
            .progress-bar { 
              background: #f1f5f9; 
              height: 30px; 
              border-radius: 15px; 
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
            .fill-d { background: #ef4444; }
            .fill-i { background: #f59e0b; }
            .fill-s { background: #10b981; }
            .fill-c { background: #3b82f6; }
            .quote-box { 
              background: #e0e7ff; 
              border: 2px solid #6366f1; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 15px 0; 
              font-style: italic; 
              color: #3730a3; 
            }
            .action-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
              background: white; 
            }
            .action-table th { 
              background: #10b981; 
              color: white; 
              padding: 12px; 
              font-weight: bold; 
              border: 1px solid white; 
            }
            .action-table td { 
              padding: 12px; 
              border: 1px solid #ddd; 
              vertical-align: top; 
            }
            .week-badge { 
              background: #f59e0b; 
              color: white; 
              padding: 8px 12px; 
              border-radius: 15px; 
              font-weight: bold; 
              display: inline-block; 
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
              background: white; 
              border: 2px solid #e2e8f0; 
              border-radius: 8px; 
              padding: 15px; 
              margin: 10px 0; 
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
              .fill-d { background: #ef4444 !important; }
              .fill-i { background: #f59e0b !important; }
              .fill-s { background: #10b981 !important; }
              .fill-c { background: #3b82f6 !important; }
              .disc-table th { background: #4f46e5 !important; color: white !important; }
              .action-table th { background: #10b981 !important; color: white !important; }
              .week-badge { background: #f59e0b !important; color: white !important; }
            }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; padding: 0; line-height: 1.6; color: #2d3748; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container { 
              max-width: 900px; margin: 0 auto; background: white; 
              box-shadow: 0 20px 40px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;
            }
            .header { 
              text-align: center; padding: 40px 30px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; position: relative;
            }
            .header::before {
              content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="white" opacity="0.1"/><circle cx="80" cy="40" r="1.5" fill="white" opacity="0.1"/><circle cx="40" cy="80" r="1" fill="white" opacity="0.1"/></svg>');
            }
            .profile-badge { 
              display: inline-block; width: 100px; height: 100px; border-radius: 50%; 
              background: rgba(255,255,255,0.15); color: white; font-size: 42px; 
              font-weight: bold; line-height: 100px; text-align: center; margin: 20px 0;
              border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            .content { padding: 40px; }
            .section { 
              margin: 40px 0; padding: 30px; background: #f8fafc; 
              border-radius: 12px; border: 1px solid #e2e8f0; position: relative;
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
              margin-top: 50px; padding: 30px; background: #1a202c; color: #a0aec0;
              text-align: center; border-radius: 0 0 12px 12px;
            }
            .footer-logo {
              font-size: 24px; font-weight: 700; color: #667eea; margin-bottom: 15px;
            }
            .contact-info {
              background: #2d3748; padding: 20px; border-radius: 8px; margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            
            /* Print Optimizations */
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <!-- HEADER -->
          <div class="header">
            <div class="title">✨ RELATÓRIO DISC PREMIUM</div>
            <div class="subtitle">Análise Comportamental Personalizada</div>
            <div class="profile-circle">${testResult.profileType}</div>
            <h3 style="margin: 15px 0; font-size: 24px;">${testResult.guestName || 'Usuário'}</h3>
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
                      <td><strong style="font-size: 18px;">${score}%</strong></td>
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

            <div class="resource-card podcasts">
              <h4>🎧 Podcasts Brasileiros</h4>
              <ul>
                <li>"Mundo DISC" - Episódios sobre perfil ${testResult.profileType}</li>
                <li>"PodPeople" - Desenvolvimento comportamental</li>
                <li>"Café Brasil" - Carreira e liderança</li>
                <li>"Flow Podcast" - Entrevistas inspiradoras</li>
              </ul>
            </div>

            <div class="resource-card courses">
              <h4>💻 Cursos e Capacitações</h4>
              <ul>
                <li>Fundação Dom Cabral - Liderança DISC</li>
                <li>HSM University - Inteligência Comportamental</li>
                <li>Conquer - Soft Skills para ${testResult.profileType}</li>
                <li>LinkedIn Learning - Perfil DISC na Prática</li>
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

        </body>
        </html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Falha ao gerar PDF' });
      }
    });

  // Download PDF route - converts HTML to actual PDF
  app.get("/api/test/result/:id/download", async (req, res) => {
    try {
      const testId = parseInt(req.params.id);
      const testResult = await storage.getTestResult(testId);

      if (!testResult) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      if (!testResult.isPremium) {
        return res.status(403).json({ error: 'PDF premium requerido' });
      }

      // Generate the HTML content (reuse the same logic from /pdf route)
      const normalizedScores = {
        D: Math.round(((testResult.scores as any).D / 4) * 100),
        I: Math.round(((testResult.scores as any).I / 4) * 100), 
        S: Math.round(((testResult.scores as any).S / 4) * 100),
        C: Math.round(((testResult.scores as any).C / 4) * 100)
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
            @page { size: A4; margin: 15mm; }
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
              background: rgba(255,255,255,0.2) !important; 
              border: 3px solid white; 
              border-radius: 50%; 
              display: inline-flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 48px; 
              font-weight: bold; 
              margin: 20px auto; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .section { 
              background: #f8fafc !important; 
              border: 2px solid #e2e8f0; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 20px 0; 
              page-break-inside: avoid; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .section-title { 
              font-size: 24px; 
              font-weight: bold; 
              color: #1a202c; 
              margin-bottom: 15px; 
              padding-bottom: 10px; 
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
              padding: 12px; 
              font-weight: bold; 
              border: 1px solid white; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .disc-table td { 
              padding: 12px; 
              border: 1px solid #ddd; 
              text-align: center; 
            }
            .disc-d { background: #ef4444 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .disc-i { background: #f59e0b !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .disc-s { background: #10b981 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .disc-c { background: #3b82f6 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .progress-container { 
              margin: 15px 0; 
              background: white !important; 
              padding: 15px; 
              border-radius: 5px; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .progress-label { 
              font-weight: bold; 
              margin-bottom: 8px; 
              display: flex; 
              justify-content: space-between; 
            }
            .progress-bar { 
              height: 30px; 
              background: #e5e7eb !important; 
              border-radius: 15px; 
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
              font-size: 14px; 
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
              padding: 20px; 
              margin: 15px 0; 
              border-radius: 0 8px 8px 0; 
              font-style: italic; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .action-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
              background: white !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .action-table th { 
              background: #f3f4f6 !important; 
              padding: 12px; 
              border: 1px solid #d1d5db; 
              font-weight: bold; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .action-table td { 
              padding: 12px; 
              border: 1px solid #d1d5db; 
              vertical-align: top; 
            }
            .week-badge { 
              background: #4f46e5 !important; 
              color: white !important; 
              padding: 5px 10px; 
              border-radius: 50%; 
              font-weight: bold; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .warning-box { 
              background: #fef3c7 !important; 
              border: 2px solid #f59e0b; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 15px 0; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .resource-card { 
              background: white !important; 
              border-left: 4px solid #10b981; 
              padding: 20px; 
              margin: 15px 0; 
              border-radius: 0 8px 8px 0; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .resource-card.books { border-left-color: #ef4444; }
            .resource-card.podcasts { border-left-color: #f59e0b; }
            .resource-card.courses { border-left-color: #3b82f6; }
            .resource-card h4 { 
              margin-top: 0; 
              color: #1f2937; 
              font-size: 18px; 
            }
            .resource-card ul { 
              margin: 10px 0; 
              padding-left: 20px; 
            }
            .resource-card li { 
              margin: 8px 0; 
              line-height: 1.4; 
            }
          </style>
        </head>
        <body>
          <!-- HEADER -->
          <div class="header">
            <div class="title">✨ RELATÓRIO DISC PREMIUM</div>
            <div class="subtitle">Análise Comportamental Personalizada</div>
            <div class="profile-circle">${testResult.profileType}</div>
            <h3 style="margin: 15px 0; font-size: 24px;">${testResult.guestName || 'Usuário'}</h3>
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
                      <td><strong style="font-size: 18px;">${score}%</strong></td>
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

            <div class="resource-card podcasts">
              <h4>🎧 Podcasts Brasileiros</h4>
              <ul>
                <li>"Mundo DISC" - Episódios sobre perfil ${testResult.profileType}</li>
                <li>"PodPeople" - Desenvolvimento comportamental</li>
                <li>"Café Brasil" - Carreira e liderança</li>
                <li>"Flow Podcast" - Entrevistas inspiradoras</li>
              </ul>
            </div>

            <div class="resource-card courses">
              <h4>💻 Cursos e Capacitações</h4>
              <ul>
                <li>Fundação Dom Cabral - Liderança DISC</li>
                <li>HSM University - Inteligência Comportamental</li>
                <li>Conquer - Soft Skills para ${testResult.profileType}</li>
                <li>LinkedIn Learning - Perfil DISC na Prática</li>
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

        </body>
        </html>`;

      console.log('Launching Puppeteer for PDF generation...');
      
      // Launch Puppeteer and generate PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
        
        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: false,
          margin: {
            top: '15mm',
            right: '15mm',
            bottom: '15mm',
            left: '15mm'
          }
        });
        
        console.log('PDF generated successfully, size:', pdfBuffer.length);

        // Set headers for PDF download
        const fileName = `relatorio-disc-${testResult.guestName?.replace(/[^a-zA-Z0-9]/g, '') || 'usuario'}-${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);
        
      } finally {
        await browser.close();
      }

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
        username: 'admin',
        email: 'admin@test.com',
        whatsapp: '+5511999999999',
        password: await bcrypt.hash('admin123', 10)
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

  const server = createServer(app);
  return server;
}
