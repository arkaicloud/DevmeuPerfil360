import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain, Search, Key } from "lucide-react";
import { sanitizeInput, validateEmail, clientRateLimit } from "@/lib/security";

const findResultSchema = z.object({
  identifier: z.string().min(5, "Digite um email ou WhatsApp válido"),
});

type FindResultFormData = z.infer<typeof findResultSchema>;

export default function FindResults() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<FindResultFormData>({
    resolver: zodResolver(findResultSchema),
    defaultValues: {
      identifier: "",
    },
  });

  const findResultMutation = useMutation({
    mutationFn: async (data: FindResultFormData) => {
      // First, check if user exists in the system
      let userExists = false;
      if (data.identifier.includes('@')) {
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: data.identifier, 
              password: 'dummy-check' 
            })
          });
          
          if (loginResponse.ok) {
            const responseData = await loginResponse.json();
            // If login succeeds or redirects to Clerk, user exists
            userExists = true;
          } else if (loginResponse.status === 401) {
            const errorText = await loginResponse.text();
            // If error mentions password, user exists but password is wrong
            userExists = errorText.includes('Senha incorreta') || errorText.includes('password');
          }
        } catch (error) {
          console.log("User check failed, continuing with normal flow");
        }
      }

      // If user exists, redirect to login with a message
      if (userExists) {
        toast({
          title: "Usuário encontrado!",
          description: "Você já tem uma conta. Faça login para acessar seus resultados.",
        });
        setTimeout(() => {
          navigate("/login");
        }, 2000);
        return { redirectToLogin: true };
      }

      // If user doesn't exist, proceed with normal test search
      const response = await fetch("/api/test/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.redirectToLogin) {
        return; // Don't navigate, already handled above
      }
      if (data.testResultId) {
        // Mark that user came from find-results for privacy protection
        sessionStorage.setItem('fromFindResults', 'true');
        navigate(`/results/${data.testResultId}`);
      } else {
        toast({
          title: "Teste não encontrado",
          description: "Por favor, realize seu teste DISC primeiro.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      // Check if it's a 404 error (not found)
      if (error.message.includes('404')) {
        toast({
          title: "Teste não encontrado",
          description: "Por favor, realize seu teste DISC primeiro para acessar seus resultados.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao buscar resultados",
          description: error.message || "Ocorreu um erro. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: FindResultFormData) => {
    // Security validation before submission
    if (!clientRateLimit.isAllowed('find_results', 5, 300000)) { // 5 attempts per 5 minutes
      toast({
        title: "Muitas tentativas",
        description: "Aguarde alguns minutos antes de buscar novamente.",
        variant: "destructive",
      });
      return;
    }

    // Sanitize input data
    const sanitizedData: FindResultFormData = {
      identifier: sanitizeInput(data.identifier.toLowerCase()),
    };

    // Additional validation
    const isEmail = sanitizedData.identifier.includes('@');
    if (isEmail && !validateEmail(sanitizedData.identifier)) {
      toast({
        title: "Email inválido",
        description: "Por favor, verifique o formato do email.",
        variant: "destructive",
      });
      return;
    }

    findResultMutation.mutate(sanitizedData);
  };

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
              <p className="text-xs opacity-90">Recuperar Resultados</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => navigate("/")}
          >
            Início
          </Button>
        </div>
      </header>

      <div className="p-6">
        <div className="text-center mb-8">
          <Search className="w-12 h-12 psychology-blue mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Recupere Seus Resultados</h2>
          <p className="text-muted-foreground text-sm">
            Digite seu email ou WhatsApp para encontrar seu teste DISC
          </p>
        </div>

        <Card className="mb-6 max-w-md mx-auto">
          <CardContent className="p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Key className="w-4 h-4 psychology-blue" />
                        Email ou WhatsApp
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Informe o mesmo email ou WhatsApp usado no teste"
                          className="input-focus"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full psychology-gradient btn-hover-lift"
                  size="lg"
                  disabled={findResultMutation.isPending}
                >
                  {findResultMutation.isPending ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Buscar Meus Resultados
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-muted/80 max-w-md mx-auto">
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Quer ter acesso a todos os seus testes em um só lugar?
              </p>
              <Button 
                variant="link" 
                className="psychology-blue"
                onClick={() => navigate("/")}
              >
                Crie uma conta gratuita
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}