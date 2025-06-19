import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Smartphone } from "lucide-react";

export default function PaymentTest() {
  const [loading, setLoading] = useState(false);
  const testId = 12; // For testing

  const handleDirectPayment = async (method: 'card' | 'pix') => {
    setLoading(true);
    try {
      // Simulate payment for testing
      const response = await fetch('/api/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: testId,
          sessionId: `sim_${Date.now()}_${method}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        window.location.href = `/results/${testId}?payment=success`;
      } else {
        alert('Erro no pagamento simulado');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async (method: 'card' | 'pix') => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: testId,
          amount: 4700,
          paymentMethod: method
        })
      });

      const data = await response.json();
      
      if (data.url) {
        // Open in new tab to avoid navigation issues
        window.open(data.url, '_blank');
      } else {
        alert('Erro ao criar sessão Stripe');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao conectar com Stripe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Teste de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Pagamento Simulado (Funciona sempre)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleDirectPayment('card')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Cartão
              </Button>
              <Button
                onClick={() => handleDirectPayment('pix')}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                PIX
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Stripe Real (Nova aba)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleStripePayment('card')}
                disabled={loading}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Stripe
              </Button>
              <Button
                onClick={() => handleStripePayment('pix')}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                PIX
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600 text-center">
            Use os botões superiores para testar o fluxo completo
          </div>
        </CardContent>
      </Card>
    </div>
  );
}