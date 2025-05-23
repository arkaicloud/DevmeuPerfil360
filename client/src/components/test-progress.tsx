import { Progress } from "@/components/ui/progress";

interface TestProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  progress: number;
}

export default function TestProgress({ currentQuestion, totalQuestions, progress }: TestProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium psychology-blue">Passo 2 de 3</span>
        <span className="text-sm text-muted-foreground">
          Pergunta {currentQuestion} de {totalQuestions}
        </span>
      </div>
      <Progress 
        value={progress} 
        className="h-2 progress-animate"
      />
    </div>
  );
}
