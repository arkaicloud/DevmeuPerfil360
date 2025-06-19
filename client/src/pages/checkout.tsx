import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Shield, CheckCircle, Crown, CreditCard, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

const CheckoutForm = ({ testId }: { testId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

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

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    
    if (paymentIntent && paymentIntent.status === 'succeeded') {
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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Dados do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement 
            options={{
              layout: 'tabs'
            }}
          />
        </CardContent>
      </Card>

      <Button 
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        size="lg"
      >
        {isProcessing ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processando...
          </div>
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

    const createPaymentIntent = async () => {
      try {
        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testResultId: parseInt(testId) }),
        });

        if (!response.ok) {
          throw new Error("Falha ao criar intenção de pagamento");
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        console.error("Erro ao criar payment intent:", error);
        toast({
          title: "Erro ao Inicializar Pagamento",
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
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Preparando pagamento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
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

      <div className="container mx-auto p-4 max-w-2xl">
        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              Resumo do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Relatório DISC Completo</span>
                <span className="font-medium">R$ 97,00</span>
              </div>
              <div className="flex justify-between items-center text-green-600">
                <span>Desconto aplicado (52%)</span>
                <span>-R$ 50,00</span>
              </div>
              <hr />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <div className="flex items-center gap-2">
                  <span>R$ 47,00</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    52% OFF - Oferta Limitada
                  </Badge>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="font-medium text-sm">Incluído no seu relatório:</p>
                {[
                  "Análise detalhada de 15+ páginas",
                  "Dicas personalizadas de desenvolvimento",
                  "Export em PDF profissional",
                  "Comparação com outros perfis"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
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
                  colorPrimary: '#3b82f6',
                  colorBackground: '#ffffff',
                  colorText: '#1f2937',
                  colorDanger: '#ef4444',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <CheckoutForm testId={testId!} />
          </Elements>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Erro ao carregar sistema de pagamento</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Não foi possível carregar o Stripe. Verifique sua conexão e tente novamente.
                  </p>
                </div>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="default"
                  className="mx-auto"
                >
                  🔄 Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-blue-900 mb-1">Pagamento Seguro</h4>
            <p className="text-xs text-blue-700">
              Seus dados estão protegidos com criptografia de nível bancário. Não armazenamos informações do seu cartão.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}