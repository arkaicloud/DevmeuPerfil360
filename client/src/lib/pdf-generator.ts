interface DiscProfile {
  D: number;
  I: number;
  S: number;
  C: number;
}

interface TestResult {
  id: number;
  profileType: string;
  scores: DiscProfile;
  isPremium: boolean;
  createdAt: string;
  guestName: string;
}

interface ProfileData {
  dominantFactor: string;
  percentage: number;
  description: string;
  tone: string;
  strengths: string[];
  developmentAreas: string[];
  underPressure: string;
  supportFactors: string[];
  careers: string[];
  resources: {
    books: string[];
    podcasts: string[];
    courses: string[];
  };
}

const PROFILE_CONFIGS: Record<string, ProfileData> = {
  D: {
    dominantFactor: "Dominância",
    percentage: 0,
    description: "Você é uma pessoa orientada para resultados, direta e decidida. Tem forte capacidade de liderança e gosta de desafios.",
    tone: "direto e confiante",
    strengths: [
      "Liderança natural e capacidade de tomar decisões rápidas",
      "Orientação para resultados e foco em objetivos",
      "Coragem para enfrentar desafios e mudanças",
      "Habilidade para influenciar e motivar equipes",
      "Visão estratégica e pensamento inovador"
    ],
    developmentAreas: [
      "Desenvolver paciência e escuta ativa",
      "Melhorar a comunicação empática",
      "Aprender a delegar com mais confiança",
      "Considerar mais opiniões antes de decidir",
      "Equilibrar urgência com qualidade"
    ],
    underPressure: "Tende a se tornar mais assertivo e impaciente, podendo ser percebido como controlador. É importante manter a calma e considerar diferentes perspectivas.",
    supportFactors: ["Estabilidade para equilibrar a urgência", "Conformidade para garantir qualidade", "Influência para melhorar relacionamentos"],
    careers: [
      "CEO e Alta Liderança",
      "Gerência de Projetos",
      "Vendas Corporativas",
      "Consultoria Estratégica",
      "Empreendedorismo",
      "Direção Comercial"
    ],
    resources: {
      books: [
        "O Poder do DISC - Marcelo Souza",
        "Liderança Radical - Raj Sisodia",
        "O Executivo Eficaz - Peter Drucker"
      ],
      podcasts: [
        "Liderança Inovadora",
        "PodExec",
        "Café com ADM"
      ],
      courses: [
        "Gestão de Conflitos",
        "Liderança Estratégica",
        "Negociação Avançada"
      ]
    }
  },
  I: {
    dominantFactor: "Influência",
    percentage: 0,
    description: "Você é uma pessoa comunicativa, otimista e sociável. Tem facilidade para criar relacionamentos e inspirar outros.",
    tone: "inspirador e sociável",
    strengths: [
      "Excelente comunicação e habilidades interpessoais",
      "Capacidade natural de influenciar e persuadir",
      "Otimismo contagiante e energia positiva",
      "Criatividade e pensamento inovador",
      "Facilidade para trabalhar em equipe"
    ],
    developmentAreas: [
      "Melhorar o foco em detalhes e precisão",
      "Desenvolver habilidades de planejamento",
      "Aprender a ser mais objetivo em comunicações",
      "Controlar a tendência de dispersão",
      "Fortalecer a persistência em tarefas longas"
    ],
    underPressure: "Pode se tornar desorganizado e evitar confrontos. É importante manter a estrutura e não perder o foco nos objetivos.",
    supportFactors: ["Conformidade para organização", "Dominância para foco em resultados", "Estabilidade para consistência"],
    careers: [
      "Marketing e Comunicação",
      "Vendas e Relacionamento",
      "Recursos Humanos",
      "Treinamento e Desenvolvimento",
      "Relações Públicas",
      "Coaching e Mentoria"
    ],
    resources: {
      books: [
        "Como Fazer Amigos e Influenciar Pessoas - Dale Carnegie",
        "O Poder da Comunicação - Reinaldo Polito",
        "Inteligência Emocional - Daniel Goleman"
      ],
      podcasts: [
        "Café com ADM",
        "PodPeople",
        "Vendas B2B"
      ],
      courses: [
        "Comunicação Assertiva e Influente",
        "Marketing Digital",
        "Técnicas de Apresentação"
      ]
    }
  },
  S: {
    dominantFactor: "Estabilidade",
    percentage: 0,
    description: "Você é uma pessoa confiável, paciente e colaborativa. Valoriza a harmonia e tem facilidade para apoiar outros.",
    tone: "empático e tranquilizador",
    strengths: [
      "Confiabilidade e consistência em todas as atividades",
      "Excelente capacidade de trabalho em equipe",
      "Paciência e habilidade para ouvir ativamente",
      "Lealdade e comprometimento com pessoas e organizações",
      "Capacidade de mediar conflitos e criar harmonia"
    ],
    developmentAreas: [
      "Desenvolver assertividade e autoconfiança",
      "Aprender a expressar opiniões com mais clareza",
      "Melhorar a adaptabilidade a mudanças",
      "Fortalecer habilidades de tomada de decisão",
      "Equilibrar apoio aos outros com autocuidado"
    ],
    underPressure: "Tende a evitar confrontos e pode se sobrecarregar ajudando outros. É importante estabelecer limites saudáveis.",
    supportFactors: ["Dominância para assertividade", "Influência para comunicação", "Conformidade para estrutura"],
    careers: [
      "Educação e Ensino",
      "Serviço Social",
      "Enfermagem e Saúde",
      "Atendimento ao Cliente",
      "Administração e Suporte",
      "Psicologia e Terapia"
    ],
    resources: {
      books: [
        "Inteligência Relacional - Eduardo Shinyashiki",
        "O Poder da Empatia - Roman Krznaric",
        "Comunicação Não-Violenta - Marshall Rosenberg"
      ],
      podcasts: [
        "CoachCast Brasil",
        "Psicologia Positiva",
        "Desenvolvimento Humano"
      ],
      courses: [
        "Liderança: Princípios e Práticas",
        "Inteligência Emocional",
        "Mediação de Conflitos"
      ]
    }
  },
  C: {
    dominantFactor: "Conformidade",
    percentage: 0,
    description: "Você é uma pessoa analítica, organizada e orientada para a qualidade. Tem atenção aos detalhes e busca a excelência.",
    tone: "analítico e organizado",
    strengths: [
      "Excelente atenção aos detalhes e precisão",
      "Capacidade analítica e pensamento crítico",
      "Organização e planejamento sistemático",
      "Foco na qualidade e busca pela excelência",
      "Habilidade para resolver problemas complexos"
    ],
    developmentAreas: [
      "Desenvolver flexibilidade e adaptabilidade",
      "Melhorar habilidades de comunicação interpessoal",
      "Aprender a tomar decisões mais rapidamente",
      "Equilibrar perfeccionismo com produtividade",
      "Fortalecer confiança em situações ambíguas"
    ],
    underPressure: "Pode se tornar excessivamente crítico e perfeccionista, causando paralisia na tomada de decisões. É importante equilibrar qualidade com agilidade.",
    supportFactors: ["Influência para comunicação", "Dominância para agilidade", "Estabilidade para paciência"],
    careers: [
      "Engenharia e Tecnologia",
      "Finanças e Controladoria",
      "Pesquisa e Desenvolvimento",
      "Qualidade e Processos",
      "Auditoria e Compliance",
      "Análise de Dados"
    ],
    resources: {
      books: [
        "As 5 Disfunções de uma Equipe - Patrick Lencioni",
        "O Poder do Hábito - Charles Duhigg",
        "Thinking, Fast and Slow - Daniel Kahneman"
      ],
      podcasts: [
        "Liderança Inovadora",
        "Data Science Podcast",
        "Gestão de Processos"
      ],
      courses: [
        "Gestão de Conflitos e Mediação",
        "Análise de Dados",
        "Metodologias Ágeis"
      ]
    }
  }
};

