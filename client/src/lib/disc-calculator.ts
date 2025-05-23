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

  // Normalize scores to percentages (0-100)
  const maxScore = Math.max(...Object.values(scores));
  const minScore = Math.min(...Object.values(scores));
  const range = maxScore - minScore || 1;

  const normalizedScores = {
    D: Math.round(((scores.D - minScore) / range) * 60 + 20), // Scale to 20-80 range
    I: Math.round(((scores.I - minScore) / range) * 60 + 20),
    S: Math.round(((scores.S - minScore) / range) * 60 + 20),
    C: Math.round(((scores.C - minScore) / range) * 60 + 20),
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
