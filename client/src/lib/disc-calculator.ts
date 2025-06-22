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
  // Initialize scores for MA (Mais Adequado) and ME (Menos Evidente)
  const maScores = { D: 0, I: 0, S: 0, C: 0 };
  const meScores = { D: 0, I: 0, S: 0, C: 0 };
  
  // Correct mapping based on DISC methodology
  // Each question option is mapped to its corresponding DISC factor
  const optionToDisc: Record<string, keyof typeof maScores> = {
    'A': 'D', // Dominância - direto, decidido, assume liderança
    'B': 'I', // Influência - motivar, envolver, comunicativo
    'C': 'S', // Estabilidade - harmonia, apoio, estável
    'D': 'C', // Conformidade - análise, qualidade, precisão
  };

  // Calculate scores based on DISC methodology
  // MA (Mais Adequado) = +1 ponto
  // ME (Menos Evidente) = -1 ponto
  answers.forEach(answer => {
    // +1 for MA (most adequate)
    if (optionToDisc[answer.most]) {
      maScores[optionToDisc[answer.most]] += 1;
    }
    
    // +1 for ME tracking (will be subtracted)
    if (optionToDisc[answer.least]) {
      meScores[optionToDisc[answer.least]] += 1;
    }
  });

  // Calculate final scores: MA - ME for each factor
  const rawScores = {
    D: maScores.D - meScores.D,
    I: maScores.I - meScores.I,
    S: maScores.S - meScores.S,
    C: maScores.C - meScores.C,
  };

  // Normalize to percentages using absolute values method
  const absoluteSum = Math.abs(rawScores.D) + Math.abs(rawScores.I) + Math.abs(rawScores.S) + Math.abs(rawScores.C);
  
  // Avoid division by zero
  const normalizedScores = absoluteSum > 0 ? {
    D: Math.round((Math.abs(rawScores.D) / absoluteSum) * 100),
    I: Math.round((Math.abs(rawScores.I) / absoluteSum) * 100),
    S: Math.round((Math.abs(rawScores.S) / absoluteSum) * 100),
    C: Math.round((Math.abs(rawScores.C) / absoluteSum) * 100),
  } : {
    D: 25, I: 25, S: 25, C: 25 // Equal distribution if no clear preference
  };

  // Ensure percentages sum to exactly 100% (adjust for rounding)
  const currentSum = normalizedScores.D + normalizedScores.I + normalizedScores.S + normalizedScores.C;
  if (currentSum !== 100) {
    const diff = 100 - currentSum;
    // Add difference to the highest score to maintain proportions
    const maxKey = Object.entries(normalizedScores).reduce((a, b) => 
      normalizedScores[a[0] as keyof typeof normalizedScores] > normalizedScores[b[0] as keyof typeof normalizedScores] ? a : b
    )[0] as keyof typeof normalizedScores;
    normalizedScores[maxKey] = Math.max(0, normalizedScores[maxKey] + diff);
  }

  // Determine primary profile type based on raw scores (not absolute values)
  const primaryType = Object.entries(rawScores).reduce((a, b) => 
    rawScores[a[0] as keyof typeof rawScores] > rawScores[b[0] as keyof typeof rawScores] ? a : b
  )[0] as keyof typeof rawScores;

  // Get profile description
  const descriptions = {
    D: "Você é uma pessoa decidida, direta e orientada para resultados. Gosta de liderar e tomar decisões rápidas.",
    I: "Você é comunicativo, otimista e gosta de influenciar pessoas. Tem facilidade para relacionamentos e trabalho em equipe.",
    S: "Você é paciente, leal e prefere ambientes estáveis. Valoriza a harmonia e é confiável em suas relações.",
    C: "Você é analítico, preciso e orientado por qualidade. Gosta de seguir procedimentos e busca a excelência.",
  };

  // Debug information for validation (remove in production)
  // console.log('DISC Calculation Debug:', { maScores, meScores, rawScores, absoluteSum, normalizedScores, primaryType });

  return {
    profileType: primaryType,
    scores: normalizedScores,
    description: descriptions[primaryType],
  };
}
