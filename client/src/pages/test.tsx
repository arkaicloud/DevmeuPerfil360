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
import { type DiscAnswer, type GuestTestData } from "@shared/schema";
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

  useEffect(() => {
    // Validate session and get guest data securely
    if (!validateSession()) {
      toast({
        title: "Sessão expirada",
        description: "Por favor, reinicie o teste.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    const storedData = secureStorage.getItem("guestTestData");
    if (!storedData) {
      toast({
        title: "Dados não encontrados",
        description: "Por favor, preencha seus dados primeiro.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    setGuestData(JSON.parse(storedData));
  }, [navigate, toast]);

  const submitTestMutation = useMutation({
    mutationFn: async (data: { guestData: GuestTestData; answers: DiscAnswer[] }) => {
      // Check if user is logged in
      const currentUser = localStorage.getItem("currentUser");
      let endpoint = "/api/test/submit";
      let payload = data;

      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          endpoint = "/api/test/submit-user";
          payload = {
            userId: userData.id,
            answers: data.answers,
          };
        } catch (error) {
          console.error("Error parsing user data:", error);
          // Fallback to guest submission
        }
      }

      const response = await apiRequest("POST", endpoint, payload);

      return response.json();
    },
    onSuccess: (data) => {
      // Clear guest data from sessionStorage
      sessionStorage.removeItem("guestTestData");
      // Navigate to results
      navigate(`/results/${data.testResultId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar teste",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
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
      // Submit test
      if (guestData) {
        submitTestMutation.mutate({
          guestData,
          answers: updatedAnswers,
        });
      }
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

  if (!guestData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

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
              <p className="text-xs opacity-90">Teste DISC</p>
            </div>
          </div>
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
                Escolha a opção que MAIS se identifica com você (MA) e a que MENOS se identifica (ME)
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