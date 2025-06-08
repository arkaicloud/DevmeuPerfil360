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
        <header className="psychology-gradient text-white mobile-padding py-6">
          <div className="responsive-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
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
      <header className="psychology-gradient text-white mobile-padding py-8">
        <div className="responsive-container">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">MeuPerfil360</h1>
              <p className="text-sm sm:text-base opacity-90">Descubra seu perfil comportamental DISC</p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="responsive-container py-8">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-psychology-blue">
            Descubra seu Perfil Comportamental
          </h2>
          <p className="mobile-text text-muted-foreground mb-8 max-w-2xl mx-auto">
            O teste DISC é uma ferramenta poderosa que revela suas características comportamentais, 
            ajudando você a entender como se relaciona, comunica e toma decisões.
          </p>

          {/* Main CTA Button */}
          <Button
            onClick={() => setShowDataForm(true)}
            className="psychology-gradient mobile-button touch-button shadow-xl mb-12"
            size="lg"
          >
            <Brain className="w-5 h-5 mr-2" />
            Iniciar Teste Gratuito
          </Button>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="text-center hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartPie className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="font-semibold mb-2">Análise Completa</h3>
                <p className="text-sm text-muted-foreground">Descubra seus padrões comportamentais detalhados</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-300" />
                </div>
                <h3 className="font-semibold mb-2">Relatório Premium</h3>
                <p className="text-sm text-muted-foreground">PDF completo com insights personalizados</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                </div>
                <h3 className="font-semibold mb-2">Baseado em Ciência</h3>
                <p className="text-sm text-muted-foreground">Metodologia DISC validada cientificamente</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                </div>
                <h3 className="font-semibold mb-2">Teste Gratuito</h3>
                <p className="text-sm text-muted-foreground">Comece agora sem compromisso</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="outline"
              onClick={() => navigate("/find-results")}
              className="mobile-button touch-button"
            >
              Recuperar Resultados
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="mobile-button touch-button"
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bg-muted/30 mobile-padding py-8 mt-16">
        <div className="responsive-container text-center">
          <p className="mobile-text text-muted-foreground">
            Já usado por mais de 10.000 pessoas para descobrir seu perfil comportamental
          </p>
        </div>
      </div>
    </div>
  );
}
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

          {/* CTA Section */}
          <div className="text-center mobile-stack">
            <Button
              onClick={() => setShowDataForm(true)}
              className="psychology-gradient mobile-button touch-button"
              size="lg"
            >
              <Brain className="w-4 h-4 mr-2" />
              Começar Teste Gratuito
            </Button>
            
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