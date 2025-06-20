import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Brain, ArrowLeft, Save, Mail, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminNav from "@/components/admin-nav";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export default function AdminEmailTemplates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("test-completion");
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({
    "test-completion": {
      id: "test-completion",
      name: "Conclusão do Teste",
      subject: "🎯 Seu Teste DISC foi concluído - {{userName}}",
      content: `Olá {{userName}},

Parabéns! Você acabou de concluir seu Teste DISC no MeuPerfil360.

📊 **Seu Perfil:** {{profileType}} - {{profileName}}

✅ **Próximos Passos:**
• Acesse seus resultados em: {{resultUrl}}
• Considere adquirir o relatório premium para análise completa
• Compartilhe com sua equipe para melhor colaboração

💎 **Upgrade Premium:**
Tenha acesso a análises detalhadas, recomendações personalizadas e planos de desenvolvimento profissional.

Acesse agora: {{premiumUrl}}

Atenciosamente,
Equipe MeuPerfil360
🌟 Transformando potencial em performance`,
      variables: ["userName", "profileType", "profileName", "resultUrl", "premiumUrl"]
    },
    "retest-reminder": {
      id: "retest-reminder",
      name: "Lembrete de Reteste",
      subject: "⏰ Hora de atualizar seu perfil DISC - {{userName}}",
      content: `Olá {{userName}},

Já se passaram {{monthsSinceTest}} meses desde seu último teste DISC!

🔄 **Por que refazer o teste?**
• Suas experiências moldam seu comportamento
• Desenvolvimento pessoal e profissional contínuo
• Resultados mais precisos e atualizados

📈 **Benefícios do reteste:**
• Acompanhar sua evolução pessoal
• Identificar novas competências desenvolvidas
• Ajustar estratégias de comunicação

🎯 **Faça seu novo teste agora:**
{{testUrl}}

Continue sua jornada de autoconhecimento conosco!

Atenciosamente,
Equipe MeuPerfil360
🚀 Evoluindo sempre`,
      variables: ["userName", "monthsSinceTest", "testUrl"]
    },
    "premium-welcome": {
      id: "premium-welcome",
      name: "Boas-vindas Premium",
      subject: "🎉 Bem-vindo ao MeuPerfil360 Premium!",
      content: `Olá {{userName}},

Parabéns pela decisão de investir em seu desenvolvimento! 

💎 **Seus benefícios Premium incluem:**
• Relatório detalhado em PDF
• Análise comportamental completa
• Recomendações personalizadas
• Plano de desenvolvimento profissional

📥 **Baixe seu relatório:**
{{pdfUrl}}

🎯 **Próximos passos recomendados:**
1. Leia seu relatório completo
2. Implemente as recomendações
3. Compartilhe insights com sua equipe
4. Agende uma nova avaliação em 6 meses

Obrigado por confiar em nossa metodologia!

Equipe MeuPerfil360
✨ Seu sucesso é nossa missão`,
      variables: ["userName", "pdfUrl"]
    }
  });

  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const { data: existingTemplates, isLoading } = useQuery<Record<string, EmailTemplate>>({
    queryKey: ["/api/admin/email-templates"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (existingTemplates && Object.keys(existingTemplates).length > 0) {
      setTemplates(existingTemplates);
    }
  }, [existingTemplates]);

  const saveMutation = useMutation({
    mutationFn: async (templateData: Record<string, EmailTemplate>) => {
      const response = await apiRequest("POST", "/api/admin/email-templates", templateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Templates salvos no banco",
        description: "Todos os templates foram persistidos com sucesso no banco de dados",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar templates",
        variant: "destructive",
      });
    },
  });

  const initTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/init-email-templates", {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Templates inicializados",
        description: "Templates padrão foram criados com sucesso",
      });
      // Refetch templates after initialization
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao inicializar",
        description: error.message || "Erro ao inicializar templates",
        variant: "destructive",
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest("POST", "/api/admin/preview-email", {
        templateId,
        sampleData: {
          userName: "João Silva",
          profileType: "D",
          profileName: "Dominante",
          monthsSinceTest: "8",
          resultUrl: "https://app.meuperfil360.com/results/123",
          premiumUrl: "https://app.meuperfil360.com/checkout/123",
          testUrl: "https://app.meuperfil360.com",
          pdfUrl: "https://app.meuperfil360.com/api/test/result/123/pdf"
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Open preview in new window
      const previewWindow = window.open("", "_blank");
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head><title>Preview do Email</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h3>Assunto: ${data.subject}</h3>
              <hr>
              <div style="white-space: pre-wrap;">${data.content}</div>
            </body>
          </html>
        `);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no preview",
        description: error.message || "Erro ao gerar preview",
        variant: "destructive",
      });
    },
  });

  const currentTemplate = templates[selectedTemplate];

  const updateTemplate = (field: keyof EmailTemplate, value: string) => {
    setTemplates(prev => ({
      ...prev,
      [selectedTemplate]: {
        ...prev[selectedTemplate],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(templates);
  };

  const handlePreview = () => {
    previewMutation.mutate(selectedTemplate);
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

      <div className="lg:ml-64 p-4 sm:p-6 max-w-full mx-auto lg:mx-0">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Template List */}
          <Card className="xl:col-span-1 w-full">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Templates</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : Object.keys(templates).length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Nenhum template encontrado</p>
                  <Button
                    onClick={handleInitTemplates}
                    disabled={initTemplatesMutation.isPending}
                    className="w-full"
                  >
                    {initTemplatesMutation.isPending ? "Inicializando..." : "Criar Templates Padrão"}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                  {Object.values(templates).map((template) => (
                    <Button
                      key={template.id}
                      variant={selectedTemplate === template.id ? "default" : "outline"}
                      className="w-full justify-start text-sm"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{template.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Editor */}
          <Card className="xl:col-span-3 w-full">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-lg sm:text-xl truncate">Editando: {currentTemplate?.name}</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto do Email</Label>
                <Input
                  id="subject"
                  value={currentTemplate?.subject || ""}
                  onChange={(e) => updateTemplate("subject", e.target.value)}
                  placeholder="Assunto do email..."
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo do Email</Label>
                <Textarea
                  id="content"
                  value={currentTemplate?.content || ""}
                  onChange={(e) => updateTemplate("content", e.target.value)}
                  placeholder="Conteúdo do email..."
                  rows={12}
                  className="font-mono text-sm w-full min-h-[300px]"
                />
              </div>

              <Card className="bg-blue-50">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {currentTemplate?.variables.map((variable) => (
                      <code key={variable} className="bg-white px-2 py-1 rounded">
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Use estas variáveis no assunto e conteúdo do email. Elas serão substituídas automaticamente pelos dados reais.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}