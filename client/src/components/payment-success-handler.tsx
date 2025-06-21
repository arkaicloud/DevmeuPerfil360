import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccessHandler() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  
  useEffect(() => {
    // Get data from server-injected variables
    const stripeData = (window as any).__STRIPE_SUCCESS__;
    const testId = stripeData?.testId;
    const sessionId = stripeData?.sessionId;
    
    if (!testId) {
      navigate('/');
      return;
    }

    const processPayment = async () => {
      try {
        if (sessionId) {
          // Verify payment
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
              description: "Acesso premium liberado",
            });
          }
        }

        // Show success message briefly then redirect
        setTimeout(() => {
          setProcessing(false);
          setTimeout(() => {
            navigate(`/results/${testId}?payment=success`);
          }, 1500);
        }, 1000);

      } catch (error) {
        console.error('Payment verification error:', error);
        // Even on error, redirect to results
        setTimeout(() => {
          navigate(`/results/${testId}?payment=success`);
        }, 2000);
      }
    };

    processPayment();
  }, [navigate, toast]);

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
              <p className="text-gray-600">
                Verificando pagamento e liberando acesso premium...
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-gray-600">
                Redirecionando para seu relatório premium...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}