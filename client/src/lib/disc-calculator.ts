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

  // Normalize scores to percentages that sum to exactly 100%
  // Handle negative scores by shifting to positive range
  const minScore = Math.min(scores.D, scores.I, scores.S, scores.C);
  const shift = minScore < 0 ? Math.abs(minScore) : 0;
  
  // Create positive scores with minimum value of 1
  const positiveScores = {
    D: Math.max(1, scores.D + shift + 1),
    I: Math.max(1, scores.I + shift + 1),
    S: Math.max(1, scores.S + shift + 1),
    C: Math.max(1, scores.C + shift + 1),
  };
  
  // Calculate total for percentage conversion
  const total = positiveScores.D + positiveScores.I + positiveScores.S + positiveScores.C;
  
  // Calculate exact percentages
  const exactPercentages = {
    D: (positiveScores.D / total) * 100,
    I: (positiveScores.I / total) * 100,
    S: (positiveScores.S / total) * 100,
    C: (positiveScores.C / total) * 100,
  };
  
  // Apply largest remainder method for exact 100% distribution
  const baseScores = {
    D: Math.floor(exactPercentages.D),
    I: Math.floor(exactPercentages.I),
    S: Math.floor(exactPercentages.S),
    C: Math.floor(exactPercentages.C),
  };
  
  // Calculate remainders for each score
  const remainderData = [
    { type: 'D', remainder: exactPercentages.D - baseScores.D },
    { type: 'I', remainder: exactPercentages.I - baseScores.I },
    { type: 'S', remainder: exactPercentages.S - baseScores.S },
    { type: 'C', remainder: exactPercentages.C - baseScores.C },
  ].sort((a, b) => b.remainder - a.remainder);
  
  // Start with base scores
  const normalizedScores = { ...baseScores };
  
  // Calculate remaining percentage points to distribute
  const baseSum = baseScores.D + baseScores.I + baseScores.S + baseScores.C;
  const remaining = 100 - baseSum;
  
  // Distribute remaining points to highest remainders
  for (let i = 0; i < remaining; i++) {
    const targetType = remainderData[i % 4].type as keyof typeof normalizedScores;
    normalizedScores[targetType] += 1;
  }

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
