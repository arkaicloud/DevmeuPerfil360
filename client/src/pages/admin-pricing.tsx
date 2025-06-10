import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Save, Settings } from "lucide-react";
import AdminNav from "@/components/admin-nav";

interface PricingConfig {
  regularPrice: string;
  promocionalPrice: string;
  isPromotionActive: boolean;
}

export default function AdminPricing() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<PricingConfig>({
    regularPrice: '97',
    promocionalPrice: '47',
    isPromotionActive: true
  });

  const { data: pricing, isLoading } = useQuery<PricingConfig>({
    queryKey: ["/api/admin/pricing"],
    onSuccess: (data) => {
      setFormData(data);
    }
  });

  const savePricingMutation = useMutation({
    mutationFn: async (data: PricingConfig) => {
      const response = await apiRequest("POST", "/api/admin/pricing", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
      toast({
        title: "Configurações salvas",
        description: "Preços atualizados com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    savePricingMutation.mutate(formData);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    window.location.href = '/admin/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav onLogout={handleLogout} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configuração de Preços</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de Preço Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="regularPrice">Preço Regular (R$)</Label>
                <Input
                  id="regularPrice"
                  type="number"
                  value={formData.regularPrice}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    regularPrice: e.target.value
                  }))}
                  placeholder="97"
                />
                <p className="text-sm text-gray-500">
                  Preço normal do relatório premium
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promocionalPrice">Preço Promocional (R$)</Label>
                <Input
                  id="promocionalPrice"
                  type="number"
                  value={formData.promocionalPrice}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    promocionalPrice: e.target.value
                  }))}
                  placeholder="47"
                />
                <p className="text-sm text-gray-500">
                  Preço com desconto promocional
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="promotionActive">Promoção Ativa</Label>
                <p className="text-sm text-gray-500">
                  Quando ativa, exibe o preço promocional na landing page
                </p>
              </div>
              <Switch
                id="promotionActive"
                checked={formData.isPromotionActive}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  isPromotionActive: checked
                }))}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Visualização do Preço</h3>
              <div className="text-sm text-blue-800">
                {formData.isPromotionActive ? (
                  <div>
                    <span className="line-through text-gray-500">De R$ {formData.regularPrice}</span>
                    <span className="ml-2 font-bold text-lg text-green-600">
                      Por R$ {formData.promocionalPrice}
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-lg">R$ {formData.regularPrice}</span>
                )}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={savePricingMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {savePricingMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}