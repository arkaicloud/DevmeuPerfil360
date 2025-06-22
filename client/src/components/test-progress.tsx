import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  progress: number;
}

const getTestStage = (currentQuestion: number, totalQuestions: number) => {
  const progressPercent = (currentQuestion / totalQuestions) * 100;
  
  if (progressPercent <= 25) return { stage: 1, name: "Início", description: "Primeiras perguntas" };
  if (progressPercent <= 50) return { stage: 2, name: "Desenvolvimento", description: "Meio do teste" };
  if (progressPercent <= 75) return { stage: 3, name: "Aprofundamento", description: "Finalizando" };
  return { stage: 4, name: "Conclusão", description: "Últimas perguntas" };
};

export default function TestProgress({ currentQuestion, totalQuestions, progress }: TestProgressProps) {
  const currentStage = getTestStage(currentQuestion, totalQuestions);
  
  const stages = [
    { id: 1, name: "Início", questions: "1-6" },
    { id: 2, name: "Desenvolvimento", questions: "7-12" },
    { id: 3, name: "Aprofundamento", questions: "13-18" },
    { id: 4, name: "Conclusão", questions: "19-24" }
  ];

  return (
    <div className="mb-6 md:mb-8">
      {/* Mobile Progress - Compact */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-primary">
              {currentStage.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {currentStage.description}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-foreground">
              {currentQuestion}/{totalQuestions}
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
        
        {/* Mobile Stage Dots */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col items-center">
              <div className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                currentStage.stage > stage.id 
                  ? "bg-green-500" 
                  : currentStage.stage === stage.id 
                    ? "bg-primary animate-pulse" 
                    : "bg-gray-300"
              )} />
              <div className={cn(
                "text-xs mt-1 transition-colors",
                currentStage.stage === stage.id ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {stage.name}
              </div>
            </div>
          ))}
        </div>
        
        <Progress 
          value={progress} 
          className="h-2 progress-animate"
        />
      </div>

      {/* Desktop Progress - Full */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium psychology-blue">Passo 2 de 3</span>
          <span className="text-sm text-muted-foreground">
            Pergunta {currentQuestion} de {totalQuestions}
          </span>
        </div>
        
        {/* Desktop Stage Timeline */}
        <div className="flex items-center justify-between mb-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  currentStage.stage > stage.id 
                    ? "bg-green-500 text-white" 
                    : currentStage.stage === stage.id 
                      ? "bg-primary text-white animate-pulse" 
                      : "bg-gray-200 text-gray-500"
                )}>
                  {currentStage.stage > stage.id ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : currentStage.stage === stage.id ? (
                    <PlayCircle className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <div className={cn(
                  "text-xs mt-2 font-medium transition-colors",
                  currentStage.stage === stage.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {stage.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stage.questions}
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-4 transition-colors",
                  currentStage.stage > stage.id ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>
        
        <Progress 
          value={progress} 
          className="h-3 progress-animate"
        />
      </div>
    </div>
  );
}
