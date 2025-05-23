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

      // Criar conteúdo HTML completo para conversão em PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório Completo Perfil360 - ${testResult.guestName}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px;
              line-height: 1.6; 
              color: #333;
              background: #f8fafc;
            }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 50px; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white; }
            .profile-badge { 
              display: inline-block; 
              width: 100px; height: 100px; 
              border-radius: 50%; 
              background: rgba(255,255,255,0.2); 
              color: white; 
              font-size: 48px; 
              font-weight: bold; 
              line-height: 100px; 
              text-align: center; 
              margin: 20px 0; 
              border: 3px solid rgba(255,255,255,0.3);
            }
            .section { 
              margin: 40px 0; 
              padding: 30px; 
              background: #f9fafb; 
              border-radius: 10px; 
              border-left: 5px solid #667eea;
            }
            .section h2 { 
              color: #1e40af; 
              margin-bottom: 20px; 
              font-size: 24px;
              border-bottom: 2px solid #e5e7eb; 
              padding-bottom: 10px; 
            }
            .scores-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 20px; 
              margin: 30px 0; 
            }
            .score-card { 
              background: white; 
              padding: 20px; 
              border-radius: 10px; 
              text-align: center; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .score-circle { 
              width: 80px; 
              height: 80px; 
              border-radius: 50%; 
              margin: 0 auto 15px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 24px; 
              font-weight: bold; 
              color: white;
            }
            .score-d { background: linear-gradient(135deg, #ef4444, #dc2626); }
            .score-i { background: linear-gradient(135deg, #eab308, #d97706); }
            .score-s { background: linear-gradient(135deg, #22c55e, #16a34a); }
            .score-c { background: linear-gradient(135deg, #3b82f6, #2563eb); }
            .radar-chart { 
              width: 300px; 
              height: 300px; 
              margin: 30px auto; 
              border: 2px solid #e5e7eb; 
              border-radius: 50%; 
              position: relative;
              background: linear-gradient(45deg, #f0f9ff 25%, transparent 25%), 
                          linear-gradient(-45deg, #f0f9ff 25%, transparent 25%);
            }
            .career-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 15px; 
              margin: 20px 0; 
            }
            .career-item { 
              background: white; 
              padding: 15px; 
              border-radius: 8px; 
              border-left: 4px solid #667eea; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .strength-weakness { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              margin: 20px 0; 
            }
            .strength-card, .weakness-card { 
              background: white; 
              padding: 20px; 
              border-radius: 10px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .strength-card { border-left: 5px solid #22c55e; }
            .weakness-card { border-left: 5px solid #f59e0b; }
            ul { padding-left: 0; list-style: none; }
            li { 
              margin: 12px 0; 
              padding: 8px 15px; 
              background: rgba(103, 126, 234, 0.1); 
              border-radius: 5px; 
              position: relative;
              padding-left: 30px;
            }
            li:before { 
              content: "✓"; 
              position: absolute; 
              left: 10px; 
              color: #667eea; 
              font-weight: bold;
            }
            .action-plan { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 30px; 
              border-radius: 10px; 
              margin: 30px 0;
            }
            .action-plan h3 { color: white; margin-bottom: 20px; }
            .action-plan li { background: rgba(255,255,255,0.1); color: white; }
            .action-plan li:before { color: #fbbf24; }
            .footer { 
              margin-top: 50px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              padding: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .summary-box {
              background: linear-gradient(135deg, #fef3c7, #fde68a);
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              border-left: 5px solid #f59e0b;
            }
            .percentile-info {
              background: #eff6ff;
              padding: 15px;
              border-radius: 8px;
              margin: 10px 0;
              border: 1px solid #dbeafe;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- 1. CAPA & VISÃO GERAL -->
            <div class="header">
              <h1>Relatório Completo Perfil360</h1>
              <h2>Análise DISC & Comportamental</h2>
              <div class="profile-badge">${testResult.profileType}</div>
              <h3>${testResult.guestName}</h3>
              <p>Data da Avaliação: ${new Date(testResult.createdAt).toLocaleDateString('pt-BR')}</p>
              <p>ID da Avaliação: ${testResult.id}</p>
            </div>

            <div class="summary-box">
              <h3>Resumo Executivo</h3>
              <p><strong>Perfil Dominante:</strong> ${analysis.title}</p>
              <p>Este relatório oferece uma análise completa do seu perfil comportamental baseado na metodologia DISC, 
              fornecendo insights profundos para desenvolvimento pessoal e profissional.</p>
            </div>

            <!-- 2. PERFIL DISC - GRÁFICOS & INTERPRETAÇÕES -->
            <div class="section">
              <h2>🎯 Perfil DISC - Análise Detalhada</h2>
              
              <div class="scores-grid">
                ${Object.entries(testResult.scores).map(([type, score]) => `
                  <div class="score-card">
                    <div class="score-circle score-${type.toLowerCase()}">${score}%</div>
                    <h4>${type === 'D' ? 'Dominância' : type === 'I' ? 'Influência' : type === 'S' ? 'Estabilidade' : 'Conformidade'}</h4>
                    <div class="percentile-info">
                      <small>Percentil: ${Math.round((score / 100) * 95 + 5)}º</small>
                    </div>
                  </div>
                `).join('')}
              </div>

              <h3>Interpretação por Dimensão</h3>
              
              <h4>🔴 Dominância (D): ${testResult.scores.D}%</h4>
              <p>Você tende a ser ${testResult.scores.D > 70 ? 'altamente assertivo e orientado para resultados' : 
                 testResult.scores.D > 40 ? 'moderadamente assertivo, equilibrando decisão com colaboração' : 
                 'mais colaborativo, preferindo consenso antes de tomar decisões'}.</p>

              <h4>🟡 Influência (I): ${testResult.scores.I}%</h4>
              <p>No trabalho, você se comporta de forma ${testResult.scores.I > 70 ? 'altamente comunicativa e entusiasmada' : 
                 testResult.scores.I > 40 ? 'sociável e persuasiva quando necessário' : 
                 'mais reservada, preferindo comunicação direta e objetiva'}.</p>

              <h4>🟢 Estabilidade (S): ${testResult.scores.S}%</h4>
              <p>Sua abordagem ao trabalho é ${testResult.scores.S > 70 ? 'extremamente consistente e confiável' : 
                 testResult.scores.S > 40 ? 'equilibrada entre estabilidade e adaptabilidade' : 
                 'altamente adaptável, lidando bem com mudanças rápidas'}.</p>

              <h4>🔵 Conformidade (C): ${testResult.scores.C}%</h4>
              <p>Você demonstra ${testResult.scores.C > 70 ? 'alta atenção aos detalhes e procedimentos' : 
                 testResult.scores.C > 40 ? 'equilíbrio entre qualidade e eficiência' : 
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
              ${Object.entries(testResult.scores).map(([type, score]) => `
                <div class="percentile-info">
                  <strong>${type}:</strong> Você pontuou mais alto que ${Math.round((score / 100) * 95 + 5)}% das pessoas avaliadas
                </div>
              `).join('')}
            </div>

            <!-- 5. SUGESTÕES DE CARREIRAS -->
            <div class="section">
              <h2>💼 Carreiras & Funções Ideais</h2>
              <p>Based on your DISC profile, here are career suggestions that align with your behavioral strengths:</p>
              <div class="career-grid">
                ${careers.map(career => `
                  <div class="career-item">
                    <strong>${career}</strong>
                  </div>
                `).join('')}
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

            <!-- 7. PLANO DE AÇÃO PERSONALIZADO -->
            <div class="action-plan">
              <h2>🎯 Plano de Ação Personalizado</h2>
              <h3>Próximos 30 dias:</h3>
              <ul>
                ${actionPlan.map(action => `<li>${action}</li>`).join('')}
              </ul>
              
              <h3>Recursos Recomendados:</h3>
              <ul>
                <li>📚 Livro: "The DISC Behavioral Model" - Tony Alessandra</li>
                <li>🎧 Podcast: "Leadership in Action" - episódios sobre perfil ${testResult.profileType}</li>
                <li>💻 Curso: "Desenvolvimento de Competências Comportamentais"</li>
              </ul>
            </div>

            <!-- 8. METODOLOGIA & DADOS BRUTOS -->
            <div class="section">
              <h2>📋 Apêndice: Metodologia & Dados</h2>
              <p><strong>Metodologia:</strong> Este relatório foi gerado utilizando a metodologia DISC validada cientificamente, 
              baseada em ${Object.keys(testResult.answers || {}).length || 24} questões comportamentais.</p>
              
              <p><strong>Scores Brutos:</strong></p>
              <ul>
                ${Object.entries(testResult.scores).map(([type, score]) => 
                  `<li>${type}: ${score} pontos (${Math.round((score / 100) * 95 + 5)}º percentil)</li>`
                ).join('')}
              </ul>
              
              <p><strong>Data de Aplicação:</strong> ${new Date(testResult.createdAt).toLocaleString('pt-BR')}</p>
              <p><strong>Validade:</strong> Este relatório mantém sua validade por 12 meses a partir da data de aplicação.</p>
            </div>

            <div class="footer">
              <p><strong>MeuPerfil360 - Análise Comportamental Profissional</strong></p>
              <p>Este relatório é confidencial e deve ser utilizado exclusivamente para desenvolvimento pessoal e profissional.</p>
              <p>Para mais informações ou suporte, entre em contato através do nosso site.</p>
            </div>
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