export function generateWeeklyActionPlan(profileType: string): string[] {
  const plans = {
    D: [
      "Semana 1: Pratique escuta ativa em 3 reuniões diferentes. Faça perguntas antes de dar soluções.",
      "Semana 2: Delegue uma tarefa importante para um membro da equipe e acompanhe sem microgerenciar.",
      "Semana 3: Reserve 30min diários para reflexão estratégica antes de tomar decisões importantes.",
      "Semana 4: Implemente um feedback 360° com sua equipe para entender seu impacto nos outros."
    ],
    I: [
      "Semana 1: Organize sua agenda diária usando técnicas de time-blocking para melhorar o foco.",
      "Semana 2: Compartilhe 3 ideias criativas em reuniões e documente os resultados obtidos.",
      "Semana 3: Pratique comunicação objetiva: resuma suas ideias em 2 minutos máximo.",
      "Semana 4: Estabeleça um sistema de follow-up para projetos e compromissos assumidos."
    ],
    S: [
      "Semana 1: Expresse sua opinião honesta em pelo menos 2 situações onde normalmente ficaria calado.",
      "Semana 2: Proponha uma melhoria em um processo de trabalho baseada em sua experiência.",
      "Semana 3: Pratique dizer 'não' de forma respeitosa quando sua agenda estiver sobrecarregada.",
      "Semana 4: Lidere uma iniciativa pequena para desenvolver confiança em tomada de decisões."
    ],
    C: [
      "Semana 1: Pratique tomar decisões rápidas em situações de baixo risco (limite: 15 minutos).",
      "Semana 2: Participe ativamente de uma discussão informal com colegas para melhorar relacionamentos.",
      "Semana 3: Estabeleça um 'tempo limite' para análises: 80% da informação pode ser suficiente.",
      "Semana 4: Compartilhe uma análise detalhada de forma simples e visual para a equipe."
    ]
  };
  
  return plans[profileType as keyof typeof plans] || [];
}

