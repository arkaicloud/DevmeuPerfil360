import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { registrationSchema, type Registration, type GuestTestData } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, UserPlus, Check } from "lucide-react";
import { sanitizeInput, validateEmail, clientRateLimit, initializeSecureSession } from "@/lib/security";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestData: GuestTestData;
}

export default function RegistrationModal({ isOpen, onClose, guestData }: RegistrationModalProps) {
  const { toast } = useToast();

  const form = useForm<Registration>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: guestData.name || "",
      email: guestData.email || "",
      whatsapp: guestData.whatsapp || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Update form fields when guestData changes
  useEffect(() => {
    if (guestData) {
      form.setValue("username", guestData.name || "");
      form.setValue("email", guestData.email || "");
      form.setValue("whatsapp", guestData.whatsapp || "");
    }
  }, [guestData, form]);

  const registerMutation = useMutation({
    mutationFn: async (data: Registration) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conta criada com sucesso!",
        description: "Você pode agora fazer login e acessar seus testes.",
      });
      onClose();
      // Could redirect to login or dashboard here
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Registration) => {
    // Security validation before submission
    if (!clientRateLimit.isAllowed('registration', 3, 300000)) { // 3 attempts per 5 minutes
      toast({
        title: "Muitas tentativas",
        description: "Aguarde alguns minutos antes de tentar novamente.",
        variant: "destructive",
      });
      return;
    }

    // Sanitize input data
    const sanitizedData: Registration = {
      ...data,
      username: sanitizeInput(data.username),
      email: sanitizeInput(data.email.toLowerCase()),
      password: data.password, // Don't sanitize password as it may contain special chars
    };

    // Additional email validation
    if (!validateEmail(sanitizedData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, verifique o formato do email.",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(sanitizedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Criar Conta Gratuita
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <UserPlus className="w-12 h-12 psychology-blue mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Crie sua conta para salvar resultados, acessar histórico e fazer novos testes
            </p>
          </div>

          {/* Registration Form */}
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
                        placeholder="Como você quer ser chamado"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
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

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite a senha novamente"
                        className="input-focus"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Terms Checkbox */}
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms"
                  className="mt-1"
                />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <Label htmlFor="terms" className="cursor-pointer">
                    Ao criar a conta, você concorda com nossos{" "}
                    <span className="text-primary underline">Termos de Uso</span> e{" "}
                    <span className="text-primary underline">Política de Privacidade</span>
                  </Label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full psychology-gradient btn-hover-lift"
                size="lg"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Conta
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Benefits List */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3">Benefícios da conta:</h4>
              <div className="space-y-2">
                {[
                  "Salvar todos os seus testes",
                  "Acessar histórico completo",
                  "Comparar resultados ao longo do tempo",
                  "Acesso a novos testes gratuitos"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 psychology-green flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
