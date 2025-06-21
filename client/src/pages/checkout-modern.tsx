import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ArrowLeft, Shield, CheckCircle, Crown, CreditCard, QrCode, Loader2, Zap, Star } from "lucide-react";
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

export default function CheckoutModern() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  
  // Get testId from URL params or query string
  const urlParams = new URLSearchParams(window.location.search);
  const testId = params.testId || urlParams.get('testId');
  
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'pix' | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableMethods, setAvailableMethods] = useState({
    card: true,
    pix: false,
    apple_pay: false,
    google_pay: false
  });
  const [step, setStep] = useState<'method' | 'processing'>('method');

  useEffect(() => {
    if (!testId) {
      toast({
        title: "Erro",
        description: "ID do teste não encontrado. Redirecionando...",
        variant: "destructive"
      });
      navigate('/');
    }
    loadPaymentMethods();
  }, [testId, navigate, toast]);

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch('/api/admin/payment-methods');
      const data = await response.json();
      if (data.methods) {
        setAvailableMethods(data.methods);
      }
    } catch (error) {
      console.error('Erro ao carregar métodos de pagamento:', error);
    }
  };

  const { data: testResult, isLoading: testLoading } = useQuery<TestResult>({
    queryKey: [`/api/test/result/${testId}`],
    enabled: !!testId,
  });

  const { data: pricing } = useQuery<PricingData>({
    queryKey: ['/api/pricing'],
  });

  const handlePaymentMethod = async (method: 'card' | 'pix') => {
    if (!testId || !pricing) return;
    
    setSelectedMethod(method);
    setStep('processing');
    setLoading(true);

    try {
      // Create real Stripe checkout session for validation
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: parseInt(testId),
          amount: parseInt(pricing.promocionalPrice) * 100,
          paymentMethod: method
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe checkout for real payment validation
        window.location.href = data.url;
      } else {
        throw new Error('Erro ao criar sessão de pagamento');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro no Pagamento",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
      setStep('method');
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!testId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: parseInt(testId),
          sessionId: `sim_${Date.now()}_test`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Pagamento Simulado!",
          description: "Redirecionando para seu relatório premium...",
        });
        setTimeout(() => {
          navigate(`/results/${testId}?payment=success`);
        }, 1500);
      } else {
        throw new Error('Erro na simulação');
      }
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Erro na Simulação",
        description: "Tente novamente ou use o pagamento real.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (testLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p>Teste não encontrado</p>
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

        {step === 'method' && (
          <div className="space-y-6">
            {/* Hero Section */}
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardContent className="p-8 text-center">
                <Crown className="w-16 h-16 mx-auto mb-4 opacity-90" />
                <h1 className="text-3xl font-bold mb-2">Desbloqueie Seu Potencial</h1>
                <p className="text-purple-100 text-lg">
                  Acesse análises avançadas do seu perfil {testResult.profileType}
                </p>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  O que você receberá
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {[
                    "Relatório completo em PDF profissional",
                    "Análise detalhada do comportamento sob pressão",
                    "Dicas práticas de desenvolvimento pessoal",
                    "Plano de ação personalizado",
                    "Comparações entre perfis DISC"
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="border-2 border-orange-200">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <div className="flex items-center justify-center space-x-3">
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
                  <p className="text-sm text-gray-600 mt-2">Oferta por tempo limitado</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Escolha seu método de pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {availableMethods.card && (
                    <Button
                      onClick={() => handlePaymentMethod('card')}
                      disabled={loading}
                      className="h-16 text-left justify-start bg-blue-600 hover:bg-blue-700"
                    >
                      <CreditCard className="w-6 h-6 mr-4" />
                      <div>
                        <div className="font-medium">Cartão de Crédito</div>
                        <div className="text-sm opacity-90">Aprovação instantânea</div>
                      </div>
                    </Button>
                  )}

                  {availableMethods.pix && (
                    <>
                      <Button
                        onClick={() => handlePaymentMethod('pix')}
                        disabled={loading}
                        variant="outline"
                        className="h-16 text-left justify-start border-2 hover:bg-green-50"
                      >
                        <QrCode className="w-6 h-6 mr-4 text-green-600" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">PIX</div>
                          <div className="text-sm text-gray-600">Processamento imediato *</div>
                        </div>
                      </Button>

                      <div className="text-xs text-gray-500 mt-2 px-1">
                        * PIX requer habilitação específica na conta Stripe. Se não disponível, será usado cartão automaticamente
                      </div>
                    </>
                  )}

                  {!availableMethods.card && !availableMethods.pix && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhum método de pagamento disponível</p>
                      <p className="text-sm">Entre em contato com o suporte</p>
                    </div>
                  )}
                </div>

                {/* Development Test Button - Only for internal testing */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <Button
                      onClick={handleSimulatePayment}
                      disabled={loading}
                      variant="outline"
                      className="w-full h-12 border-dashed border-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      ⚠️ DESENVOLVIMENTO - Simular Pagamento
                    </Button>
                    <p className="text-xs text-red-500 text-center mt-2 font-medium">
                      APENAS PARA DESENVOLVIMENTO - NÃO USAR EM PRODUÇÃO
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Shield className="w-4 h-4" />
              <span>Pagamento seguro processado pelo Stripe</span>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-bold mb-2">Redirecionando para Pagamento</h2>
              <p className="text-gray-600 mb-4">
                Você será redirecionado para o Stripe para processar seu pagamento via {selectedMethod === 'card' ? 'cartão' : 'PIX'}...
              </p>
              <p className="text-sm text-gray-500">
                Aguarde alguns segundos para o redirecionamento automático
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}