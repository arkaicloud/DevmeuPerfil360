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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-purple-600">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-blue-400 to-purple-500 text-white">
        {/* Top Navigation */}
        <div className="w-full py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="font-semibold text-lg">MeuPerfil360</span>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/find-results")}
                className="text-white hover:bg-white/20 border-white/30 text-sm font-medium"
              >
                Recuperar Resultados
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="text-white hover:bg-white/20 border-white/30 text-sm font-medium"
              >
                Login
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="text-center py-16 px-4 sm:px-6 lg:px-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            MeuPerfil360
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Descubra seu perfil comportamental DISC
          </p>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="bg-white">
        <div className="responsive-container section-spacing">
          <div className="text-center content-spacing max-w-4xl mx-auto">
            <h2 className="responsive-subtitle text-slate-700 mb-4 font-semibold">
              Descubra seu Perfil Comportamental
            </h2>
            
            <p className="responsive-body text-slate-600 max-w-2xl mx-auto mb-8">
              O teste DISC é uma ferramenta poderosa que revela suas características comportamentais, ajudando você a entender como se relaciona, comunica e toma decisões.
            </p>
            
            <Button 
              onClick={() => setShowDataForm(true)}
              size="lg"
              className="btn-responsive btn-hover-lift bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-full text-lg shadow-lg"
            >
              Iniciar Teste Gratuito
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 sm:mt-20 lg:mt-24">
          <Card className="bg-blue-50 border-blue-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
            <CardContent className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <ChartPie className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Análise Completa</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Descubra seus padrões comportamentais detalhados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
            <CardContent className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Relatório Premium</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                PDF completo com insights personalizados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
            <CardContent className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Baseado em Ciência</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Metodologia DISC validada cientificamente
              </p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
            <CardContent className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Teste Gratuito</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Comece agora sem compromisso
              </p>
            </CardContent>
          </Card>
          </div>

          {/* Social Proof */}
          <div className="text-center mt-16 sm:mt-20">
            <p className="responsive-body text-slate-600">
              Já usado por mais de 10.000 pessoas para descobrir seu perfil comportamental
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}