export function generateReflectiveQuestions(profileType: string): string[] {
  const questions = {
    D: [
      "Como minha abordagem direta afetou os relacionamentos esta semana?",
      "Quais decisões poderiam ter sido melhores se eu tivesse consultado outros?",
      "Em que momentos fui muito impaciente e como posso melhorar?",
      "Que feedback recebido esta semana pode me ajudar a crescer?"
    ],
    I: [
      "Consegui manter o foco nos objetivos principais desta semana?",
      "Como posso melhorar minha organização pessoal e profissional?",
      "Quais promessas fiz e quais consegui cumprir?",
      "De que forma posso ser mais objetivo em minhas comunicações?"
    ],
    S: [
      "Em quais situações deixei de expressar minha opinião quando deveria?",
      "Como posso equilibrar melhor ajudar outros com cuidar de mim mesmo?",
      "Que mudanças enfrentei esta semana e como me adaptei?",
      "Quais limites preciso estabelecer para ser mais efetivo?"
    ],
    C: [
      "Quais análises excessivas me impediram de avançar esta semana?",
      "Como posso comunicar informações complexas de forma mais simples?",
      "Em que momentos o perfeccionismo foi mais prejudicial que útil?",
      "Que decisões poderia ter tomado mais rapidamente?"
    ]
  };
  
  return questions[profileType as keyof typeof questions] || [];
}

export function generatePersonalizedNarrative(profileType: string, scores: DiscProfile, guestName: string): string {
  const config = PROFILE_CONFIGS[profileType];
  const dominantScore = scores[profileType as keyof DiscProfile];
  const percentage = Math.round(dominantScore);
  
  return `
## Seu Perfil DISC Personalizado

Olá, ${guestName}! 

Seu perfil DISC revela que você tem **${percentage}% de ${config.dominantFactor}**, caracterizando você como uma pessoa com tom **${config.tone}**.

${config.description}

### Seus Principais Pontos Fortes

${config.strengths.map(strength => `• ${strength}`).join('\n')}

### Áreas de Desenvolvimento

${config.developmentAreas.map(area => `• ${area}`).join('\n')}

### Como Você Reage Sob Pressão

${config.underPressure}

### Fatores de Apoio para Seu Crescimento

${config.supportFactors.map(factor => `• ${factor}`).join('\n')}

### Carreiras e Funções Ideais

${config.careers.map(career => `• ${career}`).join('\n')}

### Recursos Recomendados para Seu Perfil

**Livros:**
${config.resources.books.map(book => `• ${book}`).join('\n')}

**Podcasts:**
${config.resources.podcasts.map(podcast => `• ${podcast}`).join('\n')}

**Cursos:**
${config.resources.courses.map(course => `• ${course}`).join('\n')}
  `;
}

export function generatePremiumPDF(testResult: TestResult): string {
  const { profileType, scores, guestName } = testResult;
  const config = PROFILE_CONFIGS[profileType];
  
  // Update percentage based on actual scores
  config.percentage = Math.round(scores[profileType as keyof DiscProfile]);
  
  const narrative = generatePersonalizedNarrative(profileType, scores, guestName);
  const actionPlan = generateWeeklyActionPlan(profileType);
  const questions = generateReflectiveQuestions(profileType);
  
  return `
# Relatório DISC Premium - ${guestName}

${narrative}

## Seu Plano de Ação de 4 Semanas

${actionPlan.map((week, index) => `### ${week}`).join('\n\n')}

## Perguntas para Reflexão Semanal

${questions.map((question, index) => `**Semana ${index + 1}:** ${question}`).join('\n\n')}

## Sabotadores Inconscientes para ${config.dominantFactor}

Como pessoa com perfil ${config.dominantFactor} dominante, esteja atento a estes padrões que podem sabotar seu progresso:

${profileType === 'D' ? `
• **Impaciência excessiva:** Tomar decisões rápidas demais sem considerar todas as variáveis
• **Microgerenciamento:** Dificuldade para delegar verdadeiramente
• **Comunicação brusca:** Ser percebido como insensível ou autoritário
` : profileType === 'I' ? `
• **Falta de foco:** Dispersar energia em muitas direções ao mesmo tempo
• **Promessas excessivas:** Comprometer-se com mais do que consegue entregar
• **Evitar detalhes:** Negligenciar aspectos importantes por serem "chatos"
` : profileType === 'S' ? `
• **Evitar conflitos:** Não expressar opiniões importantes para manter harmonia
• **Sobrecarga por não saber dizer não:** Aceitar mais responsabilidades do que deveria
• **Resistência a mudanças:** Ficar na zona de conforto mesmo quando é prejudicial
` : `
• **Paralisia por análise:** Buscar informações demais antes de tomar decisões
• **Perfeccionismo paralisante:** Não entregar por não estar "perfeito"
• **Isolamento social:** Focar tanto em tarefas que negligencia relacionamentos
`}

---

*Este relatório foi gerado especificamente para seu perfil ${config.dominantFactor} dominante. Use-o como um guia para seu desenvolvimento pessoal e profissional contínuo.*
  `;
}