/**
 * Sistema de Tratamento de Erros no Frontend
 * Converte erros técnicos em mensagens amigáveis para o usuário
 */

export const FriendlyErrorMessages = {
  // Autenticação
  AUTH: {
    USER_NOT_FOUND: "Email ou senha incorretos. Verifique seus dados e tente novamente.",
    INVALID_PASSWORD: "Email ou senha incorretos. Verifique seus dados e tente novamente.",
    INVALID_CREDENTIALS: "Email ou senha incorretos. Verifique seus dados e tente novamente.",
    USER_ALREADY_EXISTS: "Este email já está cadastrado. Tente fazer login ou use outro email.",
    WEAK_PASSWORD: "A senha deve ter pelo menos 6 caracteres.",
    INVALID_EMAIL: "Por favor, digite um email válido.",
    SESSION_EXPIRED: "Sua sessão expirou. Faça login novamente.",
    UNAUTHORIZED: "Você precisa fazer login para acessar esta página.",
    FORBIDDEN: "Você não tem permissão para acessar esta funcionalidade."
  },

  // Admin
  ADMIN: {
    INVALID_CREDENTIALS: "Credenciais de administrador inválidas. Verifique email e senha.",
    ACCESS_DENIED: "Acesso negado. Apenas administradores podem acessar esta área.",
    INVALID_CONFIG: "Configuração inválida. Verifique os dados informados."
  },

  // Testes DISC
  TEST: {
    NOT_FOUND: "Teste não encontrado. Verifique se o link está correto.",
    ALREADY_TAKEN: "Você já atingiu o limite de testes. Faça upgrade para premium ou aguarde.",
    INVALID_ANSWERS: "Algumas respostas estão incompletas. Verifique e tente novamente.",
    PROCESSING_ERROR: "Erro ao processar seu teste. Tente novamente em alguns minutos.",
    SAVE_ERROR: "Não foi possível salvar seu teste. Verifique sua conexão e tente novamente."
  },

  // Pagamentos
  PAYMENT: {
    PROCESSING_ERROR: "Erro ao processar pagamento. Tente novamente ou use outro método.",
    CARD_DECLINED: "Cartão recusado. Verifique os dados ou use outro cartão.",
    INSUFFICIENT_FUNDS: "Saldo insuficiente. Verifique seu cartão e tente novamente.",
    INVALID_CARD: "Dados do cartão inválidos. Verifique as informações.",
    PAYMENT_FAILED: "Pagamento não realizado. Entre em contato conosco se o problema persistir.",
    SUBSCRIPTION_ERROR: "Erro na assinatura. Tente novamente ou entre em contato."
  },

  // Email
  EMAIL: {
    SEND_ERROR: "Não foi possível enviar o email. Verifique seu endereço de email.",
    INVALID_EMAIL: "Email inválido. Verifique o endereço digitado.",
    TEMPLATE_ERROR: "Erro no sistema de emails. Tente novamente mais tarde.",
    CONFIG_ERROR: "Configuração de email temporariamente indisponível."
  },

  // Dados do usuário
  USER: {
    INVALID_DATA: "Alguns dados estão incorretos. Verifique as informações.",
    MISSING_FIELDS: "Preencha todos os campos obrigatórios.",
    PHONE_INVALID: "Número de telefone inválido. Use o formato (11) 99999-9999.",
    NAME_TOO_SHORT: "Nome deve ter pelo menos 2 caracteres.",
    UPDATE_ERROR: "Não foi possível atualizar seus dados. Tente novamente."
  },

  // Sistema
  SYSTEM: {
    INTERNAL_ERROR: "Erro interno do sistema. Tente novamente em alguns minutos.",
    DATABASE_ERROR: "Serviço temporariamente indisponível. Tente novamente em alguns minutos.",
    NETWORK_ERROR: "Problema de conexão. Verifique sua internet e tente novamente.",
    VALIDATION_ERROR: "Dados inválidos. Verifique as informações e tente novamente.",
    RATE_LIMIT: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
    MAINTENANCE: "Sistema em manutenção. Tente novamente em alguns minutos."
  },

  // PDF
  PDF: {
    GENERATION_ERROR: "Erro ao gerar relatório PDF. Tente novamente em alguns minutos.",
    NOT_FOUND: "Relatório não encontrado. Verifique se você tem acesso premium.",
    DOWNLOAD_ERROR: "Erro no download. Tente novamente ou atualize a página."
  },

  // Busca de resultados
  SEARCH: {
    NO_RESULTS: "Nenhum resultado encontrado. Verifique os dados e tente novamente.",
    INVALID_SEARCH: "Dados de busca inválidos. Digite um email ou WhatsApp válido.",
    MULTIPLE_RESULTS: "Encontrados múltiplos resultados. Seja mais específico na busca."
  }
};

/**
 * Converte erros de API em mensagens amigáveis
 */
