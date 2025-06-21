/**
 * Sistema de Mensagens de Erro Amigáveis
 * Centraliza todas as mensagens de erro para o usuário final
 */

export const ErrorMessages = {
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
    SEND_ERROR: "Erro no envio de email. Tente novamente mais tarde.",
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
 * Função para obter mensagem de erro amigável
 */
export function getFriendlyErrorMessage(error: any): string {
  // Se já é uma mensagem amigável, retorna como está
  if (typeof error === 'string' && error.length > 0) {
    const lowerError = error.toLowerCase();
    
    // Mapeia erros técnicos para mensagens amigáveis
    if (lowerError.includes('user not found') || lowerError.includes('usuário não encontrado')) {
      return ErrorMessages.AUTH.USER_NOT_FOUND;
    }
    
    if (lowerError.includes('invalid password') || lowerError.includes('senha inválida')) {
      return ErrorMessages.AUTH.INVALID_PASSWORD;
    }
    
    if (lowerError.includes('user already exists') || lowerError.includes('email já existe')) {
      return ErrorMessages.AUTH.USER_ALREADY_EXISTS;
    }
    
    if (lowerError.includes('database') || lowerError.includes('connection')) {
      return ErrorMessages.SYSTEM.DATABASE_ERROR;
    }
    
    if (lowerError.includes('payment') || lowerError.includes('pagamento')) {
      return ErrorMessages.PAYMENT.PROCESSING_ERROR;
    }
    
    if (lowerError.includes('email')) {
      return ErrorMessages.EMAIL.SEND_ERROR;
    }
    
    if (lowerError.includes('validation') || lowerError.includes('validação')) {
      return ErrorMessages.SYSTEM.VALIDATION_ERROR;
    }
    
    if (lowerError.includes('rate limit') || lowerError.includes('many requests')) {
      return ErrorMessages.SYSTEM.RATE_LIMIT;
    }
  }
  
  // Erro genérico se não conseguir mapear
  return ErrorMessages.SYSTEM.INTERNAL_ERROR;
}

/**
 * Wrapper para respostas de erro padronizadas
 */
export function sendErrorResponse(res: any, statusCode: number, message: string, details?: any) {
  const friendlyMessage = getFriendlyErrorMessage(message);
  
  res.status(statusCode).json({
    success: false,
    message: friendlyMessage,
    ...(process.env.NODE_ENV === 'development' && details && { details })
  });
}