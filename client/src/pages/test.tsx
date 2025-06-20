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
        
        // Usuário logado detectado - log removido por segurança
        return;
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("currentUser");
      }
    }

    // For guest users, check if they have guest data from the form
    const storedData = localStorage.getItem("guestTestData");
    // Dados recuperados do localStorage - log removido por segurança
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        // Dados parseados - log removido por segurança
        setGuestData(parsedData);
        setIsLoggedUser(false);
      } catch (error) {
        console.error("Erro ao parsear dados do convidado:", error);
        setIsLoggedUser(false);
      }
    } else {
      // If no guest data, allow them to take the test anyway
      // They'll be prompted to register at the end to save results
      // Iniciando teste como convidado - log removido por segurança
      setIsLoggedUser(false);
    }
  }, [navigate, toast]);

  const submitTestMutation = useMutation({
    mutationFn: async (answers: DiscAnswer[]) => {
      let endpoint = "/api/test/submit";
      let payload: any;

      // Use logged user data if available
      if (isLoggedUser && currentUser) {
        // Enviando teste para usuário logado - dados sensíveis removidos do log
        endpoint = "/api/test/submit-user";
        payload = {
          userId: currentUser.id,
          answers: answers,
        };
      } else {
        // For guest users, use real data from localStorage or create minimal data
        let realGuestData = guestData;
        
        // Try to get real data from localStorage if not already available
        if (!realGuestData) {
          const storedData = localStorage.getItem("guestTestData");
          if (storedData) {
            try {
              realGuestData = JSON.parse(storedData);
            } catch (error) {
              console.error("Error parsing stored guest data:", error);
            }
          }
        }
        
        // Use real data or fallback to minimal data
        const finalGuestData = realGuestData || {
          name: "Visitante Anônimo",
          email: `guest_${Date.now()}@meuperfil360.com`,
          whatsapp: "11999999999",
        };
        
        // Enviando teste como convidado - dados removidos do log por segurança
        payload = {
          guestData: finalGuestData,
          answers: answers,
        };
      }

      const response = await apiRequest("POST", endpoint, payload);
      return response.json();
    },
    onSuccess: (data) => {
      // Clear guest data from sessionStorage
      sessionStorage.removeItem("guestTestData");
      
      // Navigate based on user type
      if (isLoggedUser && currentUser) {
        // For logged users, go to dashboard and show success message
        toast({
          title: "Teste concluído com sucesso!",
          description: `Seu perfil ${data.profile?.profileType || ''} foi identificado. Confira seu dashboard.`,
        });
        navigate(`/dashboard/${currentUser.id}`);
      } else {
        // For guests, go to results page
        navigate(`/results/${data.testResultId}`);
      }
    },
    onError: (error: any) => {
      // Handle test limit errors specifically
      if (error.message && error.message.includes("limite de testes")) {
        toast({
          title: "Limite de testes atingido",
          description: error.message,
          variant: "destructive",
        });
        
        // Redirect to dashboard or home based on user type
        if (isLoggedUser && currentUser) {
          navigate(`/dashboard/${currentUser.id}`);
        } else {
          navigate("/");
        }
      } else {
        toast({
          title: "Erro ao enviar teste",
          description: error.message || "Ocorreu um erro. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const currentQuestion = discQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / discQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === discQuestions.length - 1;
  const canProceed = currentAnswer.most && currentAnswer.least && currentAnswer.most !== currentAnswer.least;

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

  // Remove the blocking condition - allow all users to take the test
  // if (!guestData) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="spinner" />
  //     </div>
  //   );
  // }

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
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/90">
              Pergunta {currentQuestionIndex + 1} de {discQuestions.length}
            </span>
            <span className="text-xs text-white/75">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300 ease-out" 
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
          <CardContent className="p-4 md:p-6">
            <div className="text-center mb-4 md:mb-6">
              {/* Mobile: Compact question header */}
              <div className="md:hidden mb-3">
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

            <DiscQuestion
              question={currentQuestion}
              selectedMost={currentAnswer.most}
              selectedLeast={currentAnswer.least}
              onAnswerChange={handleAnswerChange}
            />
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
                <div className="spinner" />
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
        
        {/* Spacer for fixed bottom buttons on mobile */}
        <div className="h-32 md:h-0" />

        {/* Help Notice */}
        <Card className="mt-6 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Dica:</strong> Responda instintivamente, sem pensar muito. 
                  Não há respostas certas ou erradas - seja honesto consigo mesmo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}