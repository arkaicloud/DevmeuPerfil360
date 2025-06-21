import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ArrowLeft, Shield, CheckCircle, Crown, CreditCard, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface TestResult {
  id: number;
  profileType: string;
  isPremium: boolean;
  guestName: string;
}

interface PricingData {
  regularPrice: string;
  promocionalPrice: string;
  isPromoActive: boolean;
}

// Initialize Stripe with environment check
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ testId, pricing }: { testId: string; pricing: PricingData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required'
      });

      if (error) {
        toast({
          title: "Erro no Pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded, verify and redirect
        const response = await fetch('/api/verify-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            testId: parseInt(testId)
          })
        });

        const result = await response.json();
        
        if (result.success) {
          toast({
            title: "Pagamento Aprovado!",
            description: "Redirecionando para seus resultados premium...",
          });
          
          setTimeout(() => {
            navigate(`/results/${testId}?payment=success`);
          }, 1500);
        } else {
          throw new Error('Erro na verificação do pagamento');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Relatório Premium DISC</span>
          <span className="text-sm font-bold text-gray-900">R$ {pricing.promocionalPrice}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Desconto aplicado</span>
          <span>- R$ {(parseInt(pricing.regularPrice || '97') - parseInt(pricing.promocionalPrice || '47')).toString()}</span>
        </div>
        <div className="border-t border-gray-200 mt-3 pt-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg text-purple-600">R$ {pricing.promocionalPrice}</span>
        </div>
      </div>

      {/* Payment Element */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <PaymentElement 
          options={{
            layout: "tabs",
            paymentMethodOrder: ['card', 'link'],
            fields: {
              billingDetails: 'auto'
            }
          }}
        />
      </div>
      
      {/* Submit Button */}
      <Button 
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processando Pagamento...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Confirmar Pagamento - R$ {pricing.promocionalPrice}
          </div>
        )}
      </Button>

      {/* Security Note */}
      <div className="text-center text-xs text-gray-500">
        <p>Seus dados são protegidos com criptografia SSL</p>
      </div>
    </form>
  );
};

export default function CheckoutEmbedded() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(window.location.search);
  const testId = params.testId || urlParams.get('testId');
  
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testId) {
      toast({
        title: "Erro",
        description: "ID do teste não encontrado. Redirecionando...",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [testId, navigate, toast]);

  const { data: testResult, isLoading: testLoading } = useQuery<TestResult>({
    queryKey: [`/api/test/result/${testId}`],
    enabled: !!testId,
  });

  const { data: pricing } = useQuery<PricingData>({
    queryKey: ['/api/pricing'],
  });

  // Create PaymentIntent when component loads
  useEffect(() => {
    if (!testId || !pricing) return;

    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: parseInt(testId),
            amount: parseInt(pricing.promocionalPrice) * 100
          })
        });

        const data = await response.json();
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('Erro ao criar intenção de pagamento');
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
        toast({
          title: "Erro",
          description: "Erro ao inicializar pagamento",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [testId, pricing, toast]);

  if (testLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold mb-2">Carregando...</h2>
            <p className="text-gray-600">Preparando sistema de pagamento</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">Teste não encontrado</h2>
            <p className="text-gray-600 mb-4">O teste solicitado não existe ou foi removido.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (testResult.isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Já Premium!</h2>
            <p className="text-gray-600 mb-4">Este teste já possui acesso premium.</p>
            <Button onClick={() => navigate(`/results/${testId}`)} className="w-full">
              Ver Relatório Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">Erro no Sistema de Pagamento</h2>
            <p className="text-gray-600 mb-4">Não foi possível inicializar o pagamento. Tente novamente.</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      {/* Floating Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/results/${testId}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-800">MeuPerfil360</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>Seguro</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Left Side - Product Info */}
            <div className="space-y-6">
              
              {/* Hero Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-8 text-white">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-transparent"></div>
                <div className="relative">
                  <Crown className="w-12 h-12 mb-4 text-yellow-300" />
                  <h1 className="text-2xl font-bold mb-2">Relatório Premium</h1>
                  <p className="text-purple-100 mb-6">
                    Desbloqueie sua análise comportamental completa
                  </p>
                  
                  {/* Price Display */}
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl font-bold">
                      R$ {pricing?.promocionalPrice || '47'}
                    </span>
                    <span className="text-lg text-purple-200 line-through">
                      R$ {pricing?.regularPrice || '97'}
                    </span>
                    <div className="bg-orange-400 text-orange-900 text-xs px-2 py-1 rounded-full font-medium">
                      52% OFF
                    </div>
                  </div>
                  <p className="text-sm text-purple-200">Oferta por tempo limitado</p>
                </div>
              </div>

              {/* Benefits */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Star className="w-5 h-5 text-yellow-500 mr-2" />
                    Incluído no seu relatório
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-900">Relatório PDF Completo</span>
                        <p className="text-sm text-gray-600">15+ páginas com análise detalhada</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-900">Análise Comportamental</span>
                        <p className="text-sm text-gray-600">Perfil DISC personalizado</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-900">Plano de Ação</span>
                        <p className="text-sm text-gray-600">4 semanas de desenvolvimento</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-900">Recomendações de Carreira</span>
                        <p className="text-sm text-gray-600">Orientações personalizadas</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Payment Form */}
            <div className="lg:sticky lg:top-24 lg:h-fit">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Finalizar Compra</CardTitle>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span>Stripe</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#7c3aed',
                          colorBackground: '#ffffff',
                          colorText: '#1f2937',
                          borderRadius: '12px',
                          spacingUnit: '6px',
                          fontFamily: 'Inter, system-ui, sans-serif',
                        },
                      },
                    }}
                  >
                    <CheckoutForm testId={testId!} pricing={pricing!} />
                  </Elements>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}