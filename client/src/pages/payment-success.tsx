import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const [testId, setTestId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const testIdParam = params.get('testId');
    
    if (testIdParam && sessionId) {
      setTestId(testIdParam);
      
      // Verify payment with Stripe and update premium status
      const verifyPayment = async () => {
        try {
          const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId,
              testId: parseInt(testIdParam)
            })
          });

          const result = await response.json();
          
          if (result.success) {
            // Payment verified successfully, redirect to results
            setTimeout(() => {
              navigate(`/results/${testIdParam}?payment=success`);
            }, 1500);
          } else {
            setError('Pagamento não foi confirmado pelo Stripe');
            setProcessing(false);
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          setError('Erro ao verificar pagamento com Stripe');
          setProcessing(false);
        }
      };

      verifyPayment();
    } else {
      // No session ID or test ID, redirect to home
      setError('Parâmetros de pagamento inválidos');
      setTimeout(() => navigate('/'), 2000);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          {processing ? (
            <>
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Processando Pagamento...
              </h1>
              
              <p className="text-gray-600 mb-6">
                Aguarde enquanto verificamos seu pagamento e liberamos o acesso premium.
              </p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Erro no Pagamento
              </h1>
              
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento Aprovado!
              </h1>
              
              <p className="text-gray-600 mb-6">
                Seu relatório premium foi liberado. Redirecionando para seus resultados...
              </p>
              
              {testId && (
                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate(`/results/${testId}?payment=success`)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Ver Meu Relatório Premium
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Início
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}