import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    // Store guest data in sessionStorage for the test
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
        <header className="psychology-gradient text-white p-4 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">MeuPerfil360</h1>
                <p className="text-xs opacity-90">Descubra seu perfil comportamental</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium psychology-blue">Passo 1 de 3</span>
              <span className="text-sm text-muted-foreground">Seus Dados</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full progress-animate" style={{ width: "33%" }} />
            </div>
          </div>

          <div className="text-center mb-8">
            <User className="w-12 h-12 psychology-blue mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Quase lá!</h2>
            <p className="text-muted-foreground text-sm">Precisamos de alguns dados para personalizar seu teste</p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        className="input-focus"
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
                        className="input-focus"
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
                        className="input-focus"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Privacy Notice */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 psychology-blue mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-foreground text-sm mb-1">Seus dados estão seguros</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Utilizamos suas informações apenas para personalizar seu teste e enviar os resultados. 
                        Não compartilhamos com terceiros.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full psychology-gradient btn-hover-lift"
                  size="lg"
                >
                  Continuar para o Teste
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDataForm(false)}
                >
                  Voltar
                </Button>
              </div>
            </form>
          </Form>
        </div>
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
              <p className="text-xs opacity-90">Descubra seu perfil comportamental</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="p-6">
        <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl mb-6">
          <div className="w-full h-48 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl mb-6 flex items-center justify-center">
            <div className="text-center">
              <Brain className="w-16 h-16 psychology-blue mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground">Teste DISC Gratuito</h2>
              <p className="text-sm text-muted-foreground mt-2">Descubra seu perfil comportamental em minutos</p>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-3">Conheça seu Perfil Comportamental</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Faça nosso teste DISC gratuito e descubra características únicas da sua personalidade. 
              Ideal para autoconhecimento e desenvolvimento pessoal.
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-4 mb-6">
          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                  <Gift className="w-6 h-6 psychology-green" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Teste DISC Gratuito</h4>
                  <p className="text-sm text-muted-foreground">24 perguntas rápidas e precisas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/10 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center">
                  <ChartPie className="w-6 h-6 psychology-purple" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Relatório Detalhado</h4>
                  <p className="text-sm text-muted-foreground">Análise completa do seu perfil</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 psychology-blue" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Export em PDF</h4>
                  <p className="text-sm text-muted-foreground">Salve e compartilhe seus resultados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Button */}
        <div className="space-y-4">
          <Button 
            onClick={() => setShowDataForm(true)}
            className="w-full psychology-gradient btn-hover-lift"
            size="lg"
          >
            Começar Teste Gratuito
          </Button>
          
          <p className="text-center text-xs text-muted-foreground mb-3">
            ✓ 100% Gratuito ✓ Resultado Imediato ✓ Baseado em Ciência
          </p>
          
          <Button 
            variant="link" 
            className="w-full text-sm psychology-blue"
            onClick={() => navigate("/find-results")}
          >
            Já fez o teste? Recupere seus resultados aqui
          </Button>
        </div>
      </div>
    </div>
  );
}
