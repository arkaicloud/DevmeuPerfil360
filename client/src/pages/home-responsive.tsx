import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { guestTestDataSchema, type GuestTestData } from "@shared/schema";
import { Brain, Gift, ChartPie, FileText, User, MessageCircle, Mail, Shield } from "lucide-react";

export default function Home() {
  const [showDataForm, setShowDataForm] = useState(false);
  const [, navigate] = useLocation();

  const form = useForm<GuestTestData>({
    resolver: zodResolver(guestTestDataSchema),
    defaultValues: {
      name: "",
      email: "",
      whatsapp: "",
    },
  });

  const onSubmit = (data: GuestTestData) => {
    sessionStorage.setItem("guestTestData", JSON.stringify(data));
    navigate("/test");
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length >= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (numbers.length >= 7) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (numbers.length >= 3) {
      return numbers.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    }
    return numbers;
  };

  if (showDataForm) {
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
                  <p className="text-xs sm:text-sm opacity-90">Descubra seu perfil comportamental</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 touch-button"
                onClick={() => navigate("/login")}
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </header>

        <div className="mobile-padding">
          <div className="responsive-container">
            {/* Progress Bar */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium psychology-blue">Passo 1 de 3</span>
                <span className="text-sm text-muted-foreground">Seus Dados</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full progress-animate" style={{ width: "33%" }} />
              </div>
            </div>

            <div className="text-center mb-6 sm:mb-8">
              <User className="w-10 h-10 sm:w-12 sm:h-12 psychology-blue mx-auto mb-4" />
              <h2 className="mobile-title font-bold text-foreground mb-2">Quase lá!</h2>
              <p className="mobile-text text-muted-foreground">Precisamos de alguns dados para personalizar seu teste</p>
            </div>
          </div>

          {/* Form */}
          <div className="responsive-container">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mobile-stack max-w-md mx-auto lg:max-w-lg">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4 psychology-blue" />
                        Nome Completo
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite seu nome completo"
                          className="input-focus touch-button"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 psychology-green" />
                        WhatsApp
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          className="input-focus touch-button"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatWhatsApp(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4 psychology-purple" />
                        E-mail
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          className="input-focus touch-button"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="psychology-gradient mobile-button touch-button"
                    size="lg"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Iniciar Teste DISC
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Security Notice */}
          <div className="responsive-container mt-6">
            <Card className="bg-muted/50 border-muted/80 max-w-md mx-auto lg:max-w-lg">
              <CardContent className="p-4 text-center">
                <Shield className="w-6 h-6 psychology-blue mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Seus dados estão protegidos e serão usados apenas para personalizar seu teste.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
                <p className="text-xs sm:text-sm opacity-90">Descubra seu perfil comportamental</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 touch-button"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="mobile-padding">
        <div className="responsive-container">
          <div className="relative mobile-card bg-gradient-to-br from-primary/10 to-secondary/10 mb-6">
            <div className="w-full h-32 sm:h-48 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg mb-6 flex items-center justify-center">
              <div className="text-center">
                <Brain className="w-12 h-12 sm:w-16 sm:h-16 psychology-blue mx-auto mb-4" />
                <h2 className="mobile-subtitle font-bold text-foreground">Teste DISC Gratuito</h2>
                <p className="mobile-text text-muted-foreground mt-2">Descubra seu perfil comportamental em minutos</p>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="mobile-title font-bold text-foreground mb-3">🎯 Descubra o Poder do Método DISC</h3>
              <p className="mobile-text text-muted-foreground leading-relaxed mb-6">
                O método DISC é uma poderosa ferramenta de autoconhecimento que analisa seu perfil comportamental em quatro dimensões:
                <strong> Dominância, Influência, Estabilidade e Conformidade.</strong>
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 font-medium mb-2">🔎 Com ele, você identifica como se comunica, toma decisões, lida com desafios e se adapta aos ambientes.</p>
                <p className="text-sm text-gray-700">💡 <strong>Por que é importante?</strong> Porque conhecer seu perfil ajuda a melhorar suas relações, potencializar seus pontos fortes e evoluir nos desafios do dia a dia — seja na carreira ou na vida pessoal.</p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mobile-grid-2 mb-6">
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="mobile-card">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/20 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 sm:w-6 sm:h-6 psychology-green" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mobile-text">100% Gratuito</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Teste completo sem custos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/10 border-secondary/20">
              <CardContent className="mobile-card">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/20 rounded-full flex items-center justify-center">
                    <ChartPie className="w-5 h-5 sm:w-6 sm:h-6 psychology-purple" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mobile-text">Resultado Imediato</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Veja seu perfil em tempo real</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="mobile-card">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 psychology-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mobile-text">Export em PDF</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Salve e compartilhe seus resultados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="mobile-card">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/20 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 psychology-green" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mobile-text">100% Seguro</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Seus dados estão protegidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Free vs Premium Comparison */}
          <div className="mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free Test */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">✨ Teste Grátis</h3>
                    <p className="text-sm text-green-700 font-medium">A Base do Seu Perfil</p>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 text-center">
                    Você pode começar gratuitamente, acessando um teste básico que te mostra o seu estilo predominante e já traz clareza para o seu perfil comportamental.
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      Perfil comportamental básico
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      Análise do estilo predominante
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      Resultado imediato
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowDataForm(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Começar Grátis
                  </Button>
                </CardContent>
              </Card>

              {/* Premium Test */}
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                    🚀 RECOMENDADO
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ChartPie className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-purple-800 mb-2">🚀 Teste Premium</h3>
                    <p className="text-sm text-purple-700 font-medium">O Mapa Completo da Sua Jornada</p>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 text-center">
                    Para quem deseja ir além e transformar resultados, a versão premium inclui:
                  </p>
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      💪 Principais Pontos Fortes
                    </div>
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      🌱 Áreas de Desenvolvimento
                    </div>
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      ⚠️ Comportamento Sob Pressão
                    </div>
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      🎯 Plano de Ação de 4 Semanas
                    </div>
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      📚 Livros e Podcasts Recomendados
                    </div>
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      💼 Carreiras Ideais
                    </div>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-3 mb-4">
                    <p className="text-xs text-purple-800 font-medium text-center">
                      💎 Com o premium, você tem um guia prático e profundo para usar seu perfil como alavanca para seus objetivos.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowDataForm(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    size="lg"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Começar e Upgradar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mobile-stack">
            <p className="text-lg font-semibold text-gray-800 mb-4">
              👉 Escolha seu caminho e comece hoje mesmo a construir a melhor versão de você.
            </p>
            
            <div className="text-xs sm:text-sm text-muted-foreground">
              ✓ Teste gratuito • ✓ Resultado imediato • ✓ Relatório premium disponível
            </div>
          </div>

          {/* Additional Options */}
          <div className="mt-8">
            <Card className="bg-muted/50 border-muted/80">
              <CardContent className="mobile-card text-center">
                <p className="mobile-text text-muted-foreground mb-4">
                  Já fez o teste? Recupere seus resultados
                </p>
                <Button 
                  variant="outline" 
                  className="mobile-button touch-button"
                  onClick={() => navigate("/find-results")}
                >
                  Buscar Meus Resultados
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}