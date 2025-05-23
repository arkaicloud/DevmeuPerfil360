import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, QrCode, CreditCard, Copy, Check, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId: number;
}

export default function PaymentModal({ isOpen, onClose, testId }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyPixCode = async () => {
    try {
      await navigator.clipboard.writeText("00020126580014br.gov.bcb.pix...");
      setCopied(true);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no app do seu banco para realizar o pagamento.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código PIX.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmPayment = () => {
    // This would integrate with the checkout page
    window.location.href = `/checkout/${testId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Finalizar Compra
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-foreground mb-3">Resumo do Pedido</h4>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Relatório DISC Completo</span>
                <span className="font-medium">R$ 47,00</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>Desconto aplicado (52%)</span>
                <span>-R$ 50,00</span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-xl psychology-purple">R$ 47,00</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Forma de Pagamento</h4>
            
            {/* PIX Option */}
            <Card 
              className={`mb-3 cursor-pointer transition-all duration-200 ${
                paymentMethod === "pix" 
                  ? "border-2 border-accent bg-accent/5" 
                  : "border hover:bg-muted/50"
              }`}
              onClick={() => setPaymentMethod("pix")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <QrCode className="w-6 h-6 psychology-green" />
                    <div>
                      <span className="font-medium text-foreground">PIX</span>
                      <p className="text-xs text-muted-foreground">Aprovação instantânea</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 border-2 rounded-full ${
                    paymentMethod === "pix" 
                      ? "border-accent bg-accent" 
                      : "border-muted-foreground"
                  }`}>
                    {paymentMethod === "pix" && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Card Option */}
            <Card 
              className={`cursor-pointer transition-all duration-200 ${
                paymentMethod === "card" 
                  ? "border-2 border-primary bg-primary/5" 
                  : "border hover:bg-muted/50"
              }`}
              onClick={() => setPaymentMethod("card")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-foreground">Cartão de Crédito</span>
                      <p className="text-xs text-muted-foreground">Visa, Mastercard, Elo</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 border-2 rounded-full ${
                    paymentMethod === "card" 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  }`}>
                    {paymentMethod === "card" && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PIX Payment Info */}
          {paymentMethod === "pix" && (
            <div>
              <div className="text-center">
                <div className="w-32 h-32 bg-muted rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Escaneie o QR Code com o app do seu banco ou copie o código PIX
                </p>
                
                <Card className="bg-muted/50 mb-4">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground truncate flex-1">
                        00020126580014br.gov.bcb.pix...
                      </span>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPixCode}
                        className="ml-2 psychology-blue"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                  Após o pagamento, você receberá acesso imediato ao relatório completo
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleConfirmPayment}
              className="w-full bg-gradient-to-r from-accent to-primary text-white btn-hover-lift"
              size="lg"
            >
              <Shield className="w-4 h-4 mr-2" />
              Pagamento Seguro
            </Button>
            
            <p className="text-center text-xs text-muted-foreground">
              🔒 Pagamento 100% seguro processado pela Stripe
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
