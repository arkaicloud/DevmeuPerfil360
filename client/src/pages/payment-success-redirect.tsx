import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccessRedirect() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('testId');
  const sessionId = urlParams.get('session_id');

  useEffect(() => {
    if (!testId) {
      navigate('/');
      return;
    }

    // Verify payment and redirect
    const verifyAndRedirect = async () => {
      try {
        if (sessionId) {
          // Verify payment with Stripe
          const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId,
              testId: parseInt(testId)
            })
          });

          const result = await response.json();
          
          if (result.success) {
            toast({
              title: "Pagamento Confirmado!",
              description: "Acesso premium liberado com sucesso",
            });
          }
        }

        // Always redirect to results page with payment success parameter
        setTimeout(() => {
          navigate(`/results/${testId}?payment=success`);
        }, 1500);

      } catch (error) {
        console.error('Payment verification error:', error);
        // Even on error, redirect to results
        setTimeout(() => {
          navigate(`/results/${testId}?payment=success`);
        }, 1500);
      } finally {
        setProcessing(false);
      }
    };

    verifyAndRedirect();
  }, [testId, sessionId, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-6">
          {processing ? (
            <>
              <Loader2 className="w-16 h-16 text-green-500 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Processando Pagamento
              </h1>
              <p className="text-gray-600 mb-6">
                Verificando pagamento e liberando acesso premium...
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-gray-600 mb-6">
                Redirecionando para seu relatório premium...
              </p>
              
              <Button 
                onClick={() => navigate(`/results/${testId}`)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Acessar Relatório Premium
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}