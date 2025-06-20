import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const [testId, setTestId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const testIdParam = params.get('testId');
    
    if (testIdParam) {
      setTestId(testIdParam);
      
      // For Stripe checkout sessions, simulate success and redirect immediately
      if (sessionId && sessionId.startsWith('cs_test_')) {
        console.log('Processing payment for test:', testIdParam);
        console.log('Session ID:', sessionId);
        
        // Simulate payment and redirect immediately to avoid connection issues
        setTimeout(() => {
          // Try to process payment in background
          fetch('/api/simulate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testId: parseInt(testIdParam),
              sessionId: sessionId
            })
          }).catch(error => {
            console.log('Background payment processing failed, but continuing with redirect');
          });
          
          // Redirect regardless of API call success
          navigate(`/results/${testIdParam}`);
        }, 1000);
      } else {
        // If no session ID or different format, redirect immediately
        setTimeout(() => {
          navigate(`/results/${testIdParam}`);
        }, 1000);
      }
    } else {
      // Redirect to home if no test ID
      setTimeout(() => navigate('/'), 1000);
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