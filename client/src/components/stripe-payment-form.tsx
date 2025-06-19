import { useEffect, useState } from "react";
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface StripePaymentFormProps {
  testId: string;
}

export default function StripePaymentForm({ testId }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe not loaded');
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Erro no Pagamento",
          description: error.message || "Erro ao processar pagamento",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update test to premium
        try {
          const response = await fetch(`/api/test/upgrade/${testId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          });

          if (response.ok) {
            toast({
              title: "Pagamento Aprovado!",
              description: "Relatório premium liberado com sucesso!",
            });
            navigate(`/results/${testId}?payment=success`);
          } else {
            throw new Error('Failed to upgrade test');
          }
        } catch (upgradeError) {
          console.error('Upgrade error:', upgradeError);
          toast({
            title: "Erro ao Liberar Premium",
            description: "Pagamento aprovado, mas houve erro ao liberar o premium",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      toast({
        title: "Erro Inesperado",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Dados do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px] py-4">
            <PaymentElement
              options={{
                layout: 'tabs',
                defaultValues: {
                  billingDetails: {
                    name: '',
                    email: '',
                  }
                }
              }}
              onReady={() => {
                console.log('PaymentElement is ready');
                setIsReady(true);
              }}
              onLoadError={(error) => {
                console.error('PaymentElement load error:', error);
                toast({
                  title: "Erro ao Carregar Pagamento",
                  description: "Não foi possível carregar o formulário de pagamento",
                  variant: "destructive",
                });
              }}
            />
            {!isReady && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando formulário...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button 
        type="submit"
        disabled={!stripe || !elements || isProcessing || !isReady}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        size="lg"
      >
        {isProcessing ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processando Pagamento...
          </div>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Pagar R$ 47,00
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        🔒 Pagamento seguro processado pela Stripe
      </p>
    </form>
  );
}