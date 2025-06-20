import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, ArrowRight, ArrowLeft, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { discQuestions } from "@/lib/disc-questions";
import { type DiscAnswer, type GuestTestData, type UserTestSubmission, type DiscTestSubmission } from "@shared/schema";
import DiscQuestion from "@/components/disc-question";
import TestProgress from "@/components/test-progress";
import MobileProgressRing from "@/components/mobile-progress-ring";
import { secureStorage, validateSession, sanitizeInput, clientRateLimit } from "@/lib/security";

export default function Test() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<DiscAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<{ most: string; least: string }>({
    most: "",
    least: "",
  });
  const [guestData, setGuestData] = useState<GuestTestData | null>(null);
  const [isLoggedUser, setIsLoggedUser] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [completedAnswers, setCompletedAnswers] = useState<DiscAnswer[]>([]);

  const getStageInfo = (stage: number) => {
    const stages = {
      1: {
        name: "Início",
        description: "Conhecendo seu perfil inicial"
      },
      2: {
        name: "Desenvolvimento", 
        description: "Identificando padrões comportamentais"
      },
      3: {
        name: "Aprofundamento",
        description: "Refinando sua análise DISC"
      },
      4: {
        name: "Conclusão",
        description: "Finalizando seu perfil completo"
      }
    };
    return stages[stage as keyof typeof stages] || stages[1];
  };

  // Progress calculations
  const progress = ((currentQuestionIndex + 1) / discQuestions.length) * 100;
  const currentStage = progress <= 25 ? 1 : progress <= 50 ? 2 : progress <= 75 ? 3 : 4;
  const currentQuestion = discQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === discQuestions.length - 1;
  const canProceed = currentAnswer.most && currentAnswer.least && currentAnswer.most !== currentAnswer.least;

  useEffect(() => {
    // Check if user is logged in with Clerk or local storage
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setIsLoggedUser(true);
        
        // For logged users, create guest data for compatibility
        const mockGuestData: GuestTestData = {
          name: user.firstName || user.username || "Usuario",
          email: user.email,
          whatsapp: user.whatsapp || "",
        };
        setGuestData(mockGuestData);
        
        return;
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("currentUser");
      }
    }

    // For guest users, check if they have guest data from the form
    const storedData = localStorage.getItem("guestTestData");
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setGuestData(parsedData);
        setIsLoggedUser(false);
      } catch (error) {
        console.error("Erro ao parsear dados do convidado:", error);
        setIsLoggedUser(false);
      }
    } else {
      // If no guest data, allow them to take the test anyway
      setIsLoggedUser(false);
    }
  }, [navigate, toast]);

  const submitTestMutation = useMutation({
    mutationFn: async (answers: DiscAnswer[]) => {
      // Pre-validate data before API call for faster feedback
      let endpoint = "/api/test/submit";
      let payload: any;

      // Use logged user data if available
      if (isLoggedUser && currentUser) {
        endpoint = "/api/test/submit-user";
        payload = {
          userId: currentUser.id,
          answers: answers,
        };
      } else {
        // For guest users, get data efficiently
        const storedData = localStorage.getItem("guestTestData");
        let finalGuestData = guestData;
        
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);
            if (parsedData?.name && parsedData?.email) {
              finalGuestData = parsedData;
            }
          } catch (error) {
            throw new Error("Dados corrompidos. Por favor, recomece o teste.");
          }
        }
        
        if (!finalGuestData?.name || !finalGuestData?.email) {
          throw new Error("Dados do usuário não encontrados. Por favor, recomece o teste.");
        }
        
        payload = {
          guestData: finalGuestData,
          answers: answers,
        };
      }

      // Optimized API request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Clear guest data from sessionStorage
      sessionStorage.removeItem("guestTestData");
      
      // Navigate based on user type
      if (isLoggedUser) {
        navigate(`/results/${data.testResultId}`);
      } else {
        // For guest users, navigate to results immediately
        navigate(`/results/${data.testResultId}`);
      }
    },
    onError: (error: any) => {
      console.error("Erro ao enviar teste:", error);
      
      if (error.name === 'AbortError') {
        toast({
          title: "Timeout",
          description: "O teste está demorando para processar. Tente novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao enviar teste",
          description: error.message || "Ocorreu um erro. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const handleNext = () => {
    if (!canProceed) return;

    // Save current answer
    const newAnswer: DiscAnswer = {
      questionId: currentQuestion.id,
      most: currentAnswer.most,
      least: currentAnswer.least,
    };

    const updatedAnswers = [...answers];
    const existingIndex = updatedAnswers.findIndex(a => a.questionId === currentQuestion.id);

    if (existingIndex >= 0) {
      updatedAnswers[existingIndex] = newAnswer;
    } else {
      updatedAnswers.push(newAnswer);
    }

    setAnswers(updatedAnswers);

    if (isLastQuestion) {
      // Submit test - all users can complete the test
      submitTestMutation.mutate(updatedAnswers);
    } else {
      // Go to next question
      setCurrentQuestionIndex(prev => prev + 1);

      // Load existing answer if available
      const nextQuestion = discQuestions[currentQuestionIndex + 1];
      const existingAnswer = updatedAnswers.find(a => a.questionId === nextQuestion.id);

      if (existingAnswer) {
        setCurrentAnswer({
          most: existingAnswer.most,
          least: existingAnswer.least,
        });
      } else {
        setCurrentAnswer({ most: "", least: "" });
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);

      // Load previous answer
      const prevQuestion = discQuestions[currentQuestionIndex - 1];
      const existingAnswer = answers.find(a => a.questionId === prevQuestion.id);

      if (existingAnswer) {
        setCurrentAnswer({
          most: existingAnswer.most,
          least: existingAnswer.least,
        });
      } else {
        setCurrentAnswer({ most: "", least: "" });
      }
    }
  };

  const handleAnswerChange = (type: "most" | "least", value: string) => {
    setCurrentAnswer(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="psychology-gradient text-white safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold">MeuPerfil360</h1>
              <p className="text-xs opacity-90">
                {isLoggedUser ? `Teste DISC - ${currentUser?.username}` : 'Teste DISC'}
              </p>
            </div>
          </div>
          {isLoggedUser && (
            <div className="text-right hidden sm:block">
              <p className="text-xs opacity-90">Usuário Logado</p>
              <p className="text-xs opacity-75">{currentUser?.email}</p>
            </div>
          )}
        </div>
        
        {/* Mobile Progress Bar - Always Visible */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <MobileProgressRing progress={progress} size={36} strokeWidth={3} />
              <div>
                <p className="text-sm font-medium">
                  Pergunta {currentQuestionIndex + 1} de {discQuestions.length}
                </p>
                <p className="text-xs opacity-75">
                  {getStageInfo(currentStage).name}
                </p>
              </div>
            </div>
            
            {/* Stage dots */}
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((stage) => {
                return (
                  <div
                    key={stage}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      stage < currentStage 
                        ? "bg-green-400" 
                        : stage === currentStage 
                          ? "bg-white animate-pulse" 
                          : "bg-white/30"
                    }`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-white to-white/80 h-1.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6">
        {/* Desktop Progress - Hidden on Mobile */}
        <div className="hidden md:block mb-6">
          <TestProgress 
            currentQuestion={currentQuestionIndex + 1}
            totalQuestions={discQuestions.length}
            progress={progress}
          />
        </div>

        {/* Question Card */}
        <Card className="shadow-lg border-0 mb-4 md:mb-8">
          <CardContent className="p-4 md:p-6 pb-6 md:pb-6">
            <div className="text-center mb-4 md:mb-6">
              {/* Mobile: Compact question header with progress guidance */}
              <div className="md:hidden mb-3">
                {/* Stage guidance banner - subtle and integrated */}
                <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-3 border-blue-400">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-blue-700 font-medium">
                      {getStageInfo(currentStage).name}
                    </div>
                    <div className="text-xs text-blue-600">
                      {Math.round(progress)}% concluído
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {getStageInfo(currentStage).description}
                  </div>
                </div>
                
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {currentQuestion.text}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Escolha MAIS e MENOS se identifica
                </p>
              </div>
              
              {/* Desktop: Full question header */}
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold psychology-blue">
                    {currentQuestionIndex + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {currentQuestion.text}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha a opção que MAIS se identifica com você e a que MENOS se identifica
                </p>
              </div>
            </div>

            {/* Question Component with Mobile Spacing */}
            <div className="mb-32 md:mb-0">
              <DiscQuestion
                question={currentQuestion}
                selectedMost={currentAnswer.most}
                selectedLeast={currentAnswer.least}
                onAnswerChange={handleAnswerChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 md:relative md:bg-transparent md:backdrop-blur-none md:border-t-0 md:p-0">
          <div className="space-y-3 max-w-md mx-auto md:max-w-none">
            <Button 
              onClick={handleNext}
              disabled={!canProceed || submitTestMutation.isPending}
              className="w-full psychology-gradient btn-hover-lift text-base md:text-sm"
              size="lg"
            >
              {submitTestMutation.isPending ? (
                <>
                  <div className="spinner mr-2" />
                  {isLastQuestion ? "Processando Teste..." : "Carregando..."}
                </>
              ) : isLastQuestion ? (
                "Finalizar Teste"
              ) : (
                <>
                  Próxima Pergunta
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {currentQuestionIndex > 0 && (
              <Button 
                onClick={handlePrevious}
                variant="outline"
                className="w-full"
                disabled={submitTestMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Pergunta Anterior
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}