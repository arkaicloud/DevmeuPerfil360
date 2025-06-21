import { type DiscAnswer } from "@shared/schema";

export interface DiscProfile {
  profileType: string;
  scores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  description: string;
}

export function calculateDiscProfile(answers: DiscAnswer[]): DiscProfile {
  // Initialize scores
  const scores = { D: 0, I: 0, S: 0, C: 0 };
  
  // Map options to DISC categories (simplified mapping for demo)
  const optionToDisc: Record<string, keyof typeof scores> = {
    'A': 'D', // Dominance
    'B': 'I', // Influence  
    'C': 'S', // Steadiness
    'D': 'C', // Conscientiousness
  };

  // Calculate scores based on answers
  answers.forEach(answer => {
    // Add points for "most" answers
    if (optionToDisc[answer.most]) {
      scores[optionToDisc[answer.most]] += 2;
    }
    
    // Subtract points for "least" answers  
    if (optionToDisc[answer.least]) {
      scores[optionToDisc[answer.least]] -= 1;
    }
  });

  // Convert raw scores to individual percentages (0-100 scale for each factor)
  // Each factor gets its own independent percentage without forcing a 100% total
  const maxPossibleScore = answers.length * 2; // Maximum points per factor
  
  // Handle negative scores by shifting to positive range
  const minScore = Math.min(scores.D, scores.I, scores.S, scores.C);
  const shift = minScore < 0 ? Math.abs(minScore) : 0;
  
  // Calculate individual percentages for each DISC factor
  const normalizedScores = {
    D: Math.min(100, Math.max(0, Math.round(((scores.D + shift) / (maxPossibleScore + shift)) * 100))),
    I: Math.min(100, Math.max(0, Math.round(((scores.I + shift) / (maxPossibleScore + shift)) * 100))),
    S: Math.min(100, Math.max(0, Math.round(((scores.S + shift) / (maxPossibleScore + shift)) * 100))),
    C: Math.min(100, Math.max(0, Math.round(((scores.C + shift) / (maxPossibleScore + shift)) * 100))),
  };

  // Determine primary profile type
  const primaryType = Object.entries(normalizedScores).reduce((a, b) => 
    normalizedScores[a[0] as keyof typeof normalizedScores] > normalizedScores[b[0] as keyof typeof normalizedScores] ? a : b
  )[0] as keyof typeof normalizedScores;

  // Get profile description
  const descriptions = {
    D: "Você é uma pessoa decidida, direta e orientada para resultados. Gosta de liderar e tomar decisões rápidas.",
    I: "Você é comunicativo, otimista e gosta de influenciar pessoas. Tem facilidade para relacionamentos e trabalho em equipe.",
    S: "Você é paciente, leal e prefere ambientes estáveis. Valoriza a harmonia e é confiável em suas relações.",
    C: "Você é analítico, preciso e orientado por qualidade. Gosta de seguir procedimentos e busca a excelência.",
  };

  return {
    profileType: primaryType,
    scores: normalizedScores,
    description: descriptions[primaryType],
  };
}
