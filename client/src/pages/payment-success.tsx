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
      
      // Verify payment and redirect to results
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
            // Payment verified, redirect to results
            setTimeout(() => {
              navigate(`/results/${testIdParam}?payment=success`);
            }, 1500);
          } else {
            setError('Erro na verificação do pagamento');
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          // Redirect anyway to results page
          setTimeout(() => {
            navigate(`/results/${testIdParam}?payment=success`);
          }, 1500);
        } finally {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center p-8">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Pagamento Confirmado!
            </h1>
            <p className="text-gray-600">
              Processando seu acesso premium...
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full w-3/4"></div>
              </div>
            </div>
            
            <p className="text-sm text-gray-500">
              Você será redirecionado automaticamente para seu relatório premium.
            </p>
            
            {testId && (
              <Button
                onClick={() => navigate(`/results/${testId}`)}
                className="w-full mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ver Relatório Premium
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}