import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Shield, CheckCircle, Crown, CreditCard, QrCode, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
let stripePromise: Promise<any> | null = null;

const initializeStripe = () => {
  const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!stripePublicKey) {
    console.warn('VITE_STRIPE_PUBLIC_KEY not found in environment variables');
    return null;
  }
  
  try {
    if (!stripePublicKey.startsWith('pk_')) {
      console.error('Invalid Stripe public key format');
      return null;
    }
    
    console.log('Initializing Stripe...');
    return loadStripe(stripePublicKey);
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return null;
  }
};

stripePromise = initializeStripe();

const CheckoutForm = ({ testId }: { testId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      setStripeError('Stripe não foi carregado. Verifique sua conexão com a internet.');
    } else {
      setStripeError(null);
    }
  }, [stripe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Erro no Sistema de Pagamento",
        description: "O sistema de pagamento não foi carregado corretamente. Tente recarregar a página.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Use redirect: 'if_required' para evitar problemas de redirecionamento em alguns ambientes
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    
    // Se bem-sucedido e não redirecionar, atualizamos o status premium e fazemos a navegação manualmente
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Atualizar o status premium do teste
      try {
        await fetch(`/api/test/upgrade/${testId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            paymentIntentId: paymentIntent.id 
          })
        });
        
        toast({
          title: "Pagamento Aprovado!",
          description: "Seu relatório premium foi liberado com sucesso!",
        });
        
        // Redirecionar para a página de resultados com status atualizado
        navigate(`/results/${testId}?payment=success`);
        return;
      } catch (err) {
        console.error("Erro ao atualizar status premium:", err);
        toast({
          title: "Erro ao atualizar relatório",
          description: "O pagamento foi aprovado, mas houve um erro ao liberar seu relatório premium.",
          variant: "destructive",
        });
      }
    }

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Falha no Pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pagamento Realizado com Sucesso!",
        description: "Obrigado pela sua compra! Redirecionando...",
      });
      
      // Redirect will happen automatically via return_url
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {stripeError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <X className="w-4 h-4" />
              <p className="text-sm">{stripeError}</p>
            </div>
            <Button 
              type="button"
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              🔄 Recarregar Página
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 psychology-blue" />
            Dados do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement 
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card', 'ideal', 'sepa_debit']
            }}
          />
        </CardContent>
      </Card>

      <Button 
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full psychology-gradient btn-hover-lift"
        size="lg"
      >
        {isProcessing ? (
          <div className="spinner" />
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Finalizar Pagamento - R$ 47,00
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        🔒 Pagamento 100% seguro processado pela Stripe
      </p>
    </form>
  );
};

export default function Checkout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [testId, setTestId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const id = path.split('/').pop();
    if (id) {
      setTestId(id);
    } else {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (!testId) return;

    // Create PaymentIntent as soon as the page loads
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          testResultId: parseInt(testId) 
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          title: "Erro ao inicializar pagamento",
          description: error.message || "Não foi possível inicializar o pagamento.",
          variant: "destructive",
        });
        navigate(`/results/${testId}`);
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [testId, toast, navigate]);

  if (isLoading || !clientSecret) {
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
                <p className="text-xs opacity-90">Finalizando Compra</p>
              </div>
            </div>
          </div>
        </header>

        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mx-auto mb-4" />
            <p className="text-muted-foreground">Preparando pagamento...</p>
          </div>
        </div>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="psychology-gradient text-white p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 mr-2"
              onClick={() => navigate(`/results/${testId}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">MeuPerfil360</h1>
              <p className="text-xs opacity-90">Finalizar Compra</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Order Summary */}
        <Card className="mb-6 bg-gradient-to-br from-secondary/10 to-primary/10 border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 psychology-purple" />
              Resumo do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Relatório DISC Completo</span>
              <span className="font-medium">R$ 97,00</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Desconto aplicado (52%)</span>
              <span className="text-accent">-R$ 50,00</span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-bold text-foreground">Total</span>
              <div className="text-right">
                <div className="font-bold text-xl psychology-purple">R$ 47,00</div>
                <Badge variant="secondary" className="bg-accent text-white text-xs">
                  52% OFF - Oferta Limitada
                </Badge>
              </div>
            </div>

            {/* Benefits included */}
            <div className="pt-3 border-t">
              <h4 className="font-medium text-foreground mb-3">Incluído no seu relatório:</h4>
              <div className="space-y-2">
                {[
                  "Análise detalhada de 15+ páginas",
                  "Dicas personalizadas de desenvolvimento",
                  "Export em PDF profissional",
                  "Comparação com outros perfis"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 psychology-green flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        {stripePromise && clientSecret ? (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: 'hsl(207, 90%, 54%)',
                  colorBackground: 'hsl(0, 0%, 100%)',
                  colorText: 'hsl(215, 25%, 20%)',
                  colorDanger: 'hsl(0, 84%, 60%)',
                  borderRadius: '12px',
                },
              },
            }}
          >
            <CheckoutForm testId={testId!} />
          </Elements>
        ) : !stripePromise && clientSecret ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Erro ao carregar Stripe.js</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Não foi possível carregar o sistema de pagamento. Verifique sua conexão com a internet e tente novamente.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="default"
                    className="flex-1"
                  >
                    🔄 Tentar Novamente
                  </Button>
                  <Button 
                    onClick={() => navigate(`/results/${testId}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <div className="spinner w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Carregando sistema de pagamento...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aguarde enquanto preparamos o checkout seguro.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 psychology-blue mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-foreground text-sm mb-1">Pagamento Seguro</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Seus dados estão protegidos com criptografia de nível bancário. 
                  Não armazenamos informações do seu cartão.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
