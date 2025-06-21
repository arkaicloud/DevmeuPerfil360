import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Trophy, Crown, CheckCircle, Share, UserPlus, FileText, BarChart3, Target, Users, Lightbulb, Zap, Heart, Shield, Cog } from "lucide-react";
import PaymentModal from "@/components/payment-modal";
import RegistrationModal from "@/components/registration-modal";
import { generatePremiumPDF } from "@/lib/pdf-generator";

interface DiscProfile {
  D: number;
  I: number;
  S: number;
  C: number;
}

interface TestResult {
  id: number;
  userId?: number;
  profileType: string;
  scores: DiscProfile;
  isPremium: boolean;
  createdAt: string;
  guestName: string;
  guestEmail?: string;
  guestWhatsapp?: string;
}

interface PricingConfig {
  regularPrice: string;
  promocionalPrice: string;
  isPromotionActive: boolean;
  currentPrice: string;
}

export default function Results() {
  const [, navigate] = useLocation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [userExists, setUserExists] = useState<boolean | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const id = path.split('/').pop();
    if (id) {
      setTestId(id);
    } else {
      navigate("/");
    }

    // Check if user is already logged in
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsUserRegistered(true);
        setGuestName(user.firstName || user.username || user.email);
        return; // Skip guest data check if user is logged in
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("currentUser");
      }
    }

    // Recuperar nome real do usuário do armazenamento local (only for guests)
    const guestData = localStorage.getItem("guestTestData");
    if (guestData) {
      try {
        const parsedData = JSON.parse(guestData);
        setGuestName(parsedData.name);
      } catch (error) {
        console.error("Erro ao recuperar dados do convidado:", error);
      }
    }
  }, [navigate]);

  const { data: testResult, isLoading, error, refetch } = useQuery<TestResult>({
    queryKey: [`/api/test/result/${testId}`],
    enabled: !!testId,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Check if user exists when test result is loaded (for find-results flow only)
  useEffect(() => {
    const checkUserExists = async () => {
      // Skip all user checks if user is already logged in
      const userData = localStorage.getItem("currentUser");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user && user.id) {
            setIsUserRegistered(true);
            return; // User is logged in, no need for registration modal
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }

      // Only apply privacy protection for find-results flow (when searching for existing tests)
      const isFromFindResults = sessionStorage.getItem('fromFindResults') === 'true';
      
      if (testResult?.guestEmail && isFromFindResults) {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: testResult.guestEmail, 
              password: 'dummy-check' 
            })
          });
          
          if (response.ok) {
            const responseData = await response.json();
            setUserExists(true);
            setIsUserRegistered(true);
          } else if (response.status === 401) {
            const errorText = await response.text();
            const userExistsButWrongPassword = errorText.includes('Senha incorreta') || errorText.includes('password');
            setUserExists(userExistsButWrongPassword);
            
            if (!userExistsButWrongPassword && errorText.includes('Usuário não encontrado')) {
              setIsUserRegistered(false);
              setTimeout(() => {
                setShowRegistrationModal(true);
              }, 1000);
            } else {
              setIsUserRegistered(true);
            }
          } else {
            setUserExists(false);
            setIsUserRegistered(false);
            setTimeout(() => {
              setShowRegistrationModal(true);
            }, 1000);
          }
        } catch (error) {
          console.error("Erro ao verificar usuário:", error);
          setUserExists(false);
          setIsUserRegistered(false);
          setTimeout(() => {
            setShowRegistrationModal(true);
          }, 1000);
        }
      } else {
        // For new first-time tests, allow viewing results and auto-open registration
        setUserExists(false);
        setIsUserRegistered(true); // Allow viewing results
        
        // Only show registration modal for guest tests if user is not already logged in
        const userData = localStorage.getItem("currentUser");
        let isLoggedIn = false;
        
        if (userData) {
          try {
            const user = JSON.parse(userData);
            isLoggedIn = !!(user && user.id);
          } catch (error) {
            console.error("Error parsing user data:", error);
          }
        }
        
        if (testResult && !testResult.userId && !isLoggedIn) {
          // Auto-open registration modal for guest tests after 3 seconds (only if not logged in)
          setTimeout(() => {
            setShowRegistrationModal(true);
          }, 3000);
        }
      }
    };

    if (testResult) {
      checkUserExists();
    }
  }, [testResult]);
  
  const { toast } = useToast();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkPaymentStatus = async () => {
      if (params.get('payment') === 'success') {
        // Atualizar dados do teste após pagamento
        await refetch();
        
        toast({
          title: "Pagamento Aprovado!",
          description: "Seu relatório premium foi liberado com sucesso!",
        });
      }
    };
    
    if (testId) {
      checkPaymentStatus();
    }
  }, [testId, refetch, toast]);

  const getProfileInfo = (profileType: string) => {
    switch (profileType) {
      case "D":
        return {
          name: "Dominante",
          description: "Você é uma pessoa decidida, direta e orientada para resultados. Gosta de liderar e tomar decisões rápidas.",
          color: "red",
        };
      case "I":
        return {
          name: "Influente",
          description: "Você é comunicativo, otimista e gosta de influenciar pessoas. Tem facilidade para relacionamentos e trabalho em equipe.",
          color: "yellow",
        };
      case "S":
        return {
          name: "Estável",
          description: "Você é paciente, leal e prefere ambientes estáveis. Valoriza a harmonia e é confiável em suas relações.",
          color: "green",
        };
      case "C":
        return {
          name: "Conformidade",
          description: "Você é analítico, preciso e orientado por qualidade. Gosta de seguir procedimentos e busca a excelência.",
          color: "blue",
        };
      default:
        return {
          name: "Perfil Misto",
          description: "Você apresenta características equilibradas entre diferentes perfis comportamentais.",
          color: "gray",
        };
    }
  };

  const getDiscColor = (type: string) => {
    switch (type) {
      case "D": return "bg-red-600 text-white border-red-600";
      case "I": return "bg-orange-500 text-white border-orange-500";
      case "S": return "bg-green-600 text-white border-green-600";
      case "C": return "bg-blue-600 text-white border-blue-600";
      default: return "bg-gray-600 text-white border-gray-600";
    }
  };

  const getScoreColor = (type: string) => {
    switch (type) {
      case "D": return "bg-red-600";
      case "I": return "bg-orange-500";
      case "S": return "bg-green-600";
      case "C": return "bg-blue-600";
      default: return "bg-gray-600";
    }
  };

  const getDiscIcon = (type: string) => {
    switch (type) {
      case "D": return Zap; // Dominância - Energia/Poder
      case "I": return Users; // Influência - Pessoas/Relacionamentos
      case "S": return Heart; // Estabilidade - Harmonia/Cuidado
      case "C": return Cog; // Conformidade - Precisão/Processos
      default: return Brain;
    }
  };

  const handleShareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Meu Perfil DISC - MeuPerfil360",
          text: `Descobri que meu perfil comportamental é ${testResult ? getProfileInfo(testResult.profileType).name : ""}!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Sharing failed:", error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleDownloadPDF = async () => {
    if (!testResult || !testResult.isPremium) {
      toast({
        title: "Acesso Negado",
        description: "O relatório em PDF está disponível apenas para testes premium.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Gerando PDF Premium...",
        description: "Criando seu relatório personalizado em PDF.",
      });

      // Generate actual PDF using jsPDF
      await generatePremiumPDF(testResult);

      toast({
        title: "PDF Baixado com Sucesso!",
        description: "Seu relatório DISC premium foi salvo como PDF.",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao Gerar PDF",
        description: "Não foi possível criar o relatório em PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !testResult) {
    console.error("Erro ao carregar teste:", error);
    
    // If it's a 404 error, try to redirect back to find results with a helpful message
    if (error && error.message && error.message.includes('404')) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Teste não encontrado</h3>
              <p className="text-muted-foreground mb-4">
                O teste pode ter sido removido ou o link pode estar incorreto. Use o formulário de busca para encontrar seus resultados.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate("/find-results")} 
                  className="w-full"
                  variant="default"
                >
                  Buscar Meus Resultados
                </Button>
                <Button 
                  onClick={() => navigate("/")} 
                  variant="outline"
                  className="w-full"
                >
                  Fazer Novo Teste
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // For other errors, show generic error message with retry option
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar resultados</h3>
            <p className="text-muted-foreground mb-4">
              Ocorreu um erro temporário. Tente recarregar a página ou busque seus resultados novamente.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => refetch()} 
                className="w-full"
                variant="default"
              >
                Tentar Novamente
              </Button>
              <Button 
                onClick={() => navigate("/find-results")} 
                className="w-full"
                variant="outline"
              >
                Buscar Meus Resultados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Defensive programming - ensure data integrity
  if (!testResult.scores || typeof testResult.scores !== 'object') {
    console.error("Dados de pontuação inválidos:", testResult);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Dados corrompidos</h3>
            <p className="text-muted-foreground mb-4">
              Os dados do teste estão corrompidos. Por favor, refaça o teste.
            </p>
            <Button 
              onClick={() => navigate("/")} 
              className="w-full"
            >
              Fazer Novo Teste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileInfo = getProfileInfo(testResult.profileType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold">MeuPerfil360</h1>
                <p className="text-xs md:text-sm opacity-90">Seus Resultados DISC</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate("/")} 
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm border border-white/30 text-xs md:text-sm"
            >
              Início
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm font-medium text-blue-600">Passo 3 de 3</span>
              <span className="text-xs md:text-sm text-muted-foreground">Resultados</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          {/* Results Header */}
          <div className="text-center mb-4 md:mb-6">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Trophy className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Parabéns, {testResult.guestName || 'Usuário'}!</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4">Seu teste foi concluído com sucesso</p>
          </div>
        </div>

        {/* DISC Profile Results */}
        <div className="max-w-7xl mx-auto relative">
          <Card className="shadow-lg border-0 mb-4 md:mb-6 relative">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-4 text-center">Seu Perfil DISC</h3>
              
              {/* Privacy Protection Overlay para usuários não cadastrados */}
              {!isUserRegistered && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-lg flex flex-col items-center justify-center z-10 p-6">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Resultados Protegidos</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Para sua segurança e privacidade, os resultados detalhados estão protegidos. 
                      Crie sua conta gratuita em 30 segundos para acessar.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        onClick={() => setShowRegistrationModal(true)}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        🔓 Criar Conta e Ver Resultados
                      </Button>
                      <p className="text-xs text-gray-500">
                        Grátis • Seus dados já estão preenchidos • Leva 30 segundos
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Profile Type with Custom Icon */}
              <div className="text-center mb-4 md:mb-6">
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border-2 ${getDiscColor(testResult.profileType)}`}>
                  {(() => {
                    const IconComponent = getDiscIcon(testResult.profileType);
                    return <IconComponent className="w-8 h-8 md:w-12 md:h-12" />;
                  })()}
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm md:text-lg font-bold ${getDiscColor(testResult.profileType)}`}>
                    {testResult.profileType}
                  </span>
                  <h4 className="text-base md:text-xl font-bold text-foreground">{profileInfo.name}</h4>
                </div>
                <p className="text-sm md:text-base text-muted-foreground px-4">
                  {profileInfo.description}
                </p>
              </div>

              {/* Enhanced DISC Scores with Visual Chart */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {(['D', 'I', 'S', 'C'] as const).map((type) => {
                    const score = (testResult.scores as any)[type] || 0;
                    const IconComponent = getDiscIcon(type);
                    return (
                      <div key={type} className="text-center p-3 md:p-4 bg-gradient-to-br from-slate-50 to-gray-100 rounded-lg hover:shadow-md transition-all duration-300">
                        <div className={`w-10 h-10 md:w-12 md:h-12 mx-auto rounded-full flex items-center justify-center border-2 ${getDiscColor(type)} mb-2`}>
                          <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className={`inline-block px-2 py-1 rounded text-xs md:text-sm font-bold mb-2 ${getDiscColor(type)}`}>
                          {type === 'D' ? 'D = Dominância' : 
                           type === 'I' ? 'I = Influência' : 
                           type === 'S' ? 'S = Estabilidade' : 'C = Conformidade'}
                        </div>
                        <div className="text-lg md:text-xl font-bold">{score}%</div>
                        <Progress value={score} className="mt-2 h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {type === 'D' ? 'Dominância' : 
                           type === 'I' ? 'Influência' : 
                           type === 'S' ? 'Estabilidade' : 'Conformidade'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Radar Chart Visualization */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg mt-6">
                  <h4 className="text-lg font-semibold mb-4 text-center flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Gráfico de Comportamento
                  </h4>
                  <div className="relative w-48 h-48 mx-auto">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {/* Radar Chart Grid */}
                      <g stroke="#e5e7eb" strokeWidth="1" fill="none">
                        <circle cx="100" cy="100" r="80" />
                        <circle cx="100" cy="100" r="60" />
                        <circle cx="100" cy="100" r="40" />
                        <circle cx="100" cy="100" r="20" />
                        <line x1="100" y1="20" x2="100" y2="180" />
                        <line x1="20" y1="100" x2="180" y2="100" />
                        <line x1="43.4" y1="43.4" x2="156.6" y2="156.6" />
                        <line x1="156.6" y1="43.4" x2="43.4" y2="156.6" />
                      </g>
                      
                      {/* Data Points */}
                      <g fill="rgba(59, 130, 246, 0.3)" stroke="rgb(59, 130, 246)" strokeWidth="2">
                        <polygon points={
                          `100,${100 - (testResult.scores.D * 0.6)} 
                           ${100 + (testResult.scores.I * 0.6)},100 
                           100,${100 + (testResult.scores.S * 0.6)} 
                           ${100 - (testResult.scores.C * 0.6)},100`
                        } />
                      </g>
                      
                      {/* Labels */}
                      <g fill="#374151" fontSize="14" fontWeight="bold" textAnchor="middle">
                        <text x="100" y="15">D</text>
                        <text x="185" y="105">I</text>
                        <text x="100" y="195">S</text>
                        <text x="15" y="105">C</text>
                      </g>
                    </svg>
                  </div>
                </div>

                {/* Enhanced DISC Scores List for Mobile */}
                <div className="sm:hidden mobile-stack">
                  {(['D', 'I', 'S', 'C'] as const).map((type) => {
                    const score = (testResult.scores as any)[type] || 0;
                    const IconComponent = getDiscIcon(type);
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${getDiscColor(type)}`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <span className="mobile-text font-medium text-foreground">
                            {type === "D" && "Dominância"}
                            {type === "I" && "Influência"}
                            {type === "S" && "Estabilidade"}
                            {type === "C" && "Conformidade"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 sm:w-20 bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getScoreColor(type)} transition-all duration-500`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-foreground w-8 sm:w-10 text-right">{score}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Upgrade Card */}
        <div className="responsive-container">
          {!testResult.isPremium && (
            <Card className="bg-gradient-to-br from-secondary/10 to-primary/10 border-2 border-secondary/20 mb-6">
              <CardContent className="mobile-card">
                <div className="text-center mb-4">
                  <Crown className="w-10 h-10 sm:w-12 sm:h-12 psychology-purple mx-auto mb-3" />
                  <h3 className="mobile-subtitle font-bold text-foreground mb-2">Desbloqueie o Relatório Completo</h3>
                  <p className="mobile-text text-muted-foreground mb-4">
                    Acesse análises detalhadas, dicas de desenvolvimento pessoal e export em PDF
                  </p>
                </div>

              <div className="space-y-3 mb-6">
                {[
                  "Dicas práticas para desenvolver seu potencial comportamental",
                  "Comparações entre perfis para descobrir seus diferenciais",
                  "Exportação em PDF profissional – ideal para carreira e desenvolvimento",
                  "Plano de ação em 4 semanas + livros, cursos e podcasts recomendados",
                  "Evite autossabotagem com alertas do seu perfil sob pressão"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 psychology-green flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-bold">💡</span>
                  </div>
                  <span className="text-sm font-medium text-blue-900">Ideal para usar em:</span>
                </div>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Processos seletivos, coaching, mentorias e crescimento pessoal
                </p>
              </div>

              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2">
                  <span className="text-2xl font-bold psychology-purple">R$ {pricing?.promocionalPrice || '47'},00</span>
                  <span className="text-sm text-muted-foreground line-through">R$ {pricing?.regularPrice || '97'},00</span>
                  <span className="bg-accent text-white text-xs px-2 py-1 rounded-full">52% OFF</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Oferta por tempo limitado</p>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={() => navigate(`/checkout/${testResult.id}`)}
                  className="w-full sm:w-auto bg-gradient-to-r from-secondary to-primary text-white btn-hover-lift"
                  size="default"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Desbloquear Relatório Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Action Buttons */}
        <div className="responsive-container">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {userExists === true ? (
            <Button 
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white btn-hover-lift"
              size="default"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Fazer Login
            </Button>
          ) : userExists === false ? (
            <Button 
              onClick={() => setShowRegistrationModal(true)}
              className="w-full sm:w-auto bg-accent text-white btn-hover-lift"
              size="default"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Conta Gratuita
            </Button>
          ) : (
            <Button 
              onClick={() => setShowRegistrationModal(true)}
              className="w-full sm:w-auto bg-accent text-white btn-hover-lift"
              size="default"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Conta Gratuita
            </Button>
          )}
          
          <Button 
            onClick={handleShareResults}
            variant="outline"
            className="w-full sm:w-auto"
            size="default"
          >
            <Share className="w-4 h-4 mr-2" />
            Compartilhar Resultados
          </Button>

          {testResult.isPremium && (
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
              size="default"
              onClick={() => window.open(`/api/test/result/${testResult.id}/pdf`, '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          )}
        </div>

          <p className="text-center mobile-text text-muted-foreground mt-4">
            {userExists === true 
              ? "Faça login para acessar seus resultados salvos e fazer novos testes"
              : "Crie sua conta gratuita para salvar seus resultados e fazer novos testes"
            }
          </p>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        testId={testResult.id}
      />

      <RegistrationModal 
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        guestData={{
          name: testResult?.guestName || "",
          email: testResult?.guestEmail || "",
          whatsapp: (testResult as any)?.guestWhatsapp || "",
        }}
      />
    </div>
  );
}
