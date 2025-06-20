import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Brain, LogIn, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao fazer login");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Store user data in localStorage
      localStorage.setItem("currentUser", JSON.stringify(data));

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${data.username}!`,
      });
      navigate(`/dashboard/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no Login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Barra de Navegação Superior */}
      <nav className="bg-gradient-to-r from-purple-700 via-purple-600 to-blue-600 text-white shadow-xl border-b-2 border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Título */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">MeuPerfil360</h1>
                <p className="text-sm opacity-90">Plataforma de Avaliação DISC</p>
              </div>
            </div>
            
            {/* Botão Início */}
            <div className="flex items-center space-x-4">
              <Button
                variant="secondary"
                className="bg-white text-purple-700 hover:bg-gray-100 font-semibold px-6 py-2 rounded-full shadow-md transition-all duration-200 hover:shadow-lg"
                onClick={() => navigate("/")}
              >
                ← Início
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-6 pt-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <LogIn className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesse sua conta</h2>
            <p className="text-gray-600 text-sm">
              Entre para ver seus testes e relatórios
            </p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-center">Login</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de usuário</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite seu nome de usuário"
                            {...field}
                            disabled={loginMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              {...field}
                              disabled={loginMutation.isPending}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-secondary to-primary text-white btn-hover-lift"
                    size="lg"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <div className="spinner mr-2" />
                    ) : (
                      <LogIn className="w-4 h-4 mr-2" />
                    )}
                    Entrar
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal psychology-blue"
                    onClick={() => navigate("/")}
                  >
                    Faça o teste gratuito
                  </Button>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Esqueceu seus dados?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal psychology-blue"
                    onClick={() => navigate("/find-results")}
                  >
                    Recuperar teste
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}