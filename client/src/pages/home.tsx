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
            </div>
          </div>
        </header>

        {/* Data Form */}
        <div className="responsive-container py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-muted/40 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Brain className="w-12 h-12 psychology-blue mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">Seus Dados</h2>
                  <p className="text-sm text-muted-foreground">
                    Precisamos de algumas informações para personalizar seu teste
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="mt-6">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="psychology-gradient text-white mobile-padding py-8">
        <div className="responsive-container">
          {/* Top Navigation */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="font-semibold text-base sm:text-lg">MeuPerfil360</span>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/find-results")}
                className="text-white hover:bg-white/20 touch-button text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Recuperar Resultados</span>
                <span className="sm:hidden">Resultados</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-white hover:bg-white/20 touch-button text-xs sm:text-sm px-2 sm:px-3"
              >
                Login
              </Button>
            </div>
          </div>

          {/* Main Header Content */}
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