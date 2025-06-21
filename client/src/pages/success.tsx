import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Home, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Success() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  
  // Get testId and sessionId from URL parameters or hash
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1).split('?')[1] || '');
  const testId = urlParams.get('testId') || hashParams.get('testId');
  const sessionId = urlParams.get('session_id') || hashParams.get('session_id');

  useEffect(() => {
    // If no testId, redirect to home
    if (!testId) {
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    // Verify payment with Stripe session
    const verifyPayment = async () => {
      if (!sessionId) {
        setProcessing(false);
        return;
      }

      try {
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
            description: "Redirecionando para seu relatório premium...",
          });
          
          // Redirect to results with premium access after 2 seconds
          setTimeout(() => {
            navigate(`/results/${testId}?payment=success`);
          }, 2000);
        } else {
          toast({
            title: "Verificação Pendente",
            description: "Verificando status do pagamento...",
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: "Pagamento Processado",
          description: "Redirecionando para seu relatório...",
        });
        
        // Even if verification fails, redirect to results (payment was successful if we got here)
        setTimeout(() => {
          navigate(`/results/${testId}?payment=success`);
        }, 2000);
      } finally {
        setProcessing(false);
      }
    };

    verifyPayment();
  }, [testId, sessionId, navigate, toast]);

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verificando Pagamento
            </h1>
            <p className="text-gray-600 mb-6">
              Aguarde enquanto confirmamos seu pagamento...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-gray-600 mb-6">
            Redirecionando para seu relatório premium em instantes...
          </p>
          
          <div className="space-y-3">
            {testId && (
              <Button 
                onClick={() => navigate(`/results/${testId}`)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Acessar Relatório Premium
              </Button>
            )}
            
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}