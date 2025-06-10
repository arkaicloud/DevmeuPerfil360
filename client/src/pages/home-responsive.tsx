import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { guestTestDataSchema, type GuestTestData } from "@shared/schema";
import { Brain, Gift, ChartPie, FileText, User, MessageCircle, Mail, Shield } from "lucide-react";

interface PricingConfig {
  regularPrice: string;
  promocionalPrice: string;
  isPromotionActive: boolean;
  currentPrice: string;
}

export default function Home() {
  const [showDataForm, setShowDataForm] = useState(false);
  const [, navigate] = useLocation();

  const { data: pricing } = useQuery<PricingConfig>({
    queryKey: ["/api/pricing"],
  });

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
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 mobile-padding">
        <div className="responsive-container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">MeuPerfil360</h1>
                <p className="text-xs sm:text-sm text-gray-600">Descubra seu perfil comportamental</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 touch-button"
                onClick={() => navigate("/find-results")}
              >
                Recuperar Teste
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50 touch-button"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="mobile-padding">
        <div className="responsive-container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Descubra o Poder do<br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Método DISC
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Uma poderosa ferramenta de autoconhecimento que analisa seu perfil comportamental em quatro dimensões:
              <span className="font-semibold"> Dominância, Influência, Estabilidade e Conformidade.</span>
            </p>
          </div>

          {/* Early CTA Button */}
          <div className="text-center mb-16">
            <Button
              onClick={() => setShowDataForm(true)}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-4 text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <Brain className="w-6 h-6 mr-3" />
              Fazer Teste Grátis Agora
            </Button>
            <p className="text-sm text-gray-500 mt-3">
              ⚡ Resultado em 5 minutos • 100% gratuito • Sem cadastro inicial
            </p>
          </div>

          {/* DISC Dimensions */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Conheça as 4 Dimensões do DISC
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Cada letra representa um estilo comportamental único. Descubra qual combina mais com você.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* D - Dominância */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-red-100 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">D</span>
                  </div>
                  <h3 className="text-xl font-bold text-red-600 mb-2">Dominância</h3>
                  <p className="text-sm text-gray-600 font-medium">O Líder</p>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Direto e decisivo</p>
                  <p>• Gosta de desafios</p>
                  <p>• Foco em resultados</p>
                  <p>• Assume controle</p>
                </div>
              </div>

              {/* I - Influência */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-orange-100 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">I</span>
                  </div>
                  <h3 className="text-xl font-bold text-orange-600 mb-2">Influência</h3>
                  <p className="text-sm text-gray-600 font-medium">O Comunicador</p>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Sociável e entusiasta</p>
                  <p>• Persuasivo</p>
                  <p>• Otimista</p>
                  <p>• Inspira outros</p>
                </div>
              </div>

              {/* S - Estabilidade */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-green-100 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">S</span>
                  </div>
                  <h3 className="text-xl font-bold text-green-600 mb-2">Estabilidade</h3>
                  <p className="text-sm text-gray-600 font-medium">O Colaborador</p>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Paciente e confiável</p>
                  <p>• Trabalha em equipe</p>
                  <p>• Prefere estabilidade</p>
                  <p>• Leal e dedicado</p>
                </div>
              </div>

              {/* C - Conformidade */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-blue-100 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">C</span>
                  </div>
                  <h3 className="text-xl font-bold text-blue-600 mb-2">Conformidade</h3>
                  <p className="text-sm text-gray-600 font-medium">O Analista</p>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Preciso e sistemático</p>
                  <p>• Busca qualidade</p>
                  <p>• Analítico</p>
                  <p>• Segue padrões</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-8 border border-blue-100">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  🎯 Sua Combinação Única
                </h3>
                <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
                  Você possui características de todos os perfis, mas alguns se destacam mais. 
                  O teste DISC identifica sua combinação única e revela como usar isso a seu favor 
                  na comunicação, liderança e relacionamentos.
                </p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">100% Gratuito</h4>
                <p className="text-sm text-gray-600">Teste completo sem custos</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ChartPie className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Resultado Imediato</h4>
                <p className="text-sm text-gray-600">Veja seu perfil em tempo real</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Export em PDF</h4>
                <p className="text-sm text-gray-600">Salve e compartilhe seus resultados</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">100% Seguro</h4>
                <p className="text-sm text-gray-600">Seus dados estão protegidos</p>
              </div>
            </div>
          </div>

          {/* Pricing Comparison */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Escolha Seu Caminho</h2>
              <p className="text-lg text-gray-600">Comece hoje mesmo a construir a melhor versão de você</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Free Version */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl mb-4">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Teste Grátis</h3>
                  <p className="text-gray-600">A Base do Seu Perfil</p>
                  <div className="text-3xl font-bold text-green-600 mt-4">R$ 0</div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-700">Perfil comportamental básico</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-700">Análise do estilo predominante</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-700">Resultado imediato</p>
                  </div>
                </div>

                <Button
                  onClick={() => setShowDataForm(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 text-lg font-semibold"
                >
                  Começar Teste Grátis
                </Button>
              </div>

              {/* Premium Version */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 p-8 shadow-lg relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    MAIS POPULAR
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-4">
                    <ChartPie className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Relatório Premium</h3>
                  <p className="text-gray-600">O Mapa Completo da Sua Jornada</p>
                  <div className="mt-4">
                    {pricing?.isPromotionActive ? (
                      <div className="text-center">
                        <div className="text-lg text-gray-500 line-through">De R$ {pricing.regularPrice}</div>
                        <div className="text-3xl font-bold text-green-600">Por R$ {pricing.promocionalPrice}</div>
                        <div className="text-sm text-green-700 font-medium mt-1">Oferta Limitada!</div>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold text-blue-600">R$ {pricing?.currentPrice || '47'}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Pontos Fortes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Desenvolvimento</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Sob Pressão</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Fatores de Apoio</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Ambientes Ideais</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Carreiras</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Plano 4 Semanas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Recursos</span>
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-4 mb-6 border border-blue-100">
                  <p className="text-sm text-gray-700 text-center font-medium">
                    Um guia prático e profundo para usar seu perfil como alavanca para seus objetivos
                  </p>
                </div>

                <Button
                  onClick={() => setShowDataForm(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 text-lg font-semibold shadow-lg"
                >
                  Começar e Fazer Upgrade
                </Button>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center py-16 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Pronto para se descobrir?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Milhares de pessoas já transformaram suas vidas com o método DISC. Sua vez chegou.
            </p>
            <Button
              onClick={() => setShowDataForm(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg"
            >
              <Brain className="w-5 h-5 mr-2" />
              Começar Meu Teste Agora
            </Button>
            <div className="flex items-center justify-center space-x-6 mt-6 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Teste gratuito
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Resultado imediato
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Premium disponível
              </div>
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