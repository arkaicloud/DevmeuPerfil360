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
        
        console.log(`Usuário logado detectado: ${user.email}`);
        return;
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("currentUser");
      }
    }

    // For guest users, check if they have guest data from the form
    const storedData = secureStorage.getItem("guestTestData");
    if (storedData) {
      setGuestData(JSON.parse(storedData));
      setIsLoggedUser(false);
    } else {
      // If no guest data, allow them to take the test anyway
      // They'll be prompted to register at the end to save results
      console.log("Iniciando teste como convidado sem dados salvos");
      setIsLoggedUser(false);
    }
  }, [navigate, toast]);

  const submitTestMutation = useMutation({
    mutationFn: async (answers: DiscAnswer[]) => {
      let endpoint = "/api/test/submit";
      let payload: any;

      // Use logged user data if available
      if (isLoggedUser && currentUser) {
        console.log(`Enviando teste para usuário logado: ${currentUser.email} (ID: ${currentUser.id})`);
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
        
        console.log("Enviando teste como convidado com dados:", finalGuestData);
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
      <header className="psychology-gradient text-white p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">MeuPerfil360</h1>
              <p className="text-xs opacity-90">
                {isLoggedUser ? `Teste DISC - ${currentUser?.username}` : 'Teste DISC'}
              </p>
            </div>
          </div>
          {isLoggedUser && (
            <div className="text-right">
              <p className="text-xs opacity-90">Usuário Logado</p>
              <p className="text-xs opacity-75">{currentUser?.email}</p>
            </div>
          )}
        </div>
      </header>

      <div className="p-6">
        {/* Progress */}
        <TestProgress 
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={discQuestions.length}
          progress={progress}
        />

        {/* Question Card */}
        <Card className="shadow-lg border-0 mb-8">
          <CardContent className="p-6">
            <div className="text-center mb-6">
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

            <DiscQuestion
              question={currentQuestion}
              selectedMost={currentAnswer.most}
              selectedLeast={currentAnswer.least}
              onAnswerChange={handleAnswerChange}
            />
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleNext}
            disabled={!canProceed || submitTestMutation.isPending}
            className="w-full psychology-gradient btn-hover-lift"
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