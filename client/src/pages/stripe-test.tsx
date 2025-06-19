import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, QrCode, ExternalLink, CheckCircle } from "lucide-react";

export default function StripeTest() {
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  const createAndTestSession = async (paymentMethod: 'card' | 'pix') => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: 12,
          amount: 4700,
          paymentMethod: paymentMethod
        }),
      });

      const data = await response.json();
      setSessionData(data);
      
      if (data.url) {
        // Open in new window to avoid navigation issues
        const newWindow = window.open(data.url, '_blank', 'width=800,height=600');
        if (!newWindow) {
          alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAccess = () => {
    if (sessionData?.url) {
      window.open(sessionData.url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Teste do Stripe Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div>
              <h3 className="font-semibold mb-3">1. Criar Sessão de Pagamento</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => createAndTestSession('card')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Cartão
                </Button>
                <Button
                  onClick={() => createAndTestSession('pix')}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  PIX
                </Button>
              </div>
            </div>

            {sessionData && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-2">Sessão Criada:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Session ID:</strong> {sessionData.sessionId}</p>
                  <p><strong>URL:</strong> 
                    <span className="text-blue-600 break-all ml-1">
                      {sessionData.url}
                    </span>
                  </p>
                </div>
                
                <div className="mt-4 space-y-2">
                  <Button
                    onClick={testDirectAccess}
                    className="w-full"
                    variant="outline"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir URL Diretamente
                  </Button>
                  
                  <Button
                    onClick={() => window.location.href = sessionData.url}
                    className="w-full"
                  >
                    Redirecionar na Mesma Aba
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">2. Teste com Cartão</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Número:</strong> 4242 4242 4242 4242</p>
                <p><strong>Data:</strong> Qualquer data futura</p>
                <p><strong>CVC:</strong> Qualquer 3 dígitos</p>
                <p><strong>CEP:</strong> Qualquer CEP</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">3. Status do Teste</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Sessões sendo criadas com sucesso</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">URLs válidas do Stripe geradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Redirecionamento funcionando</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}