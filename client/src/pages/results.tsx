import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Trophy, Crown, CheckCircle, Share, UserPlus, FileText } from "lucide-react";
import PaymentModal from "@/components/payment-modal";
import RegistrationModal from "@/components/registration-modal";

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

  const { data: testResult, isLoading, error } = useQuery<TestResult>({
    queryKey: ["/api/test/result", testId],
    enabled: !!testId,
  });

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !testResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Erro ao carregar resultados do teste.</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voltar ao Início
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
      <header className="psychology-gradient text-white p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">MeuPerfil360</h1>
              <p className="text-xs opacity-90">Seus Resultados</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium psychology-blue">Passo 3 de 3</span>
            <span className="text-sm text-muted-foreground">Resultados</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Parabéns, {testResult.guestName}!</h2>
          <p className="text-muted-foreground text-sm">Seu teste foi concluído com sucesso</p>
        </div>

        {/* DISC Profile Results */}
        <Card className="shadow-lg border-0 mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 text-center">Seu Perfil DISC</h3>
            
            {/* Profile Type */}
            <div className="text-center mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${getDiscColor(testResult.profileType)}`}>
                <span className="text-3xl font-bold">
                  {testResult.profileType}
                </span>
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">{profileInfo.name}</h4>
              <p className="text-sm text-muted-foreground">
                {profileInfo.description}
              </p>
            </div>

            {/* DISC Scores */}
            <div className="space-y-4">
              {Object.entries(testResult.scores).map(([type, score]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${getDiscColor(type)}`}>
                      <span className="font-bold text-sm">{type}</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {type === "D" && "Dominância"}
                      {type === "I" && "Influência"}
                      {type === "S" && "Estabilidade"}
                      {type === "C" && "Conformidade"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getScoreColor(type)} transition-all duration-500`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground w-10 text-right">{score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Premium Upgrade Card */}
        {!testResult.isPremium && (
          <Card className="bg-gradient-to-br from-secondary/10 to-primary/10 border-2 border-secondary/20 mb-6">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <Crown className="w-12 h-12 psychology-purple mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-2">Desbloqueie o Relatório Completo</h3>
                <p className="text-sm text-muted-foreground mb-4">
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
                className="w-full bg-gradient-to-r from-secondary to-primary text-white btn-hover-lift"
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Desbloquear Relatório Completo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => setShowRegistrationModal(true)}
            className="w-full bg-accent text-white btn-hover-lift"
            size="lg"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Criar Conta Gratuita
          </Button>
          
          <Button 
            onClick={handleShareResults}
            variant="outline"
            className="w-full"
          >
            <Share className="w-4 h-4 mr-2" />
            Compartilhar Resultados
          </Button>

          {testResult.isPremium && (
            <Button 
              variant="outline"
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          💡 Crie sua conta gratuita para salvar seus resultados e fazer novos testes
        </p>
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
