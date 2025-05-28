import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, User, Calendar, FileText, Plus, Crown, ChartPie } from "lucide-react";
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
    username: string;
    email: string;
  };
  testResults: TestResult[];
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get user from localStorage first (from login)
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserId(user.id.toString());
    } else {
      // Fallback: try to extract from URL path
      const path = window.location.pathname;
      const id = path.split('/').pop();
      if (id && !isNaN(Number(id))) {
        setUserId(id);
      } else {
        navigate("/login");
      }
    }
  }, [navigate]);

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: [`/api/user/${userId}/dashboard`],
    enabled: !!userId,
  });

  const getProfileBadgeVariant = (profileType: string) => {
    switch (profileType) {
      case "D": return "destructive";
      case "I": return "default";
      case "S": return "secondary";
      case "C": return "outline";
      default: return "outline";
    }
  };

  const getProfileName = (profileType: string) => {
    switch (profileType) {
      case "D": return "Dominante";
      case "I": return "Influente";
      case "S": return "Estável";
      case "C": return "Conscencioso";
      default: return "Misto";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Erro ao carregar dashboard.</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <p className="text-xs opacity-90">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => navigate("/")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Teste
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
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

      <div className="p-6">
        {/* User Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Bem-vindo, {dashboardData.user.username}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> {dashboardData.user.email}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Testes realizados:</strong> {dashboardData.testResults.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Histórico de Testes ({dashboardData.testResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.testResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Nenhum teste realizado ainda</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Descubra seu perfil comportamental e potencialize seu desenvolvimento pessoal e profissional com nosso teste DISC.
                </p>
                <div className="space-y-3">
                  <Button onClick={() => navigate("/")} className="psychology-gradient" size="lg">
                    <Brain className="w-4 h-4 mr-2" />
                    Fazer Primeiro Teste DISC
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    ✓ Teste gratuito • ✓ Resultado imediato • ✓ Relatório premium disponível
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.testResults.map((result) => (
                  <Card key={result.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">Teste {result.testType}</h4>
                          <Badge variant={getProfileBadgeVariant(result.profileType)}>
                            {result.profileType} - {getProfileName(result.profileType)}
                          </Badge>
                          {result.isPremium && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(result.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Perfil comportamental identificado
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/results/${result.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {dashboardData.testResults.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartPie className="w-5 h-5" />
                Suas Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="text-2xl font-bold psychology-blue">
                    {dashboardData.testResults.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Testes Realizados</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <div className="text-2xl font-bold psychology-purple">
                    {dashboardData.testResults.filter(r => r.isPremium).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Relatórios Premium</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {new Set(dashboardData.testResults.map(r => r.profileType)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Perfis Descobertos</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {Math.round((Date.now() - new Date(dashboardData.testResults[0]?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Dias desde primeiro teste</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
