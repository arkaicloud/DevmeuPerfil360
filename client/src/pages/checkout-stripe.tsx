import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ArrowLeft, Shield, CheckCircle, Crown, CreditCard, Loader2, Star, AlertCircle } from "lucide-react";
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

// Declare Stripe global
declare global {
  interface Window {
    Stripe: any;
  }
}

export default function CheckoutStripe() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(window.location.search);
  const testId = params.testId || urlParams.get('testId');
  
  const [stripe, setStripe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);

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

  // Load Stripe.js
  useEffect(() => {
    const loadStripe = async () => {
      try {
        // Load Stripe script
        if (!window.Stripe) {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.onload = () => {
            const stripeInstance = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
            setStripe(stripeInstance);
            setStripeLoading(false);
          };
          script.onerror = () => {
            console.error('Failed to load Stripe.js');
            setStripeLoading(false);
          };
          document.head.appendChild(script);
        } else {
          const stripeInstance = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
          setStripe(stripeInstance);
          setStripeLoading(false);
        }
      } catch (error) {
        console.error('Error loading Stripe:', error);
        setStripeLoading(false);
      }
    };

    loadStripe();
  }, []);

  const { data: testResult, isLoading: testLoading } = useQuery<TestResult>({
    queryKey: [`/api/test/result/${testId}`],
    enabled: !!testId,
  });

  const { data: pricing } = useQuery<PricingData>({
    queryKey: ['/api/pricing'],
  });

  const handleCheckout = async () => {
    if (!stripe || !testId || !pricing) {
      toast({
        title: "Erro",
        description: "Sistema de pagamento não está pronto",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: parseInt(testId),
          amount: parseInt(pricing.promocionalPrice) * 100,
          paymentMethod: 'card'
        }),
      });

      const data = await response.json();
      
      if (data.sessionId) {
        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId
        });

        if (error) {
          console.error('Stripe redirect error:', error);
          toast({
            title: "Erro no Redirecionamento",
            description: "Não foi possível redirecionar para o pagamento. Tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Session ID não recebido');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Erro no Checkout",
        description: "Não foi possível iniciar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (testLoading || stripeLoading) {
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
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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

  if (!stripe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Erro no Sistema de Pagamento</h2>
            <p className="text-gray-600 mb-4">Não foi possível carregar o Stripe. Verifique sua conexão e tente novamente.</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/results/${testId}`)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-600" />
            <span className="font-semibold text-gray-800">MeuPerfil360</span>
          </div>
        </div>

        {/* Hero Section */}
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white mb-6">
          <CardContent className="p-8 text-center">
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
            <h1 className="text-3xl font-bold mb-2">Upgrade Premium</h1>
            <p className="text-xl opacity-90">
              Desbloqueie sua análise comportamental completa
            </p>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 text-yellow-500 mr-2" />
              O que você receberá
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <span>Relatório PDF completo com 15+ páginas</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <span>Análise detalhada do seu perfil comportamental</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <span>Plano de ação personalizado de 4 semanas</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <span>Recomendações de carreira e desenvolvimento</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <span className="text-3xl font-bold text-purple-600">
                R$ {pricing?.promocionalPrice || '47'}
              </span>
              <span className="text-lg text-gray-500 line-through">
                R$ {pricing?.regularPrice || '97'}
              </span>
              <div className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
                52% OFF
              </div>
            </div>
            <p className="text-sm text-gray-600">Oferta por tempo limitado</p>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Card>
          <CardHeader>
            <CardTitle>Finalizar Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 text-lg h-16"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecionando para o Stripe...
                </div>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pagar com Cartão - R$ {pricing?.promocionalPrice || '47'}
                </>
              )}
            </Button>

            {/* Fallback iframe (if needed) */}
            {loading && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 text-center">
                  Se o redirecionamento não funcionar, você será redirecionado automaticamente para a página de pagamento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Badge */}
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mt-6">
          <Shield className="w-4 h-4" />
          <span>Pagamento seguro processado pelo Stripe</span>
        </div>
      </div>
    </div>
  );
}