import { FirebaseError } from 'firebase/app';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',
  'permission-denied': 'Você não tem permissão para esta ação.',
  'PERMISSION_DENIED': 'Você não tem permissão para esta ação.',
  'unavailable': 'Serviço indisponível. Verifique sua conexão.',
};

/** Converte erros em mensagens amigáveis sem expor detalhes internos. */
export function friendlyError(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? fallback;
  }
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
    return MESSAGES.PERMISSION_DENIED;
  }
  return fallback;
}

/** Erro com mensagem já pensada para o usuário. */
export class AppError extends Error {}
