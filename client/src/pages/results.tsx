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
  profileType: string;
  scores: DiscProfile;
  isPremium: boolean;
  createdAt: string;
  guestName: string;
}

export default function Results() {
  const [, navigate] = useLocation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const id = path.split('/').pop();
    if (id) {
      setTestId(id);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const { data: testResult, isLoading, error, refetch } = useQuery<TestResult>({
    queryKey: [`/api/test/result/${testId}`],
    enabled: !!testId,
  });
  
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
          name: "Conscencioso",
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
      case "D": return "bg-red-100 text-red-700 border-red-200";
      case "I": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "S": return "bg-green-100 text-green-700 border-green-200";
      case "C": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getScoreColor = (type: string) => {
    switch (type) {
      case "D": return "bg-red-500";
      case "I": return "bg-yellow-500";
      case "S": return "bg-green-500";
      case "C": return "bg-blue-500";
      default: return "bg-gray-500";
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
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Resultado não encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Não foi possível carregar os resultados do teste. O teste pode ter sido removido ou o link pode estar incorreto.
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
      <header className="psychology-gradient text-white mobile-padding">
        <div className="responsive-container">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="mobile-subtitle font-bold">MeuPerfil360</h1>
                <p className="text-xs sm:text-sm opacity-90">Seus Resultados</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mobile-padding">
        <div className="responsive-container">
          {/* Progress Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium psychology-blue">Passo 3 de 3</span>
              <span className="text-sm text-muted-foreground">Resultados</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          {/* Results Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="mobile-title font-bold text-foreground mb-2">Parabéns, {testResult.guestName || 'Usuário'}!</h2>
            <p className="mobile-text text-muted-foreground">Seu teste foi concluído com sucesso</p>
          </div>
        </div>

        {/* DISC Profile Results */}
        <div className="responsive-container">
          <Card className="shadow-lg border-0 mb-6">
            <CardContent className="mobile-card">
              <h3 className="mobile-subtitle font-bold text-foreground mb-4 text-center">Seu Perfil DISC</h3>
              
              {/* Profile Type with Custom Icon */}
              <div className="text-center mb-6">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${getDiscColor(testResult.profileType)}`}>
                  {(() => {
                    const IconComponent = getDiscIcon(testResult.profileType);
                    return <IconComponent className="w-10 h-10 sm:w-12 sm:h-12" />;
                  })()}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-lg font-bold ${getDiscColor(testResult.profileType)}`}>
                    {testResult.profileType}
                  </span>
                  <h4 className="mobile-subtitle font-bold text-foreground">{profileInfo.name}</h4>
                </div>
                <p className="mobile-text text-muted-foreground">
                  {profileInfo.description}
                </p>
              </div>

              {/* Enhanced DISC Scores with Visual Chart */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(['D', 'I', 'S', 'C'] as const).map((type) => {
                    const score = (testResult.scores as any)[type] || 0;
                    const IconComponent = getDiscIcon(type);
                    return (
                      <div key={type} className="text-center p-4 bg-gradient-to-br from-slate-50 to-gray-100 rounded-lg hover:shadow-md transition-all duration-300">
                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center border-2 ${getDiscColor(type)} mb-2`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className={`inline-block px-2 py-1 rounded text-sm font-bold mb-2 ${getDiscColor(type)}`}>
                          {type}
                        </div>
                        <div className="text-xl font-bold">{score}%</div>
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
                  "Análise detalhada de 15+ páginas",
                  "Dicas personalizadas de desenvolvimento",
                  "Export em PDF profissional",
                  "Comparação com outros perfis"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 psychology-green flex-shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2">
                  <span className="text-2xl font-bold psychology-purple">R$ 47,00</span>
                  <span className="text-sm text-muted-foreground line-through">R$ 97,00</span>
                  <span className="bg-accent text-white text-xs px-2 py-1 rounded-full">52% OFF</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Oferta por tempo limitado</p>
              </div>

              <Button 
                onClick={() => setShowPaymentModal(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-secondary to-primary text-white btn-hover-lift"
                size="default"
              >
                <Crown className="w-4 h-4 mr-2" />
                Desbloquear Relatório Completo
              </Button>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Action Buttons */}
        <div className="responsive-container">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => setShowRegistrationModal(true)}
            className="w-full sm:w-auto bg-accent text-white btn-hover-lift"
            size="default"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Criar Conta Gratuita
          </Button>
          
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
              onClick={() => handleDownloadPDF()}
            >
              <FileText className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          )}
        </div>

          <p className="text-center mobile-text text-muted-foreground mt-4">
            Crie sua conta gratuita para salvar seus resultados e fazer novos testes
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
          name: testResult.guestName,
          email: "",
          whatsapp: "",
        }}
      />
    </div>
  );
}
