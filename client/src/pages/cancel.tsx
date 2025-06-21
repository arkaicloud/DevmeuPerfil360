import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, ArrowLeft, Home } from "lucide-react";

export default function Cancel() {
  const [, navigate] = useLocation();
  
  // Get testId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('testId');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Cancelado
          </h1>
          <p className="text-gray-600 mb-6">
            O pagamento foi cancelado. Você pode tentar novamente quando quiser.
          </p>
          
          <div className="space-y-3">
            {testId && (
              <Button 
                onClick={() => navigate(`/checkout/${testId}`)}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tentar Novamente
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