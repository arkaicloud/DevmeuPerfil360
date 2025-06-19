import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, QrCode, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

export default function StripeDirect() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string>("");

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    try {
      const response = await fetch('/api/test/result/12');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error('Erro ao carregar dados do teste:', error);
    }
  };

  const createStripeSession = async (method: 'card' | 'pix') => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: 12,
          amount: 4700,
          paymentMethod: method
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        setSessionUrl(data.url);
        // Redirecionar imediatamente
        window.location.href = data.url;
      } else {
        console.error('URL não retornada:', data);
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    if (sessionUrl) {
      window.open(sessionUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Upgrade para Premium</CardTitle>
          </CardHeader>
          <CardContent>
            {testResult && (
              <div className="text-center space-y-2">
                <p className="text-lg">Perfil: <strong>{testResult.profileType}</strong></p>
                <p className="text-gray-600">Desbloqueie sua análise completa</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Options */}
        <Card>
          <CardHeader>
            <CardTitle>Escolha seu método de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => createStripeSession('card')}
                disabled={loading}
                size="lg"
                className="h-20 flex flex-col gap-2"
              >
                <CreditCard className="w-6 h-6" />
                <span>Cartão de Crédito</span>
                <span className="text-sm opacity-80">R$ 47,00</span>
              </Button>

              <Button
                onClick={() => createStripeSession('pix')}
                disabled={loading}
                variant="outline"
                size="lg"
                className="h-20 flex flex-col gap-2"
              >
                <QrCode className="w-6 h-6" />
                <span>PIX</span>
                <span className="text-sm opacity-80">R$ 47,00</span>
              </Button>
            </div>

            {loading && (
              <div className="mt-4 text-center">
                <p className="text-blue-600">Criando sessão de pagamento...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Debug */}
        {sessionUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Sessão Criada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Sessão Stripe criada com sucesso</span>
                </div>
                
                <div className="text-sm">
                  <p className="font-medium mb-1">URL da sessão:</p>
                  <p className="break-all text-blue-600">{sessionUrl}</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={openInNewTab} variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir em nova aba
                  </Button>
                  <Button 
                    onClick={() => window.location.href = sessionUrl}
                    size="sm"
                  >
                    Ir para pagamento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Dados para teste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Cartão de teste:</p>
                <p>Número: 4242 4242 4242 4242</p>
                <p>Data: Qualquer data futura (ex: 12/25)</p>
                <p>CVC: Qualquer 3 dígitos (ex: 123)</p>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <span>Se a página do cartão ficar em branco, teste com PIX</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}