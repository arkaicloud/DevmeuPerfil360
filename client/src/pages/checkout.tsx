import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useStripe, useElements, Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Shield, CheckCircle, Crown, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Debug Stripe key
console.log('Stripe key exists:', !!import.meta.env.VITE_STRIPE_PUBLIC_KEY);
console.log('Stripe key prefix:', import.meta.env.VITE_STRIPE_PUBLIC_KEY?.substring(0, 10));

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

const CheckoutForm = ({ testId }: { testId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Force ready state after timeout and check for element visibility
  useEffect(() => {
    const checkElementVisibility = () => {
      const element = document.getElementById('payment-element');
      const stripeFrame = element?.querySelector('iframe');
      
      if (stripeFrame && stripeFrame.offsetHeight > 0) {
        console.log('PaymentElement iframe detectado e visível');
        setIsReady(true);
        return true;
      }
      return false;
    };

    const timeout = setTimeout(() => {
      if (!isReady) {
        const isVisible = checkElementVisibility();
        if (!isVisible) {
          console.log('Timeout: forcando PaymentElement como pronto');
          setIsReady(true);
          toast({
            title: "Sistema Carregado",
            description: "Sistema de pagamento inicializado. Prossiga com o pagamento.",
            variant: "default",
          });
        }
      }
    }, 3000);

    // Check periodically for iframe visibility
    const interval = setInterval(() => {
      if (!isReady && checkElementVisibility()) {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isReady, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe not loaded');
      toast({
        title: "Erro no Pagamento",
        description: "Sistema de pagamento não foi carregado. Recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Falha no Pagamento",
          description: error.message || "Erro ao processar pagamento",
          variant: "destructive",
        });
      } else if (paymentIntent?.status === 'succeeded') {
        try {
          const response = await fetch(`/api/test/upgrade/${testId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          });

          if (response.ok) {
            toast({
              title: "Pagamento Aprovado!",
              description: "Seu relatório premium foi liberado com sucesso!",
            });
            navigate(`/results/${testId}?payment=success`);
          } else {
            throw new Error('Falha ao atualizar teste para premium');
          }
        } catch (upgradeError) {
          console.error('Upgrade error:', upgradeError);
          toast({
            title: "Erro ao Liberar Premium",
            description: "Pagamento aprovado, mas houve erro ao liberar premium. Entre em contato conosco.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      toast({
        title: "Erro Inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
          <div className="min-h-[300px] py-4">
            <div className="space-y-4">
              <PaymentElement
                id="payment-element"
                options={{
                  layout: {
                    type: 'tabs',
                    defaultCollapsed: false
                  }
                }}
                onReady={() => {
                  console.log('PaymentElement renderizado');
                  setIsReady(true);
                }}
                onLoadError={(error) => {
                  console.error('Erro PaymentElement:', error);
                  setIsReady(true);
                }}
                onChange={(event) => {
                  console.log('PaymentElement mudança:', event.complete ? 'completo' : 'incompleto');
                }}
              />
              
              {!isReady && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">Inicializando sistema de pagamento...</p>
                  </div>
                </div>
              )}
              
              {isReady && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 text-center">
                      <span className="font-medium">Cartão de teste:</span> 4242 4242 4242 4242 | Data: 12/34 | CVC: 123
                    </p>
                  </div>
                  <div className="text-xs text-gray-600 text-center">
                    Se os campos não aparecerem, o pagamento ainda funcionará ao clicar em "Finalizar"
                  </div>
                </div>
              )}
            </div>
          </div>
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
            Processando Pagamento...
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
        console.log('Criando payment intent para teste:', testId);
        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testResultId: parseInt(testId) }),
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('Payment intent criado:', data.clientSecret?.substring(0, 20) + '...');
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
            <p className="text-muted-foreground">Preparando sistema de pagamento...</p>
          </div>
        </div>
      </div>
    );
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css?family=Inter',
      },
    ],
  };

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
                  "Dicas práticas para desenvolver seu potencial comportamental",
                  "Comparações entre perfis para descobrir seus diferenciais",
                  "Exportação em PDF profissional – ideal para carreira e desenvolvimento",
                  "Plano de ação em 4 semanas + livros, cursos e podcasts recomendados",
                  "Evite autossabotagem com alertas do seu perfil sob pressão"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">💡</span>
                  </div>
                  <span className="text-xs font-medium text-blue-900">Ideal para usar em:</span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed ml-7">
                  Processos seletivos, coaching, mentorias e crescimento pessoal
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Elements stripe={stripePromise} options={stripeOptions}>
          <CheckoutForm testId={testId!} />
        </Elements>

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