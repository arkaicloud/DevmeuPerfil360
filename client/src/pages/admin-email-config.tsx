import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Brain, ArrowLeft, Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminNav from "@/components/admin-nav";

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
}

export default function AdminEmailConfig() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [config, setConfig] = useState<EmailConfig>({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: true,
    fromEmail: "",
    fromName: "MeuPerfil360",
  });

  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    const adminSession = localStorage.getItem("adminSession");
    if (!adminSession) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const { data: existingConfig } = useQuery<EmailConfig>({
    queryKey: ["/api/admin/email-config"],
  });

  useEffect(() => {
    if (existingConfig) {
      setConfig(existingConfig);
    }
  }, [existingConfig]);

  const saveMutation = useMutation({
    mutationFn: async (emailConfig: EmailConfig) => {
      const response = await apiRequest("POST", "/api/admin/email-config", emailConfig);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas no banco",
        description: "Todas as configurações SMTP foram persistidas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!testEmail) {
        throw new Error("Email de teste é obrigatório");
      }
      const response = await apiRequest("POST", "/api/admin/test-email", { testEmail });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email enviado",
        description: data.message || "Email de teste enviado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message || "Erro ao enviar email de teste",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleTest = () => {
    testMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/dashboard")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Configurações de Email</h1>
              <p className="text-sm text-purple-200">SMTP e Templates</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configurações SMTP</CardTitle>
            <p className="text-muted-foreground">
              Configure as credenciais do servidor SMTP para envio automático de emails
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">Servidor SMTP</Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.gmail.com"
                  value={config.smtpHost}
                  onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Porta</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  value={config.smtpPort}
                  onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Usuário SMTP</Label>
                <Input
                  id="smtpUser"
                  type="email"
                  placeholder="contato@meuperfil360.com.br"
                  value={config.smtpUser}
                  onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">Senha SMTP</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  placeholder="Senha do email"
                  value={config.smtpPassword}
                  onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">Email Remetente</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@meuperfil360.com.br"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName">Nome Remetente</Label>
                <Input
                  id="fromName"
                  placeholder="MeuPerfil360"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="smtpSecure"
                checked={config.smtpSecure}
                onCheckedChange={(checked) => setConfig({ ...config, smtpSecure: checked })}
              />
              <Label htmlFor="smtpSecure">Usar conexão segura (SSL/TLS)</Label>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Teste de Configuração</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Email para Teste</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="admin@meuperfil360.com.br"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Digite um email válido para receber o email de teste
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
              <Button 
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending || !testEmail}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <TestTube className="w-4 h-4 mr-2" />
                {testMutation.isPending ? "Enviando..." : "Testar Email"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}