export function getFriendlyError(error: any): string {
  // Se o erro já contém uma mensagem amigável, usar ela
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Se é uma mensagem de erro simples
  if (typeof error === 'string') {
    return getFriendlyErrorFromString(error);
  }

  // Se é um objeto de erro com message
  if (error?.message) {
    return getFriendlyErrorFromString(error.message);
  }

  // Se é um erro de status HTTP
  if (error?.response?.status) {
    return getFriendlyErrorFromStatus(error.response.status);
  }

  // Se é um erro de rede
  if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
    return FriendlyErrorMessages.SYSTEM.NETWORK_ERROR;
  }

  // Erro genérico
  return FriendlyErrorMessages.SYSTEM.INTERNAL_ERROR;
}

/**
 * Converte string de erro em mensagem amigável
 */
function getFriendlyErrorFromString(errorString: string): string {
  const lowerError = errorString.toLowerCase();

  // Mapeamento de erros comuns
  if (lowerError.includes('user not found') || lowerError.includes('usuário não encontrado')) {
    return FriendlyErrorMessages.AUTH.USER_NOT_FOUND;
  }

  if (lowerError.includes('invalid password') || lowerError.includes('senha inválida')) {
    return FriendlyErrorMessages.AUTH.INVALID_PASSWORD;
  }

  if (lowerError.includes('email already exists') || lowerError.includes('email já existe')) {
    return FriendlyErrorMessages.AUTH.USER_ALREADY_EXISTS;
  }

  if (lowerError.includes('unauthorized') || lowerError.includes('não autorizado')) {
    return FriendlyErrorMessages.AUTH.UNAUTHORIZED;
  }

  if (lowerError.includes('forbidden') || lowerError.includes('proibido')) {
    return FriendlyErrorMessages.AUTH.FORBIDDEN;
  }

  if (lowerError.includes('payment') || lowerError.includes('pagamento')) {
    return FriendlyErrorMessages.PAYMENT.PROCESSING_ERROR;
  }

  if (lowerError.includes('card declined') || lowerError.includes('cartão recusado')) {
    return FriendlyErrorMessages.PAYMENT.CARD_DECLINED;
  }

  if (lowerError.includes('insufficient funds') || lowerError.includes('saldo insuficiente')) {
    return FriendlyErrorMessages.PAYMENT.INSUFFICIENT_FUNDS;
  }

  if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('fetch')) {
    return FriendlyErrorMessages.SYSTEM.NETWORK_ERROR;
  }

  if (lowerError.includes('database') || lowerError.includes('banco de dados')) {
    return FriendlyErrorMessages.SYSTEM.DATABASE_ERROR;
  }

  if (lowerError.includes('validation') || lowerError.includes('validação')) {
    return FriendlyErrorMessages.SYSTEM.VALIDATION_ERROR;
  }

  if (lowerError.includes('rate limit') || lowerError.includes('many requests')) {
    return FriendlyErrorMessages.SYSTEM.RATE_LIMIT;
  }

  if (lowerError.includes('test not found') || lowerError.includes('teste não encontrado')) {
    return FriendlyErrorMessages.TEST.NOT_FOUND;
  }

  if (lowerError.includes('email') && lowerError.includes('invalid')) {
    return FriendlyErrorMessages.EMAIL.INVALID_EMAIL;
  }

  // Se nenhum mapeamento específico, retorna a mensagem original se for amigável
  if (errorString.length > 10 && !lowerError.includes('error') && !lowerError.includes('failed')) {
    return errorString;
  }

  return FriendlyErrorMessages.SYSTEM.INTERNAL_ERROR;
}

/**
 * Converte código de status HTTP em mensagem amigável
 */
function getFriendlyErrorFromStatus(status: number): string {
  switch (status) {
    case 400:
      return FriendlyErrorMessages.SYSTEM.VALIDATION_ERROR;
    case 401:
      return FriendlyErrorMessages.AUTH.UNAUTHORIZED;
    case 403:
      return FriendlyErrorMessages.AUTH.FORBIDDEN;
    case 404:
      return FriendlyErrorMessages.TEST.NOT_FOUND;
    case 429:
      return FriendlyErrorMessages.SYSTEM.RATE_LIMIT;
    case 500:
    case 502:
    case 503:
    case 504:
      return FriendlyErrorMessages.SYSTEM.INTERNAL_ERROR;
    default:
      return FriendlyErrorMessages.SYSTEM.INTERNAL_ERROR;
  }
}

/**
 * Hook personalizado para tratar erros em componentes React
 */
export function useErrorHandler() {
  return {
    handleError: (error: any) => {
      const friendlyMessage = getFriendlyError(error);
      console.error('Error handled:', error);
      return friendlyMessage;
    },
    
    handleApiError: (error: any, defaultMessage?: string) => {
      const friendlyMessage = getFriendlyError(error);
      return friendlyMessage || defaultMessage || FriendlyErrorMessages.SYSTEM.INTERNAL_ERROR;
    }
  };
}