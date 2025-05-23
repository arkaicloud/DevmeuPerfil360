export interface DiscOption {
  id: string;
  text: string;
}

export interface DiscQuestion {
  id: number;
  text: string;
  options: DiscOption[];
}

export const discQuestions: DiscQuestion[] = [
  {
    id: 1,
    text: "Como você se comporta na maioria das situações?",
    options: [
      { id: "A", text: "Sou uma pessoa decidida e direta" },
      { id: "B", text: "Gosto de influenciar e motivar pessoas" },
      { id: "C", text: "Prefiro ambientes estáveis e previsíveis" },
      { id: "D", text: "Analiso cuidadosamente antes de agir" },
    ],
  },
  {
    id: 2,
    text: "Em situações de trabalho em equipe, você tende a:",
    options: [
      { id: "A", text: "Assumir a liderança rapidamente" },
      { id: "B", text: "Motivar e envolver todos os membros" },
      { id: "C", text: "Apoiar e manter a harmonia do grupo" },
      { id: "D", text: "Focar na qualidade e precisão das tarefas" },
    ],
  },
  {
    id: 3,
    text: "Quando enfrenta problemas, sua primeira reação é:",
    options: [
      { id: "A", text: "Atacar o problema de frente imediatamente" },
      { id: "B", text: "Buscar apoio e opiniões de outras pessoas" },
      { id: "C", text: "Pensar em soluções que não gerem conflitos" },
      { id: "D", text: "Analisar todas as variáveis antes de agir" },
    ],
  },
  {
    id: 4,
    text: "Sua abordagem em relação a mudanças é:",
    options: [
      { id: "A", text: "Abraço mudanças como oportunidades" },
      { id: "B", text: "Vejo mudanças como chances de crescimento" },
      { id: "C", text: "Prefiro mudanças graduais e planejadas" },
      { id: "D", text: "Preciso entender completamente antes de aceitar" },
    ],
  },
  {
    id: 5,
    text: "Em reuniões e discussões, você costuma:",
    options: [
      { id: "A", text: "Ser direto e objetivo nos pontos principais" },
      { id: "B", text: "Participar ativamente e compartilhar ideias" },
      { id: "C", text: "Ouvir mais e falar quando necessário" },
      { id: "D", text: "Fazer perguntas detalhadas e específicas" },
    ],
  },
  {
    id: 6,
    text: "Quando toma decisões importantes, você:",
    options: [
      { id: "A", text: "Decide rapidamente baseado na intuição" },
      { id: "B", text: "Consulta pessoas de confiança" },
      { id: "C", text: "Considera o impacto em todas as pessoas envolvidas" },
      { id: "D", text: "Pesquisa exaustivamente antes de decidir" },
    ],
  },
  {
    id: 7,
    text: "Seu estilo de comunicação é mais:",
    options: [
      { id: "A", text: "Direto e sem rodeios" },
      { id: "B", text: "Expressivo e entusiástico" },
      { id: "C", text: "Calmo e respeitoso" },
      { id: "D", text: "Preciso e detalhado" },
    ],
  },
  {
    id: 8,
    text: "Em situações de pressão, você:",
    options: [
      { id: "A", text: "Mantém o foco nos resultados" },
      { id: "B", text: "Busca motivar a equipe" },
      { id: "C", text: "Trabalha de forma constante e confiável" },
      { id: "D", text: "Foca na precisão mesmo sob pressão" },
    ],
  },
  {
    id: 9,
    text: "Sua forma preferida de trabalhar é:",
    options: [
      { id: "A", text: "Com autonomia e controle sobre os resultados" },
      { id: "B", text: "Em colaboração com outras pessoas" },
      { id: "C", text: "Em ambiente estável com responsabilidades claras" },
      { id: "D", text: "Com tempo suficiente para fazer as coisas bem feitas" },
    ],
  },
  {
    id: 10,
    text: "Quando recebe críticas, você:",
    options: [
      { id: "A", text: "Aceita se forem construtivas para os resultados" },
      { id: "B", text: "Considera o relacionamento com quem critica" },
      { id: "C", text: "Prefere críticas gentis e respeitosas" },
      { id: "D", text: "Quer detalhes específicos sobre o que melhorar" },
    ],
  },
  {
    id: 11,
    text: "Seu ritmo de trabalho é:",
    options: [
      { id: "A", text: "Rápido e orientado por resultados" },
      { id: "B", text: "Variável, dependendo da motivação" },
      { id: "C", text: "Constante e confiável" },
      { id: "D", text: "Cuidadoso, mesmo que leve mais tempo" },
    ],
  },
  {
    id: 12,
    text: "Em conflitos, sua tendência é:",
    options: [
      { id: "A", text: "Enfrentar diretamente o problema" },
      { id: "B", text: "Tentar persuadir e encontrar pontos em comum" },
      { id: "C", text: "Evitar confrontos e buscar harmonia" },
      { id: "D", text: "Analisar fatos e buscar soluções lógicas" },
    ],
  },
  {
    id: 13,
    text: "Sua motivação principal vem de:",
    options: [
      { id: "A", text: "Alcançar objetivos e superar desafios" },
      { id: "B", text: "Reconhecimento e interação social" },
      { id: "C", text: "Estabilidade e segurança" },
      { id: "D", text: "Qualidade e precisão no trabalho" },
    ],
  },
  {
    id: 14,
    text: "Quando lidera outras pessoas, você:",
    options: [
      { id: "A", text: "Define objetivos claros e cobra resultados" },
      { id: "B", text: "Inspira e motiva a equipe" },
      { id: "C", text: "Cria um ambiente colaborativo e apoiador" },
      { id: "D", text: "Estabelece processos e padrões de qualidade" },
    ],
  },
  {
    id: 15,
    text: "Sua abordagem para aprender coisas novas é:",
    options: [
      { id: "A", text: "Aprendo fazendo e experimentando" },
      { id: "B", text: "Aprendo melhor em grupos e discussões" },
      { id: "C", text: "Prefiro aprendizado gradual e estruturado" },
      { id: "D", text: "Estudo detalhadamente antes de aplicar" },
    ],
  },
  {
    id: 16,
    text: "Em projetos, você prefere:",
    options: [
      { id: "A", text: "Ter controle sobre prazos e entregas" },
      { id: "B", text: "Trabalhar com pessoas criativas e dinâmicas" },
      { id: "C", text: "Ter responsabilidades bem definidas" },
      { id: "D", text: "Ter tempo para planejar e executar com qualidade" },
    ],
  },
  {
    id: 17,
    text: "Sua reação a regras e procedimentos é:",
    options: [
      { id: "A", text: "Sigo se fizerem sentido para os resultados" },
      { id: "B", text: "Adapto conforme a situação e pessoas envolvidas" },
      { id: "C", text: "Prefiro seguir procedimentos estabelecidos" },
      { id: "D", text: "Valorizo regras claras e bem estruturadas" },
    ],
  },
  {
    id: 18,
    text: "Em networking e relacionamentos profissionais:",
    options: [
      { id: "A", text: "Foco em contatos que podem gerar resultados" },
      { id: "B", text: "Gosto de conhecer muitas pessoas diferentes" },
      { id: "C", text: "Prefiro relacionamentos duradouros e confiáveis" },
      { id: "D", text: "Valorizo relacionamentos baseados em competência" },
    ],
  },
  {
    id: 19,
    text: "Quando enfrenta incertezas, você:",
    options: [
      { id: "A", text: "Age mesmo sem todas as informações" },
      { id: "B", text: "Busca opiniões e conselhos de outros" },
      { id: "C", text: "Prefere aguardar até ter mais clareza" },
      { id: "D", text: "Pesquisa até ter informações suficientes" },
    ],
  },
  {
    id: 20,
    text: "Seu estilo de dar feedback é:",
    options: [
      { id: "A", text: "Direto e focado nos resultados" },
      { id: "B", text: "Positivo e encorajador" },
      { id: "C", text: "Gentil e respeitoso" },
      { id: "D", text: "Específico e baseado em fatos" },
    ],
  },
  {
    id: 21,
    text: "Em ambientes competitivos, você:",
    options: [
      { id: "A", text: "Prospera e busca vencer" },
      { id: "B", text: "Usa carisma para se destacar" },
      { id: "C", text: "Foca na colaboração em vez da competição" },
      { id: "D", text: "Compete baseado em mérito e qualidade" },
    ],
  },
  {
    id: 22,
    text: "Sua abordagem para delegar tarefas é:",
    options: [
      { id: "A", text: "Delego com objetivos claros e autonomia" },
      { id: "B", text: "Delego para pessoas que confio e motivo" },
      { id: "C", text: "Delego gradualmente, oferecendo suporte" },
      { id: "D", text: "Delego com instruções detalhadas e acompanhamento" },
    ],
  },
  {
    id: 23,
    text: "Quando recebe novas responsabilidades:",
    options: [
      { id: "A", text: "Aceito desafios que me permitam crescer" },
      { id: "B", text: "Fico animado com oportunidades de impacto" },
      { id: "C", text: "Prefiro responsabilidades que domino bem" },
      { id: "D", text: "Quero entender completamente antes de aceitar" },
    ],
  },
  {
    id: 24,
    text: "Sua definição de sucesso é:",
    options: [
      { id: "A", text: "Alcançar objetivos e superar metas" },
      { id: "B", text: "Ter impacto positivo nas pessoas" },
      { id: "C", text: "Manter estabilidade e relacionamentos saudáveis" },
      { id: "D", text: "Fazer trabalho de qualidade e ser reconhecido pela competência" },
    ],
  },
];
