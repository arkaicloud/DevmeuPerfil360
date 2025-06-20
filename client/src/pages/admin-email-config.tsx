import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, ArrowLeft, Save, TestTube, Mail, Send } from "lucide-react";
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

  const [testEmail, setTestEmail] = useState("leosouzaa10@gmail.com");
  const [emailType, setEmailType] = useState<string>("welcome");

  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
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

  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ email, type }: { email: string; type: string }) => {
      const response = await apiRequest("POST", "/api/admin/send-test-email", {
        email,
        emailType: type,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Email enviado com sucesso",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Falha ao enviar email",
        variant: "destructive",
      });
    },
  });

  const initTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/init-email-templates", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Templates inicializados",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao inicializar templates",
        description: error.message || "Falha ao inicializar templates",
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

  const handleSendTestEmail = () => {
    if (!testEmail || !emailType) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o tipo de email e informe o destinatário",
        variant: "destructive",
      });
      return;
    }
    sendTestEmailMutation.mutate({ email: testEmail, type: emailType });
  };

  const handleInitTemplates = () => {
    initTemplatesMutation.mutate();
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />

      <div className="lg:ml-64 p-4 sm:p-6 max-w-full lg:max-w-6xl mx-auto lg:mx-0">
        <Card className="w-full">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Configurações SMTP</CardTitle>
            <p className="text-muted-foreground text-sm sm:text-base">
              Configure as credenciais do servidor SMTP para envio automático de emails
            </p>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Usuário SMTP</Label>
                <Input
                  id="smtpUser"
                  type="email"
                  placeholder="contato@meuperfil360.com.br"
                  value={config.smtpUser}
                  onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                  className="w-full"
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">Email Remetente</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@meuperfil360.com.br"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName">Nome Remetente</Label>
                <Input
                  id="fromName"
                  placeholder="MeuPerfil360"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                  className="w-full"
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

            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Teste de Configuração SMTP
              </h3>
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

            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
                <Send className="w-5 h-5 mr-2" />
                Teste de Emails Automatizados
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailTestRecipient">Email Destinatário</Label>
                    <Input
                      id="emailTestRecipient"
                      type="email"
                      placeholder="leosouzaa10@gmail.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailType">Tipo de Email</Label>
                    <Select value={emailType} onValueChange={setEmailType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo de email" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Boas-vindas (Cadastro)</SelectItem>
                        <SelectItem value="test_completion">Teste Concluído</SelectItem>
                        <SelectItem value="premium_upgrade">Upgrade Premium</SelectItem>
                        <SelectItem value="retest_reminder">Lembrete de Reteste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleSendTestEmail}
                    disabled={sendTestEmailMutation.isPending || !testEmail || !emailType}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendTestEmailMutation.isPending ? "Enviando..." : "Enviar Email Teste"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleInitTemplates}
                    disabled={initTemplatesMutation.isPending}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {initTemplatesMutation.isPending ? "Inicializando..." : "Inicializar Templates"}
                  </Button>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Tipos de Email Disponíveis:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li><strong>Boas-vindas:</strong> Enviado quando um usuário se cadastra</li>
                    <li><strong>Teste Concluído:</strong> Enviado após completar um teste DISC</li>
                    <li><strong>Upgrade Premium:</strong> Enviado após compra do relatório premium</li>
                    <li><strong>Lembrete de Reteste:</strong> Enviado para incentivar novos testes</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
              <Button 
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending || !testEmail}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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