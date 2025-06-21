import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, QrCode, Smartphone, Settings, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  type: 'card' | 'pix' | 'digital_wallet';
}

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'card',
      name: 'Cartões',
      description: 'Visa, Mastercard, American Express',
      icon: CreditCard,
      enabled: true,
      type: 'card'
    },
    {
      id: 'pix',
      name: 'PIX',
      description: 'Pagamento instantâneo brasileiro',
      icon: QrCode,
      enabled: false,
      type: 'pix'
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      description: 'Carteira digital da Apple',
      icon: Smartphone,
      enabled: false,
      type: 'digital_wallet'
    },
    {
      id: 'google_pay',
      name: 'Google Pay',
      description: 'Carteira digital do Google',
      icon: Smartphone,
      enabled: false,
      type: 'digital_wallet'
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/admin/payment-methods');
      const data = await response.json();
      
      if (data.methods) {
        setPaymentMethods(prev => prev.map(method => ({
          ...method,
          enabled: data.methods[method.id] || false
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar métodos de pagamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMethod = (methodId: string) => {
    setPaymentMethods(prev => prev.map(method => 
      method.id === methodId 
        ? { ...method, enabled: !method.enabled }
        : method
    ));
  };

  const savePaymentMethods = async () => {
    try {
      setSaving(true);
      
      const methodsConfig = paymentMethods.reduce((acc, method) => {
        acc[method.id] = method.enabled;
        return acc;
      }, {} as Record<string, boolean>);

      const response = await apiRequest('POST', '/api/admin/payment-methods', {
        methods: methodsConfig
      });

      if (response.ok) {
        toast({
          title: "Configurações Salvas",
          description: "Métodos de pagamento atualizados com sucesso",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getMethodsByType = (type: string) => {
    return paymentMethods.filter(method => method.type === type);
  };

  const renderMethodCard = (method: PaymentMethod) => {
    const IconComponent = method.icon;
    
    return (
      <Card key={method.id} className="transition-all hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                method.enabled 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">{method.name}</h3>
                  <Badge variant={method.enabled ? "default" : "secondary"}>
                    {method.enabled ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{method.description}</p>
              </div>
            </div>
            <Switch
              checked={method.enabled}
              onCheckedChange={() => toggleMethod(method.id)}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="p-6">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:ml-64">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Métodos de Pagamento
          </h1>
          <p className="text-gray-600 mt-1">
            Configure quais métodos de pagamento estão disponíveis no checkout
          </p>
        </div>

        {/* Cartões */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Cartões de Crédito/Débito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getMethodsByType('card').map(renderMethodCard)}
          </CardContent>
        </Card>

        {/* PIX */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              Pagamento Instantâneo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getMethodsByType('pix').map(renderMethodCard)}
            {paymentMethods.find(m => m.id === 'pix')?.enabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Atenção:</strong> PIX requer habilitação específica na conta Stripe. 
                  Certifique-se de ativar PIX no painel do Stripe antes de usar esta opção.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Carteiras Digitais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Carteiras Digitais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getMethodsByType('digital_wallet').map(renderMethodCard)}
            {getMethodsByType('digital_wallet').some(m => m.enabled) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Em desenvolvimento:</strong> Carteiras digitais serão implementadas em versões futuras.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button 
            onClick={savePaymentMethods}
            disabled={saving}
            className="flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

        {/* Resumo */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resumo das Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {paymentMethods.filter(m => m.enabled).length}
                </div>
                <div className="text-sm text-gray-500">Métodos Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">
                  {paymentMethods.filter(m => !m.enabled).length}
                </div>
                <div className="text-sm text-gray-500">Métodos Inativos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {paymentMethods.length}
                </div>
                <div className="text-sm text-gray-500">Total Disponível</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}