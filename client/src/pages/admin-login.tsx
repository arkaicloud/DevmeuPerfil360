import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, Lock, User, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { securityManager, getSecureHeaders, validateAndSanitizeInput } from "@/lib/security-enhanced";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityWarning, setSecurityWarning] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const { toast } = useToast();

  // Verificar tentativas de login na inicialização
  useEffect(() => {
    const check = securityManager.checkLoginAttempts('admin-login');
    if (!check.allowed) {
      setLockoutTime(check.lockoutTime || 0);
      setSecurityWarning(`Conta bloqueada por ${check.lockoutTime} minutos devido a tentativas excessivas`);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      // Verificar rate limiting
      const attemptCheck = securityManager.checkLoginAttempts('admin-login');
      if (!attemptCheck.allowed) {
        throw new Error(`Muitas tentativas. Tente novamente em ${attemptCheck.lockoutTime} minutos`);
      }

      // Detectar atividade suspeita
      if (securityManager.detectSuspiciousActivity('admin-login', 3, 300000)) {
        securityManager.securityLog('Atividade suspeita detectada', { email: credentials.email });
        throw new Error('Atividade suspeita detectada. Aguarde alguns minutos');
      }

      // Validar e sanitizar dados
      const sanitizedCredentials = validateAndSanitizeInput(credentials);
      
      if (!securityManager.validateEmail(sanitizedCredentials.email)) {
        throw new Error('Email inválido');
      }

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: getSecureHeaders(),
        body: JSON.stringify(sanitizedCredentials)
      });

      if (!response.ok) {
        throw new Error('Credenciais inválidas');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Registrar login bem-sucedido
      securityManager.recordLoginAttempt('admin-login', true);
      securityManager.securityLog('Login administrativo bem-sucedido', { email: data.email });
      
      // Armazenar sessão segura
      securityManager.setSecureSession(data.id, data);
      
      setSecurityWarning("");
      setRemainingAttempts(null);
      setLockoutTime(null);
      
      navigate("/admin/dashboard");
    },
    onError: (error: any) => {
      // Registrar tentativa falhada
      securityManager.recordLoginAttempt('admin-login', false);
      securityManager.securityLog('Tentativa de login falhada', { email, error: error.message });
      
      const attemptCheck = securityManager.checkLoginAttempts('admin-login');
      
      if (!attemptCheck.allowed) {
        setLockoutTime(attemptCheck.lockoutTime || 0);
        setSecurityWarning(`Conta bloqueada por ${attemptCheck.lockoutTime} minutos`);
      } else if (attemptCheck.remainingAttempts) {
        setRemainingAttempts(attemptCheck.remainingAttempts);
        setSecurityWarning(`${attemptCheck.remainingAttempts} tentativas restantes`);
      }

      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações de segurança
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Email e senha são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (lockoutTime && lockoutTime > 0) {
      toast({
        title: "Conta bloqueada",
        description: `Aguarde ${lockoutTime} minutos para tentar novamente`,
        variant: "destructive",
      });
      return;
    }

    // Sanitizar entrada
    const sanitizedEmail = securityManager.sanitizeInput(email);
    const sanitizedPassword = password; // Não sanitizar senha para preservar caracteres especiais

    if (!securityManager.validateEmail(sanitizedEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ email: sanitizedEmail, password: sanitizedPassword });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Painel Administrativo</CardTitle>
          <p className="text-muted-foreground">MeuPerfil360</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do Administrador</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@meuperfil360.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar no Painel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}