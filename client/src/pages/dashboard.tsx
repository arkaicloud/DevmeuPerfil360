import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Brain, User, Calendar, FileText, Plus, Crown, ChartPie, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TestResult {
  id: number;
  testType: string;
  profileType: string;
  scores: any;
  isPremium: boolean;
  createdAt: string;
}

interface DashboardData {
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    email: string;
    whatsapp?: string;
  };
  testResults: TestResult[];
}

interface TestLimits {
  canTakeTest: boolean;
  reason?: string;
  testsRemaining?: number;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const params = useParams();
  const userId = params.userId;
  const [showRetestDialog, setShowRetestDialog] = useState(false);
  const [showPremiumUpgradeDialog, setShowPremiumUpgradeDialog] = useState(false);

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: [`/api/user/${userId}/dashboard`],
    enabled: !!userId,
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  const { data: testLimits } = useQuery<TestLimits>({
    queryKey: [`/api/user/${userId}/test-limits`],
    enabled: !!userId,
    staleTime: 30000,
  });

  const { data: user } = useQuery<{
    id: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    email: string;
    whatsapp?: string;
  }>({
    queryKey: [`/api/user/${userId}`],
    enabled: !!userId,
    staleTime: 30000,
  });

  // Check if popup should be shown for 6+ month retest
  useEffect(() => {
    if (dashboardData?.testResults && dashboardData.testResults.length > 0 && needsRetesting()) {
      const lastShown = localStorage.getItem('lastRetestPopup');
      const today = new Date().toDateString();

      // Show popup if not shown today
      if (lastShown !== today) {
        setShowRetestDialog(true);
        localStorage.setItem('lastRetestPopup', today);
      }
    }
  }, [dashboardData]);

  // Check if premium upgrade popup should be shown
  useEffect(() => {
    if (dashboardData?.testResults && dashboardData.testResults.length > 0) {
      const hasNonPremiumTests = dashboardData.testResults.some(test => !test.isPremium);
      
      if (hasNonPremiumTests) {
        const lastShown = localStorage.getItem('lastPremiumUpgradePopup');
        const today = new Date().toDateString();

        // Show popup if not shown today
        if (lastShown !== today) {
          setShowPremiumUpgradeDialog(true);
          localStorage.setItem('lastPremiumUpgradePopup', today);
        }
      }
    }
  }, [dashboardData]);

  const getProfileBadgeVariant = (profileType: string) => {
    switch (profileType) {
      case "D": return "destructive";
      case "I": return "default";
      case "S": return "secondary";
      case "C": return "outline";
      default: return "outline";
    }
  };

