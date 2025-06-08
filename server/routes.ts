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

      const careers = getCareerSuggestions(testResult.profileType, testResult.scores);
      const actionPlan = getActionPlan(testResult.profileType);
      
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

      // Criar conteúdo HTML otimizado para conversão em PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório Premium DISC - ${testResult.guestName || 'Usuário'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
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
        <body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; background: #ffffff;">
          
          <!-- HEADER -->
          <div style="background: #667eea; color: white; text-align: center; padding: 30px; margin-bottom: 30px; border-radius: 10px;">
            <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">🌟 RELATÓRIO DISC PREMIUM</h1>
            <h2 style="margin: 0 0 20px 0; font-size: 16px; font-weight: normal;">Análise Comportamental Personalizada</h2>
            
            <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; border: 2px solid white; margin: 20px auto; font-size: 36px; font-weight: bold; line-height: 76px; color: white; display: inline-block;">
              ${testResult.profileType}
            </div>
            
            <h3 style="margin: 15px 0 10px 0; font-size: 20px; color: #ffffff;">${testResult.guestName || 'Usuário'}</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Perfil Dominante:</strong> ${analysis.title}</p>
            <p style="margin: 5px 0; font-size: 12px;">📅 ${new Date().toLocaleDateString('pt-BR')} | 📧 ${testResult.guestEmail || 'Não informado'}</p>
          </div>

          <!-- CONTENT -->
          <div style="max-width: 100%; background: white; padding: 0;">

            <!-- RESUMO EXECUTIVO -->
            <div style="background: #fef3c7; padding: 20px; margin: 30px 0; border-radius: 8px; border-left: 5px solid #f59e0b;">
              <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 20px;">Resumo Executivo</h3>
              <p style="margin: 10px 0; color: #374151;"><strong>Perfil Dominante:</strong> ${analysis.title}</p>
              <p style="margin: 10px 0; color: #374151;">Este relatório oferece uma análise completa do seu perfil comportamental baseado na metodologia DISC, 
              fornecendo insights profundos para desenvolvimento pessoal e profissional.</p>
            </div>

            <!-- PERFIL DISC - GRÁFICOS -->
            <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 5px solid #667eea; page-break-inside: avoid;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                📊 Análise Visual do Perfil DISC
              </h2>
              
              <!-- Pontuações DISC Simples -->
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #667eea; color: white;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Fator</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Nome</th>
                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Pontuação</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  ${['D', 'I', 'S', 'C'].map((type) => {
                    const score = normalizedScores[type] || 0;
                    const colors = {
                      D: '#ef4444',
                      I: '#eab308',
                      S: '#22c55e',
                      C: '#3b82f6'
                    };
                    const names = {
                      D: 'Dominância',
                      I: 'Influência',
                      S: 'Estabilidade',
                      C: 'Conformidade'
                    };
                    const nivel = score >= 70 ? 'Alto' : score >= 40 ? 'Médio' : 'Baixo';
                    return `
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px; border: 1px solid #ddd; background: ${colors[type as keyof typeof colors]}; color: white; font-weight: bold; text-align: center;">${type}</td>
                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600;">${names[type as keyof typeof names]}</td>
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px; font-weight: bold; color: ${colors[type as keyof typeof colors]};">${score}%</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${nivel}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>

              <!-- Barras Simples -->
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Intensidade dos Fatores</h3>
                ${['D', 'I', 'S', 'C'].map((type) => {
                  const score = normalizedScores[type] || 0;
                  const colors = {
                    D: '#ef4444',
                    I: '#eab308',
                    S: '#22c55e',
                    C: '#3b82f6'
                  };
                  const names = {
                    D: 'Dominância',
                    I: 'Influência',
                    S: 'Estabilidade',
                    C: 'Conformidade'
                  };
                  return `
                    <div style="margin: 10px 0; padding: 8px; background: white; border-radius: 5px;">
                      <div style="display: flex; align-items: center; margin-bottom: 5px;">
                        <span style="width: 20px; height: 20px; background: ${colors[type as keyof typeof colors]}; color: white; text-align: center; line-height: 20px; font-weight: bold; margin-right: 10px; border-radius: 3px;">${type}</span>
                        <span style="font-weight: bold; margin-right: 10px;">${names[type as keyof typeof names]}</span>
                        <span style="font-weight: bold; color: ${colors[type as keyof typeof colors]};">${score}%</span>
                      </div>
                      <div style="width: 100%; height: 20px; background: #f1f5f9; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${score}%; height: 100%; background: ${colors[type as keyof typeof colors]}; border-radius: 10px;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div style="background: #e0e7ff; border-left: 5px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 5px; color: #3730a3;">
                <p style="margin: 0; font-style: italic; font-size: 14px;">
                  "Seu perfil ${testResult.profileType} revela uma personalidade única com potencial extraordinário. Cada dimensão conta uma parte da sua história de sucesso."
                </p>
              </div>

              <h3>Interpretação por Dimensão</h3>
              
              <h4>🔴 Dominância (D): ${(testResult.scores as any).D}%</h4>
              <p>Você tende a ser ${(testResult.scores as any).D > 70 ? 'altamente assertivo e orientado para resultados' : 
                 (testResult.scores as any).D > 40 ? 'moderadamente assertivo, equilibrando decisão com colaboração' : 
                 'mais colaborativo, preferindo consenso antes de tomar decisões'}.</p>

              <h4>🟡 Influência (I): ${(testResult.scores as any).I}%</h4>
              <p>No trabalho, você se comporta de forma ${(testResult.scores as any).I > 70 ? 'altamente comunicativa e entusiasmada' : 
                 (testResult.scores as any).I > 40 ? 'sociável e persuasiva quando necessário' : 
                 'mais reservada, preferindo comunicação direta e objetiva'}.</p>

              <h4>🟢 Estabilidade (S): ${(testResult.scores as any).S}%</h4>
              <p>Sua abordagem ao trabalho é ${(testResult.scores as any).S > 70 ? 'extremamente consistente e confiável' : 
                 (testResult.scores as any).S > 40 ? 'equilibrada entre estabilidade e adaptabilidade' : 
                 'altamente adaptável, lidando bem com mudanças rápidas'}.</p>

              <h4>🔵 Conformidade (C): ${(testResult.scores as any).C}%</h4>
              <p>Você demonstra ${(testResult.scores as any).C > 70 ? 'alta atenção aos detalhes e procedimentos' : 
                 (testResult.scores as any).C > 40 ? 'equilíbrio entre qualidade e eficiência' : 
                 'foco em soluções práticas, menos preocupação com detalhes'}.</p>
            </div>

            <!-- 3. COMPORTAMENTO SOB PRESSÃO -->
            <div class="section">
              <h2>⚡ Perfil de Comportamento sob Pressão</h2>
              <p><strong>Como você age no trabalho:</strong> ${analysis.characteristics[0]}</p>
              <p><strong>Sob pressão você tende a:</strong> ${
                testResult.profileType === 'D' ? 'Tornar-se mais direto e focado em resultados imediatos' :
                testResult.profileType === 'I' ? 'Buscar apoio social e manter o otimismo' :
                testResult.profileType === 'S' ? 'Manter a calma e buscar estabilidade' :
                'Focar em análises detalhadas para reduzir riscos'
              }</p>
              <p><strong>Como você se vê:</strong> Uma pessoa ${
                testResult.profileType === 'D' ? 'determinada e orientada para conquistas' :
                testResult.profileType === 'I' ? 'comunicativa e influente' :
                testResult.profileType === 'S' ? 'confiável e leal' :
                'analítica e precisa'
              }</p>
            </div>

            <!-- 4. COMPARATIVO NORMATIVO -->
            <div class="section">
              <h2>📊 Comparativo Normativo</h2>
              <p>Seus resultados comparados à população de referência:</p>
              ${Object.entries(normalizedScores).map(([type, score]) => `
                <div class="percentile-info">
                  <strong>${type}:</strong> Você pontuou mais alto que ${Math.round((score / 100) * 95 + 5)}% das pessoas avaliadas
                </div>
              `).join('')}
            </div>

            <!-- CARREIRAS -->
            <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 5px solid #667eea; page-break-inside: avoid;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                💼 Carreiras & Funções Ideais
              </h2>
              <p style="margin: 15px 0; color: #374151;">Com base no seu perfil DISC, estas são as carreiras que mais se alinham com seus pontos fortes naturais:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #667eea; color: white;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Área Profissional</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Características</th>
                  </tr>
                </thead>
                <tbody>
                  ${careers.map((career, index) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #1a202c;">${career}</td>
                      <td style="padding: 12px; border: 1px solid #ddd; color: #6b7280;">
                        ${testResult.profileType === 'D' ? 'Ambiente de liderança e tomada de decisões' :
                          testResult.profileType === 'I' ? 'Interação social e comunicação' :
                          testResult.profileType === 'S' ? 'Colaboração e estabilidade' :
                          'Análise e precisão técnica'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="background: #e0e7ff; border-left: 5px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 5px; color: #3730a3;">
                <p style="margin: 0; font-style: italic; font-size: 14px;">
                  "Sua carreira ideal não é apenas sobre o que você pode fazer, mas sobre onde você pode brilhar naturalmente e fazer a diferença."
                </p>
              </div>
            </div>

            <!-- 6. PONTOS FORTES & OPORTUNIDADES -->
            <div class="section">
              <h2>⭐ Pontos Fortes & Oportunidades de Desenvolvimento</h2>
              <div class="strength-weakness">
                <div class="strength-card">
                  <h3>🎯 Pontos Fortes</h3>
                  <ul>
                    ${analysis.strengths.map(strength => `<li>${strength}</li>`).join('')}
                  </ul>
                </div>
                <div class="weakness-card">
                  <h3>🚀 Oportunidades de Desenvolvimento</h3>
                  <ul>
                    ${analysis.development.map(dev => `<li>${dev}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>

            <!-- PLANO DE AÇÃO -->
            <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 5px solid #667eea; page-break-inside: avoid;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                🎯 Plano de Ação de 4 Semanas
              </h2>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #667eea; color: white;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Semana</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Foco</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Ações Específicas</th>
                  </tr>
                </thead>
                <tbody>
                  ${actionPlan.map((action, index) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 12px; border: 1px solid #ddd; background: #667eea; color: white; font-weight: bold; text-align: center;">${index + 1}</td>
                      <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #374151;">
                        ${index === 0 ? 'Autoconhecimento' : 
                          index === 1 ? 'Desenvolvimento' : 
                          index === 2 ? 'Aplicação Prática' : 'Consolidação'}
                      </td>
                      <td style="padding: 12px; border: 1px solid #ddd; color: #6b7280;">${action}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="background: #e0e7ff; border-left: 5px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 5px; color: #3730a3;">
                <p style="margin: 0; font-style: italic; font-size: 14px;">
                  "A transformação acontece um passo de cada vez. Seu plano personalizado é o mapa para alcançar sua melhor versão."
                </p>
              </div>
            </div>

            <!-- RECURSOS RECOMENDADOS -->
            <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 5px solid #667eea; page-break-inside: avoid;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                📚 Recursos Personalizados para seu Perfil ${testResult.profileType}
              </h2>
              
              <!-- Livros -->
              <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 10px 0; color: #059669; font-size: 16px;">📚 Livros Recomendados</h3>
                <ul style="padding-left: 20px; margin: 0; color: #374151;">
                  ${testResult.profileType === 'D' ? 
                    '<li style="margin: 5px 0;">"O Executivo Eficaz" - Peter Drucker</li><li style="margin: 5px 0;">"Liderança na Era Digital" - Harvard Business Review</li><li style="margin: 5px 0;">"Mindset: A Nova Psicologia do Sucesso" - Carol Dweck</li>' :
                    testResult.profileType === 'I' ? 
                    '<li style="margin: 5px 0;">"Como Fazer Amigos e Influenciar Pessoas" - Dale Carnegie</li><li style="margin: 5px 0;">"O Poder da Comunicação" - Chris Anderson</li><li style="margin: 5px 0;">"Inteligência Emocional" - Daniel Goleman</li>' :
                    testResult.profileType === 'S' ?
                    '<li style="margin: 5px 0;">"A Coragem de Ser Imperfeito" - Brené Brown</li><li style="margin: 5px 0;">"Comunicação Não-Violenta" - Marshall Rosenberg</li><li style="margin: 5px 0;">"O Poder do Hábito" - Charles Duhigg</li>' :
                    '<li style="margin: 5px 0;">"Pensamento Rápido e Devagar" - Daniel Kahneman</li><li style="margin: 5px 0;">"A Arte de Resolver Problemas" - Russell Ackoff</li><li style="margin: 5px 0;">"O Cisne Negro" - Nassim Taleb</li>'
                  }
                </ul>
              </div>

              <!-- Podcasts -->
              <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                <h3 style="margin: 0 0 10px 0; color: #7c3aed; font-size: 16px;">🎧 Podcasts Brasileiros</h3>
                <ul style="padding-left: 20px; margin: 0; color: #374151;">
                  <li style="margin: 5px 0;">"Mundo DISC" - Episódios sobre perfil ${testResult.profileType}</li>
                  <li style="margin: 5px 0;">"PodPeople" - Desenvolvimento comportamental</li>
                  <li style="margin: 5px 0;">"Café Brasil" - Carreira e liderança</li>
                  <li style="margin: 5px 0;">"Flow Podcast" - Entrevistas inspiradoras</li>
                </ul>
              </div>

              <!-- Cursos -->
              <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 10px 0; color: #d97706; font-size: 16px;">💻 Cursos e Capacitações</h3>
                <ul style="padding-left: 20px; margin: 0; color: #374151;">
                  <li style="margin: 5px 0;">Fundação Dom Cabral - Liderança DISC</li>
                  <li style="margin: 5px 0;">HSM University - Inteligência Comportamental</li>
                  <li style="margin: 5px 0;">Conquer - Soft Skills para ${testResult.profileType}</li>
                  <li style="margin: 5px 0;">LinkedIn Learning - Perfil DISC na Prática</li>
                </ul>
              </div>
            </div>

            <!-- SABOTADORES INCONSCIENTES -->
            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; page-break-inside: avoid;">
              <h2 style="color: #92400e; font-weight: 700; font-size: 18px; margin: 0 0 15px 0;">
                ⚠️ Padrões Sabotadores a Observar
              </h2>
              <p style="margin: 10px 0; color: #92400e;"><strong>Atenção especial para seu perfil ${testResult.profileType}:</strong></p>
              <ul style="margin: 15px 0; padding-left: 25px; color: #92400e;">
                ${testResult.profileType === 'D' ? 
                  '<li style="margin: 5px 0;">Impaciência excessiva com processos longos</li><li style="margin: 5px 0;">Tendência a tomar decisões sem consultar a equipe</li><li style="margin: 5px 0;">Dificuldade em aceitar feedback construtivo</li><li style="margin: 5px 0;">Pressão excessiva sobre si mesmo e outros</li>' :
                  testResult.profileType === 'I' ? 
                  '<li style="margin: 5px 0;">Dispersão em conversas e reuniões</li><li style="margin: 5px 0;">Promessas excessivas sem planejamento adequado</li><li style="margin: 5px 0;">Evitar confrontos necessários</li><li style="margin: 5px 0;">Superficialidade na análise de problemas</li>' :
                  testResult.profileType === 'S' ?
                  '<li style="margin: 5px 0;">Resistência excessiva a mudanças</li><li style="margin: 5px 0;">Dificuldade em expressar opiniões contrárias</li><li style="margin: 5px 0;">Sobrecarga por não saber dizer "não"</li><li style="margin: 5px 0;">Procrastinação em decisões difíceis</li>' :
                  '<li style="margin: 5px 0;">Paralisia por análise excessiva</li><li style="margin: 5px 0;">Perfeccionismo que atrasa entregas</li><li style="margin: 5px 0;">Evitar riscos necessários para crescimento</li><li style="margin: 5px 0;">Crítica excessiva a ideias novas</li>'
                }
              </ul>
              <p style="margin-top: 15px; font-style: italic; color: #92400e; font-size: 14px;">
                <strong>Lembre-se:</strong> Reconhecer esses padrões é o primeiro passo para transformá-los em pontos de crescimento.
              </p>
            </div>

            <!-- 8. METODOLOGIA & DADOS BRUTOS -->
            <div class="section">
              <h2>📋 Apêndice: Metodologia & Dados</h2>
              <p><strong>Metodologia:</strong> Este relatório foi gerado utilizando a metodologia DISC validada cientificamente, 
              baseada em ${Object.keys(testResult.answers || {}).length || 24} questões comportamentais.</p>
              
              <p><strong>Scores Brutos:</strong></p>
              <ul>
                ${Object.entries(normalizedScores).map(([type, score]) => 
                  `<li>${type}: ${score} pontos (${Math.round((score / 100) * 95 + 5)}º percentil)</li>`
                ).join('')}
              </ul>
              
              <p><strong>Data de Aplicação:</strong> ${testResult.createdAt ? new Date(testResult.createdAt).toLocaleString('pt-BR') : 'Data não disponível'}</p>
              <p><strong>Validade:</strong> Este relatório mantém sua validade por 12 meses a partir da data de aplicação.</p>
            </div>

            <!-- 10. PERGUNTAS REFLEXIVAS -->
            <div class="section">
              <h2><span class="section-icon">🤔</span>Perguntas para Reflexão e Crescimento</h2>
              
              <table class="action-table">
                <thead>
                  <tr>
                    <th>Área de Reflexão</th>
                    <th>Pergunta Orientadora</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Autoconhecimento</strong></td>
                    <td>Como posso usar meus pontos fortes de forma mais estratégica no meu dia a dia?</td>
                  </tr>
                  <tr>
                    <td><strong>Relacionamentos</strong></td>
                    <td>De que forma meu estilo de comunicação impacta meus relacionamentos profissionais?</td>
                  </tr>
                  <tr>
                    <td><strong>Desenvolvimento</strong></td>
                    <td>Qual área de desenvolvimento mencionada no relatório pode gerar maior impacto na minha carreira?</td>
                  </tr>
                  <tr>
                    <td><strong>Liderança</strong></td>
                    <td>Como posso adaptar meu estilo de liderança para ser mais efetivo com diferentes perfis?</td>
                  </tr>
                </tbody>
              </table>

              <div class="quote-box">
                "As perguntas certas são mais valiosas que respostas prontas. Dedique tempo para refletir sobre cada pergunta com honestidade e abertura."
              </div>
            </div>

            <!-- 11. ORIENTAÇÕES IMPORTANTES -->
            <div class="contact-info">
              <h3 style="color: #667eea; margin-bottom: 15px;">📋 Orientações Importantes</h3>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e;">
                  <h4 style="color: #059669; margin: 0 0 10px 0;">🔄 Reavaliação Recomendada</h4>
                  <p style="margin: 0; font-size: 14px;">Recomendamos refazer o teste a cada <strong>6 meses</strong> para acompanhar sua evolução comportamental e ajustar seu plano de desenvolvimento.</p>
                </div>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                  <h4 style="color: #2563eb; margin: 0 0 10px 0;">🔍 Recuperar Seus Resultados</h4>
                  <p style="margin: 0; font-size: 14px;">Acesse nossa plataforma e use a opção <strong>"Recuperar Teste"</strong> com seu email para revisar este relatório a qualquer momento.</p>
                </div>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  <h4 style="color: #d97706; margin: 0 0 10px 0;">📧 Seus Dados</h4>
                  <p style="margin: 0; font-size: 14px;"><strong>Email:</strong> ${testResult.guestEmail || 'Não informado'}<br><strong>ID do Teste:</strong> ${testResult.id}</p>
                </div>
              </div>
            </div>

            </div> <!-- End content -->

            <div class="footer">
              <div class="footer-logo">MeuPerfil360</div>
              <p><strong>Análise Comportamental Profissional DISC</strong></p>
              
              <div style="margin: 20px 0; padding: 20px; background: #2d3748; border-radius: 8px;">
                <h4 style="color: #667eea; margin-bottom: 15px;">Sobre Este Relatório</h4>
                <ul style="text-align: left; max-width: 600px; margin: 0 auto; list-style: none; padding: 0;">
                  <li style="margin: 8px 0; padding: 0; color: #a0aec0;">✓ Baseado na metodologia DISC validada cientificamente</li>
                  <li style="margin: 8px 0; padding: 0; color: #a0aec0;">✓ Relatório confidencial para desenvolvimento pessoal e profissional</li>
                  <li style="margin: 8px 0; padding: 0; color: #a0aec0;">✓ Análise personalizada com recomendações específicas</li>
                  <li style="margin: 8px 0; padding: 0; color: #a0aec0;">✓ Válido por 12 meses a partir da data de aplicação</li>
                </ul>
              </div>

              <div style="border-top: 1px solid #4a5568; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 5px 0; font-size: 12px;">© ${new Date().getFullYear()} MeuPerfil360. Todos os direitos reservados.</p>
                <p style="margin: 5px 0; font-size: 12px;">Este relatório é confidencial e de uso exclusivo do participante.</p>
                <p style="margin: 5px 0; font-size: 12px;">Para suporte técnico ou dúvidas, acesse nossa plataforma online.</p>
              </div>

              <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 8px; color: white;">
                <p style="margin: 0; font-weight: 600;">🌟 Continue sua jornada de desenvolvimento!</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Transforme insights em ações e alcance seu potencial máximo.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Set proper headers for PDF-friendly HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="relatorio-premium-disc-${(testResult.guestName || 'usuario').replace(/\s+/g, '-').toLowerCase()}.html"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Pragma', 'no-cache');
      
      // Send HTML content optimized for PDF conversion
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
      console.log(`Carregando dashboard para usuário ID: ${userId}`);
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`Usuário ${userId} não encontrado`);
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      console.log(`Usuário encontrado: ${user.username} (${user.email})`);
      const testResults = await storage.getTestResultsByUser(userId);
      console.log(`Testes encontrados para usuário ${userId}:`, testResults.length);

      const dashboardData = {
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
      };

      console.log(`Retornando dashboard data:`, {
        userId: dashboardData.user.id,
        testCount: dashboardData.testResults.length
      });

      res.json(dashboardData);
    } catch (error: any) {
      console.error("Erro ao carregar dashboard:", error);
      res.status(500).json({ message: "Erro ao carregar dashboard", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
