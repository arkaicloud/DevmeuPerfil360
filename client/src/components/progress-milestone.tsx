import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, CheckCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressMilestoneProps {
  currentQuestion: number;
  totalQuestions: number;
  onMilestoneComplete?: () => void;
}

interface Milestone {
  id: number;
  threshold: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const milestones: Milestone[] = [
  {
    id: 1,
    threshold: 25,
    title: "Ótimo Início!",
    description: "Você completou o primeiro estágio",
    icon: Star,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200"
  },
  {
    id: 2,
    threshold: 50,
    title: "Meio Caminho!",
    description: "Você está na metade do teste",
    icon: Target,
    color: "text-purple-600", 
    bgColor: "bg-purple-50 border-purple-200"
  },
  {
    id: 3,
    threshold: 75,
    title: "Quase Lá!",
    description: "Faltam apenas algumas perguntas",
    icon: CheckCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200"
  },
  {
    id: 4,
    threshold: 100,
    title: "Parabéns!",
    description: "Teste concluído com sucesso",
    icon: Trophy,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200"
  }
];

export default function ProgressMilestone({ currentQuestion, totalQuestions, onMilestoneComplete }: ProgressMilestoneProps) {
  const [showMilestone, setShowMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);
  const [achievedMilestones, setAchievedMilestones] = useState<number[]>([]);

  const progressPercent = (currentQuestion / totalQuestions) * 100;

  useEffect(() => {
    const milestone = milestones.find(m => 
      progressPercent >= m.threshold && !achievedMilestones.includes(m.id)
    );

    if (milestone) {
      setCurrentMilestone(milestone);
      setShowMilestone(true);
      setAchievedMilestones(prev => [...prev, milestone.id]);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowMilestone(false);
        onMilestoneComplete?.();
      }, 3000);
    }
  }, [progressPercent, achievedMilestones, onMilestoneComplete]);

  if (!showMilestone || !currentMilestone) return null;

  const IconComponent = currentMilestone.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={cn(
        "max-w-sm w-full transform animate-in zoom-in-95 duration-300",
        currentMilestone.bgColor
      )}>
        <CardContent className="p-6 text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            currentMilestone.bgColor.replace('50', '100')
          )}>
            <IconComponent className={cn("w-8 h-8", currentMilestone.color)} />
          </div>
          
          <h3 className={cn("text-xl font-bold mb-2", currentMilestone.color)}>
            {currentMilestone.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            {currentMilestone.description}
          </p>
          
          <div className="flex items-center justify-center space-x-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i < currentMilestone.id ? "bg-current" : "bg-gray-300"
                )}
                style={{ color: currentMilestone.color.replace('text-', '') }}
              />
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground mt-2">
            {currentQuestion} de {totalQuestions} perguntas
          </div>
        </CardContent>
      </Card>
    </div>
  );
}