  const getProfileColor = (profileType: string) => {
    switch (profileType) {
      case "D": return "bg-red-500 text-white";
      case "I": return "bg-orange-500 text-white";
      case "S": return "bg-green-500 text-white";
      case "C": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getProfileGradient = (profileType: string) => {
    switch (profileType) {
      case "D": return "from-red-500 to-red-600";
      case "I": return "from-orange-500 to-orange-600";
      case "S": return "from-green-500 to-green-600";
      case "C": return "from-blue-500 to-blue-600";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const getProfileName = (profileType: string) => {
    switch (profileType) {
      case "D": return "Dominante";
      case "I": return "Influente";
      case "S": return "Estável";
      case "C": return "Conformidade";
      default: return "Misto";
    }
  };

  // Calculate if user needs retesting (6+ months)
  const needsRetesting = () => {
    if (!dashboardData?.testResults?.length) return false;
    const lastTest = new Date(dashboardData.testResults[0].createdAt);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return lastTest < sixMonthsAgo;
  };

  const getDaysSinceLastTest = () => {
    if (!dashboardData?.testResults?.length) return 0;
    const lastTest = new Date(dashboardData.testResults[0].createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - lastTest.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || (!dashboardData && !isLoading && userId)) {
    console.error("Dashboard error details:", error);
    console.log("Current userId:", userId);
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
                <p className="text-xs opacity-90">Painel do Usuário</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/20"
            >
              Início
            </Button>
          </div>
        </header>

        <div className="min-h-screen flex items-center justify-center p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-destructive">Erro ao carregar dashboard.</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error ? `Erro: ${error.message}` : "Dados não encontrados"}
              </p>
              <div className="mt-4 space-x-2">
                <Button onClick={() => window.location.reload()} variant="outline">
                  Tentar Novamente
                </Button>
                <Button onClick={() => navigate("/")} className="mt-4">
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Se não há dados ainda, mostrar loading
  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-4 md:p-6 shadow-xl sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 backdrop-blur-sm rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
              <Brain className="w-5 h-5 md:w-7 md:h-7 text-white drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold tracking-wide drop-shadow-sm">MeuPerfil360</h1>
              <p className="text-xs md:text-sm text-indigo-100 font-medium hidden sm:block">Painel Pessoal DISC</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            
            {/* Se não pode fazer testes, mostra botão de upgrade */}
            {!testLimits?.canTakeTest && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm border border-white/30 px-3 md:px-6 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-xs md:text-sm"
                onClick={() => navigate("/")}
              >
                <Crown className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Upgrade Premium</span>
                <span className="sm:hidden">Premium</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm border border-white/30 px-3 md:px-4 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-xs md:text-sm"
              onClick={() => {
                localStorage.removeItem("currentUser");
                navigate("/login");
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Retest Alert - Show if user needs retesting */}
        {needsRetesting() && (
          <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800 mb-1">
                    ⏰ Hora do Seu Novo Teste DISC!
                  </h3>
                  <p className="text-sm text-amber-700 mb-3">
                    Já se passaram {getDaysSinceLastTest()} dias desde seu último teste. 
                    Sua personalidade pode ter evoluído! Recomendamos refazer o teste a cada 6 meses.
                  </p>
                  {testLimits?.canTakeTest ? (
                    <Button 
                      onClick={() => {
                        // Create session data from user info for compatibility
                        const mockGuestData = {
                          name: user?.username || user?.firstName || "",
                          email: user?.email || "",
                          whatsapp: user?.whatsapp || "",
                        };
                        sessionStorage.setItem("guestTestData", JSON.stringify(mockGuestData));
                        navigate("/test");
                      }} 
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Fazer Novo Teste DISC
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => navigate("/")} 
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Premium
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Status Card */}
        {testLimits && (
          <Card className={`mb-4 md:mb-6 ${testLimits.canTakeTest ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'}`}>
            <CardHeader className="pb-3 md:pb-4 p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-lg">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${testLimits.canTakeTest ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}>
                  <Brain className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-bold ${testLimits.canTakeTest ? 'text-green-800' : 'text-red-800'}`}>
                    {testLimits.canTakeTest ? '✅ Testes Disponíveis' : '🚫 Limite de Testes Atingido'}
                  </h3>
                  <p className={`text-sm ${testLimits.canTakeTest ? 'text-green-600' : 'text-red-600'}`}>
                    {testLimits.canTakeTest 
                      ? `Você pode fazer ${testLimits.testsRemaining} teste(s)` 
                      : testLimits.reason
                    }
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {testLimits.canTakeTest ? (
                <Button 
                    onClick={() => {
                      // Create session data from user info for compatibility
                      const mockGuestData = {
                        name: user?.username || user?.firstName || "",
                        email: user?.email || "",
                        whatsapp: user?.whatsapp || "",
                      };
                      sessionStorage.setItem("guestTestData", JSON.stringify(mockGuestData));
                      navigate("/test");
                    }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Fazer Novo Teste DISC
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => navigate("/")} 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Fazer Upgrade Premium
                  </Button>
                  <p className="text-sm text-gray-600 self-center">
                    Desbloqueie até 2 testes adicionais com o plano premium
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Info */}
        <Card className="mb-4 md:mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader className="pb-3 md:pb-4 p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-lg">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <div className="text-gray-800 text-sm md:text-base">Bem-vindo, {dashboardData?.user?.firstName || dashboardData?.user?.username || dashboardData?.user?.email?.split('@')[0] || "Usuário"}</div>
                <div className="text-xs md:text-sm text-blue-600 font-normal">Seu Painel Pessoal DISC</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                <div className="text-xs text-blue-600 font-medium">EMAIL</div>
                <div className="text-sm text-gray-700 font-medium truncate">{dashboardData?.user?.email || "N/A"}</div>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
                <div className="text-xs text-purple-600 font-medium">TESTES REALIZADOS</div>
                <div className="text-sm text-gray-700 font-medium">{dashboardData?.testResults?.length || 0}</div>
              </div>
              {dashboardData?.testResults?.length > 0 && (
                <div className="bg-white/70 rounded-lg p-3 border border-green-100 sm:col-span-2 md:col-span-1">
                  <div className="text-xs text-green-600 font-medium">ÚLTIMO TESTE</div>
                  <div className="text-sm text-gray-700 font-medium">{getDaysSinceLastTest()} dias atrás</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="w-4 h-4 md:w-5 md:h-5" />
              Histórico de Testes ({dashboardData?.testResults?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {!dashboardData?.testResults || dashboardData.testResults.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Brain className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">Nenhum teste realizado ainda</h3>
                <p className="text-muted-foreground mb-4 md:mb-6 max-w-md mx-auto text-sm md:text-base px-4">
                  Descubra seu perfil comportamental e potencialize seu desenvolvimento pessoal e profissional com nosso teste DISC.
                </p>
                <div className="space-y-3">
                  <Button onClick={() => {
                  // Create session data from user info for compatibility
                  const mockGuestData = {
                    name: user?.username || user?.firstName || "",
                    email: user?.email || "",
                    whatsapp: user?.whatsapp || "",
                  };
                  sessionStorage.setItem("guestTestData", JSON.stringify(mockGuestData));
                  navigate("/test");
                }} className="psychology-gradient" size="default">
                    <Brain className="w-4 h-4 mr-2" />
                    Fazer Primeiro Teste DISC
                  </Button>
                  <div className="text-xs text-muted-foreground px-4">
                    ✓ Teste gratuito • ✓ Resultado imediato • ✓ Relatório premium disponível
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.testResults.map((result) => (
                  <Card key={result.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-sm md:text-base">Teste {result.testType}</h4>
                          <Badge variant={getProfileBadgeVariant(result.profileType)} className="text-xs">
                            {result.profileType} - {getProfileName(result.profileType)}
                          </Badge>
                          {result.isPremium && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                              <Crown className="w-2 h-2 md:w-3 md:h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(result.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Perfil comportamental identificado
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/results/${result.id}`)}
                          className="flex-1 text-xs md:text-sm"
                        >
                          <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Ver Resultado
                        </Button>
                        {result.isPremium ? (
                          <Button
                            size="sm"
                            onClick={() => window.open(`/api/test/result/${result.id}/pdf`, '_blank')}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm flex-1 sm:flex-none"
                          >
                            <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            <span className="hidden sm:inline">PDF Premium</span>
                            <span className="sm:hidden">Premium</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs md:text-sm flex-1 sm:flex-none"
                            onClick={() => navigate(`/checkout/${result.id}`)}
                          >
                            <Crown className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            Premium
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {dashboardData?.testResults && dashboardData.testResults.length > 0 && (
          <Card className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <ChartPie className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-gray-800">Suas Estatísticas DISC</div>
                  <div className="text-sm text-indigo-600 font-normal">Análise do seu progresso</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
                  <div className="text-3xl font-bold mb-1">
                    {dashboardData.testResults.length}
                  </div>
                  <div className="text-sm text-blue-100">Testes Realizados</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg">
                  <div className="text-3xl font-bold mb-1">
                    {dashboardData.testResults.filter(r => r.isPremium).length}
                  </div>
                  <div className="text-sm text-purple-100">Relatórios Premium</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg">
                  <div className="text-3xl font-bold mb-1">
                    {new Set(dashboardData.testResults.map(r => r.profileType)).size}
                  </div>
                  <div className="text-sm text-green-100">Perfis Descobertos</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white shadow-lg">
                  <div className="text-3xl font-bold mb-1">
                    {Math.round((Date.now() - new Date(dashboardData.testResults[0]?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) || 0}
                  </div>
                  <div className="text-sm text-amber-100">Dias desde primeiro teste</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Retest Popup Dialog */}
      <AlertDialog open={showRetestDialog} onOpenChange={setShowRetestDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Hora do Seu Novo Teste DISC!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Já se passaram mais de 6 meses desde seu último teste DISC. Sua personalidade pode ter evoluído! 
              <br /><br />
              <strong>Por que refazer o teste?</strong>
              <br />• Suas experiências moldam seu comportamento
              <br />• Desenvolvimento pessoal e profissional
              <br />• Resultados mais precisos e atualizados
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRetestDialog(false)}
            >
              Lembrar Depois
            </Button>
            <AlertDialogAction
              onClick={() => {
                setShowRetestDialog(false);
                if (testLimits?.canTakeTest) {
                  // Create session data from user info for compatibility
                  const mockGuestData = {
                    name: user?.username || user?.firstName || "",
                    email: user?.email || "",
                    whatsapp: user?.whatsapp || "",
                  };
                  sessionStorage.setItem("guestTestData", JSON.stringify(mockGuestData));
                  navigate("/test");
                } else {
                  navigate("/");
                }
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {testLimits?.canTakeTest ? "Fazer Novo Teste Agora" : "Upgrade Premium"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Premium Upgrade Popup Dialog */}
      <AlertDialog open={showPremiumUpgradeDialog} onOpenChange={setShowPremiumUpgradeDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-purple-700">
              <Crown className="w-5 h-5" />
              Desbloqueie Seu Potencial Completo!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Você já fez seu teste DISC básico! Agora descubra insights mais profundos com nosso relatório premium.
              <br /><br />
              <strong>Com o Premium você recebe:</strong>
              <br />• Análise comportamental completa
              <br />• Plano de ação personalizado de 4 semanas
              <br />• Recomendações de carreira específicas
              <br />• Estratégias de comunicação e liderança
              <br />• Relatório em PDF para download
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPremiumUpgradeDialog(false)}
            >
              Talvez Depois
            </Button>
            <AlertDialogAction
              onClick={() => {
                setShowPremiumUpgradeDialog(false);
                // Navigate to checkout with the most recent test
                const latestTest = dashboardData?.testResults?.[0];
                if (latestTest) {
                  navigate(`/checkout/${latestTest.id}`);
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Fazer Upgrade Premium
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}