import { useState, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Loader2, CheckCircle, X, Star, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  pricing: {
    regularPrice: string;
    promocionalPrice: string;
  };
}

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ testId, pricing, onSuccess }: { 
  testId: string; 
  pricing: { regularPrice: string; promocionalPrice: string }; 
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required'
      });

      if (error) {
        toast({
          title: "Erro no Pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Verify payment with backend
        const response = await fetch('/api/verify-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            testId: parseInt(testId)
          })
        });

        const result = await response.json();
        
        if (result.success) {
          toast({
            title: "Pagamento Aprovado!",
            description: "Acesso premium liberado com sucesso",
          });
          onSuccess();
        } else {
          throw new Error('Erro na verificação do pagamento');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Order Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Relatório Premium DISC</span>
          <span className="text-sm font-bold text-gray-900">R$ {pricing.promocionalPrice}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Desconto aplicado</span>
          <span className="text-green-600 font-medium">- R$ {(parseInt(pricing.regularPrice) - parseInt(pricing.promocionalPrice)).toString()}</span>
        </div>
        <div className="border-t border-purple-200 mt-2 pt-2 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg text-purple-600">R$ {pricing.promocionalPrice}</span>
        </div>
      </div>

      {/* Payment Element */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <PaymentElement 
          options={{
            layout: "tabs",
            paymentMethodOrder: ['card', 'link']
          }}
        />
      </div>
      
      {/* Submit Button */}
      <Button 
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processando...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Confirmar Pagamento - R$ {pricing.promocionalPrice}
          </div>
        )}
      </Button>
    </form>
  );
};

export default function CheckoutModal({ isOpen, onClose, testId, pricing }: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Create PaymentIntent when modal opens
  useEffect(() => {
    if (!isOpen || !testId) return;

    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: parseInt(testId),
            amount: parseInt(pricing.promocionalPrice) * 100
          })
        });

        const data = await response.json();
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('Erro ao criar intenção de pagamento');
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
        toast({
          title: "Erro",
          description: "Erro ao inicializar pagamento",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [isOpen, testId, pricing, toast]);

  const handleSuccess = () => {
    onClose();
    // Refresh page to show premium content
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              Upgrade Premium
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Carregando...</span>
          </div>
        ) : !clientSecret ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Erro ao inicializar pagamento</p>
            <Button onClick={onClose} variant="outline">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Benefits */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Incluído no Premium
              </h3>
              <ul className="text-sm space-y-1 text-purple-100">
                <li>• Relatório PDF completo (15+ páginas)</li>
                <li>• Análise comportamental detalhada</li>
                <li>• Plano de ação personalizado</li>
                <li>• Recomendações de carreira</li>
              </ul>
            </div>

            {/* Payment Form */}
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#7c3aed',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <CheckoutForm testId={testId} pricing={pricing} onSuccess={handleSuccess} />
            </Elements>

            {/* Security Note */}
            <div className="flex items-center justify-center text-xs text-gray-500">
              <Shield className="w-3 h-3 mr-1" />
              <span>Pagamento seguro processado pelo Stripe</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}