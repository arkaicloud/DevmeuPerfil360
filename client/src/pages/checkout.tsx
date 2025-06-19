import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function Checkout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardData, setCardData] = useState({
    number: '4242 4242 4242 4242',
    expiry: '12/34',
    cvc: '123',
    name: 'Teste Card'
  });

  // Get test ID from URL
  const testId = new URLSearchParams(window.location.search).get('testId');

  // Fetch test data
  const { data: testResult, isLoading: testLoading } = useQuery<{
    id: number;
    profileType: string;
    scores: Record<string, number>;
    isPremium: boolean;
  }>({
    queryKey: [`/api/test/result/${testId}`],
    enabled: !!testId,
  });

  // Fetch pricing
  const { data: pricing } = useQuery<{
    regularPrice: string;
    promocionalPrice: string;
    isPromoActive: boolean;
  }>({
    queryKey: ['/api/pricing'],
  });

  if (!testId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">ID do teste não encontrado</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (testLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Carregando dados do teste...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Create payment intent
      const paymentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: parseInt(testId),
          amount: pricing?.promocionalPrice ? parseInt(pricing.promocionalPrice) * 100 : 4700,
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('Falha ao criar intenção de pagamento');
      }

      const { clientSecret } = await paymentResponse.json();

      // Simulate payment processing with Stripe
      const confirmResponse = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSecret,
          paymentMethod: {
            card: {
              number: cardData.number.replace(/\s/g, ''),
              exp_month: parseInt(cardData.expiry.split('/')[0]),
              exp_year: parseInt('20' + cardData.expiry.split('/')[1]),
              cvc: cardData.cvc,
            },
            billing_details: {
              name: cardData.name,
            },
          },
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Falha ao processar pagamento');
      }

      const result = await confirmResponse.json();

      if (result.success) {
        // Upgrade test to premium
        const upgradeResponse = await fetch(`/api/test/upgrade/${testId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: result.paymentIntentId }),
        });

        if (upgradeResponse.ok) {
          toast({
            title: "Pagamento Aprovado!",
            description: "Seu relatório premium foi liberado com sucesso!",
          });
          navigate(`/results/${testId}?payment=success`);
        } else {
          throw new Error('Falha ao atualizar teste para premium');
        }
      } else {
        throw new Error(result.error || 'Pagamento não foi aprovado');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Erro no Pagamento",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finalizar Pagamento
          </h1>
          <p className="text-gray-600">
            Desbloqueie seu relatório DISC completo
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Test Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Relatório DISC Premium</p>
                {testResult && (
                  <p className="text-sm text-gray-600">
                    Perfil: <span className="font-medium">{testResult.profileType}</span>
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Preço regular:</span>
                  <span className="line-through text-gray-500">
                    R$ {pricing?.regularPrice || '97'},00
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-600">
                  <span>Preço promocional:</span>
                  <span>R$ {pricing?.promocionalPrice || '47'},00</span>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Inclui:</span>
                </p>
                <ul className="text-xs text-green-700 mt-1 space-y-1">
                  <li>• Análise comportamental completa</li>
                  <li>• Relatório PDF personalizado</li>
                  <li>• Recomendações de carreira</li>
                  <li>• Dicas de desenvolvimento</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados do Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="cardName">Nome no Cartão</Label>
                  <Input
                    id="cardName"
                    value={cardData.name}
                    onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cardNumber">Número do Cartão</Label>
                  <Input
                    id="cardNumber"
                    value={cardData.number}
                    onChange={(e) => setCardData(prev => ({ 
                      ...prev, 
                      number: formatCardNumber(e.target.value) 
                    }))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Validade</Label>
                    <Input
                      id="expiry"
                      value={cardData.expiry}
                      onChange={(e) => setCardData(prev => ({ 
                        ...prev, 
                        expiry: formatExpiry(e.target.value) 
                      }))}
                      placeholder="MM/AA"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      value={cardData.cvc}
                      onChange={(e) => setCardData(prev => ({ 
                        ...prev, 
                        cvc: e.target.value.replace(/\D/g, '') 
                      }))}
                      placeholder="123"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Para teste:</span> Use o cartão 4242 4242 4242 4242
                  </p>
                </div>

                <Button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processando...
                    </>
                  ) : (
                    `Finalizar Pagamento - R$ ${pricing?.promocionalPrice || '47'},00`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/results/${testId}`)}
            className="mr-4"
          >
            Voltar aos Resultados
          </Button>
        </div>
      </div>
    </div>
  );
}