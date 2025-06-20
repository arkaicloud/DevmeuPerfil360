import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Heart, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MotivationBannerProps {
  currentQuestion: number;
  totalQuestions: number;
}

interface MotivationMessage {
  id: number;
  minQuestion: number;
  maxQuestion: number;
  title: string;
  message: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const motivationMessages: MotivationMessage[] = [
  {
    id: 1,
    minQuestion: 1,
    maxQuestion: 7,
    title: "Você está indo bem!",
    message: "Cada resposta nos ajuda a entender melhor seu perfil único",
    icon: Sparkles,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200"
  },
  {
    id: 2,
    minQuestion: 8,
    maxQuestion: 14,
    title: "Continue assim!",
    message: "Suas respostas estão revelando aspectos interessantes do seu comportamento",
    icon: Heart,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200"
  },
  {
    id: 3,
    minQuestion: 15,
    maxQuestion: 21,
    title: "Quase terminando!",
    message: "Estamos descobrindo detalhes valiosos sobre sua personalidade",
    icon: Target,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200"
  },
  {
    id: 4,
    minQuestion: 22,
    maxQuestion: 28,
    title: "Últimas perguntas!",
    message: "Em breve você verá seu perfil DISC completo e personalizado",
    icon: Zap,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200"
  }
];

export default function MotivationBanner({ currentQuestion, totalQuestions }: MotivationBannerProps) {
  const [currentMessage, setCurrentMessage] = useState<MotivationMessage | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [lastShownQuestion, setLastShownQuestion] = useState(0);

  useEffect(() => {
    const message = motivationMessages.find(m => 
      currentQuestion >= m.minQuestion && currentQuestion <= m.maxQuestion
    );

    // Show banner only when entering a new stage and not shown recently
    if (message && currentQuestion > lastShownQuestion + 3) {
      setCurrentMessage(message);
      setShowBanner(true);
      setLastShownQuestion(currentQuestion);
      
      // Auto-hide after 4 seconds
      setTimeout(() => {
        setShowBanner(false);
      }, 4000);
    }
  }, [currentQuestion, lastShownQuestion]);

  if (!showBanner || !currentMessage) return null;

  const IconComponent = currentMessage.icon;

  return (
    <div className="mb-4 animate-in slide-in-from-top-2 duration-500">
      <Card className={cn(
        "border-l-4 shadow-sm",
        currentMessage.bgColor
      )}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              currentMessage.bgColor.replace('50', '100')
            )}>
              <IconComponent className={cn("w-4 h-4", currentMessage.color)} />
            </div>
            <div className="flex-1">
              <div className={cn("text-sm font-medium mb-1", currentMessage.color)}>
                {currentMessage.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentMessage.message}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {currentQuestion}/{totalQuestions}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}