import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DiscOption {
  id: string;
  text: string;
}

interface DiscQuestion {
  id: number;
  text: string;
  options: DiscOption[];
}

interface DiscQuestionProps {
  question: DiscQuestion;
  selectedMost: string;
  selectedLeast: string;
  onAnswerChange: (type: "most" | "least", value: string) => void;
}

export default function DiscQuestion({ 
  question, 
  selectedMost, 
  selectedLeast, 
  onAnswerChange 
}: DiscQuestionProps) {
  
  const handleMostClick = (optionId: string) => {
    if (selectedMost === optionId) {
      onAnswerChange("most", "");
    } else {
      onAnswerChange("most", optionId);
    }
  };

  const handleLeastClick = (optionId: string) => {
    if (selectedLeast === optionId) {
      onAnswerChange("least", "");
    } else {
      onAnswerChange("least", optionId);
    }
  };

  const isOptionDisabled = (optionId: string) => {
    return (selectedMost && selectedMost !== optionId && selectedLeast !== optionId) ||
           (selectedLeast && selectedLeast !== optionId && selectedMost !== optionId);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option) => (
          <div 
            key={option.id}
            className={cn(
              "p-4 border-2 rounded-xl transition-all duration-200",
              "hover:border-primary/50",
              isOptionDisabled(option.id) && "opacity-50",
              (selectedMost === option.id || selectedLeast === option.id) && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground flex-1 pr-4">
                {option.text}
              </span>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedMost === option.id ? "default" : "outline"}
                  className={cn(
                    "w-10 h-8 text-xs font-bold rounded-full transition-all duration-200",
                    selectedMost === option.id ? "bg-accent text-white" : "border-accent text-accent hover:bg-accent hover:text-white"
                  )}
                  onClick={() => handleMostClick(option.id)}
                  disabled={selectedLeast === option.id}
                >
                  MA
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedLeast === option.id ? "destructive" : "outline"}
                  className={cn(
                    "w-10 h-8 text-xs font-bold rounded-full transition-all duration-200",
                    selectedLeast === option.id ? "bg-destructive text-white" : "border-destructive text-destructive hover:bg-destructive hover:text-white"
                  )}
                  onClick={() => handleLeastClick(option.id)}
                  disabled={selectedMost === option.id}
                >
                  ME
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
