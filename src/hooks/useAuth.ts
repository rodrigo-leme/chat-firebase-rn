import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

/** Para telas protegidas: garante o usuário autenticado. */
export function useCurrentUid(): string {
  const { user } = useAuth();
  return user?.uid ?? '';
}
