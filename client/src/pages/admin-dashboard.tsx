import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Users, 
  FileText, 
  DollarSign, 
  Crown, 
  TrendingUp, 
  Mail, 
  Settings, 
  BarChart3,
  Calendar,
  LogOut
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdminNav from "@/components/admin-nav";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AdminStats {
  totalUsers: number;
  totalTests: number;
  premiumRevenue: number;
  premiumReports: number;
  recentUsers: Array<{
    id: number;
    username: string;
    email: string;
    createdAt: string;
  }>;
  recentTests: Array<{
    id: number;
    guestName: string;
    profileType: string;
    isPremium: boolean;
    createdAt: string;
  }>;
  monthlyStats: Array<{
    month: string;
    users: number;
    tests: number;
    revenue: number;
  }>;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const adminSession = localStorage.getItem("adminSession");
    if (!adminSession) {
      navigate("/admin/login");
      return;
    }
    setIsAuthenticated(true);
  }, [navigate]);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    navigate("/admin/login");
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />
      
      <div className="lg:ml-64 p-4 sm:p-6 max-w-full mx-auto lg:mx-0">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total de Usuários</p>
                  <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Testes Realizados</p>
                  <p className="text-3xl font-bold">{stats?.totalTests || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Receita Premium</p>
                  <p className="text-3xl font-bold">R$ {stats?.premiumRevenue || 0}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Relatórios Premium</p>
                  <p className="text-3xl font-bold">{stats?.premiumReports || 0}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="tests">Testes</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Estatísticas Mensais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.monthlyStats?.map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{month.month}</p>
                          <p className="text-sm text-gray-600">{month.users} usuários, {month.tests} testes</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">R$ {month.revenue}</p>
                        </div>
                      </div>
                    )) || <p className="text-gray-500">Carregando dados...</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Métricas de Conversão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Taxa de Premium</span>
                      <span className="font-bold">
                        {stats?.totalTests ? Math.round((stats.premiumReports / stats.totalTests) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Valor Médio por Premium</span>
                      <span className="font-bold">
                        R$ {stats?.premiumReports ? Math.round((stats.premiumRevenue || 0) / stats.premiumReports) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Testes por Usuário</span>
                      <span className="font-bold">
                        {stats?.totalUsers ? Math.round((stats.totalTests || 0) / stats.totalUsers * 10) / 10 : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usuários Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recentUsers?.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  )) || <p className="text-gray-500">Nenhum usuário encontrado</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Testes Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recentTests?.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={test.profileType === "D" ? "destructive" : test.profileType === "I" ? "default" : test.profileType === "S" ? "secondary" : "outline"}>
                          {test.profileType}
                        </Badge>
                        <div>
                          <p className="font-medium">{test.guestName}</p>
                          <p className="text-sm text-gray-600">
                            {test.isPremium ? "Premium" : "Gratuito"}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(test.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  )) || <p className="text-gray-500">Nenhum teste encontrado</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configurações SMTP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">Configure as credenciais SMTP para envio automático de emails.</p>
                  <Button variant="outline" onClick={() => navigate("/admin/email-config")}>
                    Configurar SMTP
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Templates de Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">Gerencie templates para emails automáticos.</p>
                  <Button variant="outline" onClick={() => navigate("/admin/email-templates")}>
                    Gerenciar Templates
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Preço do Relatório Premium</p>
                      <p className="text-sm text-gray-600">Valor cobrado por relatório premium</p>
                    </div>
                    <Button variant="outline" size="sm">
                      R$ 29,90
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Limite de Testes Gratuitos</p>
                      <p className="text-sm text-gray-600">Máximo de testes gratuitos por usuário</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Ilimitado
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}