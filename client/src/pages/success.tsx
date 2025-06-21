import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Home } from "lucide-react";

export default function Success() {
  const [, navigate] = useLocation();
  
  // Get testId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('testId');

  useEffect(() => {
    // If no testId, redirect to home
    if (!testId) {
      setTimeout(() => navigate('/'), 3000);
    }
  }, [testId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-gray-600 mb-6">
            Seu relatório premium foi liberado com sucesso.
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