import { useState, useCallback } from "react";
import { type DiscAnswer } from "@shared/schema";
import { discQuestions } from "@/lib/disc-questions";

export function useTest() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<DiscAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<{ most: string; least: string }>({
    most: "",
    least: "",
  });

  const currentQuestion = discQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / discQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === discQuestions.length - 1;
  const canProceed = currentAnswer.most && currentAnswer.least && currentAnswer.most !== currentAnswer.least;

  const saveCurrentAnswer = useCallback(() => {
    if (!canProceed) return false;

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
    return true;
  }, [canProceed, currentQuestion.id, currentAnswer, answers]);

  const goToNext = useCallback(() => {
    if (!saveCurrentAnswer()) return false;

    if (!isLastQuestion) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // Load existing answer if available
      const nextQuestion = discQuestions[nextIndex];
      const existingAnswer = answers.find(a => a.questionId === nextQuestion.id);
      
      if (existingAnswer) {
        setCurrentAnswer({
          most: existingAnswer.most,
          least: existingAnswer.least,
        });
      } else {
        setCurrentAnswer({ most: "", least: "" });
      }
    }
    
    return true;
  }, [saveCurrentAnswer, isLastQuestion, currentQuestionIndex, answers]);

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      
      // Load previous answer
      const prevQuestion = discQuestions[prevIndex];
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
  }, [currentQuestionIndex, answers]);

  const updateAnswer = useCallback((type: "most" | "least", value: string) => {
    setCurrentAnswer(prev => ({
      ...prev,
      [type]: value,
    }));
  }, []);

  const resetTest = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setCurrentAnswer({ most: "", least: "" });
  }, []);

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: discQuestions.length,
    progress,
    isLastQuestion,
    canProceed,
    answers,
    currentAnswer,
    goToNext,
    goToPrevious,
    updateAnswer,
    resetTest,
    saveCurrentAnswer,
  };
}
