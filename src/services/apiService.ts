import { getIdToken } from './authService';
import apiConfig from '../../apiConfig.json';

// URL pública (não é segredo). EXPO_PUBLIC_API_URL no .env sobrescreve, se definido.
const API_URL = (process.env.EXPO_PUBLIC_API_URL || apiConfig.apiUrl).replace(/\/$/, '');

/** Chamada autenticada à API online (Bearer = Firebase ID Token). */
async function post(path: string, body: Record<string, string>): Promise<void> {
  if (!API_URL) throw new Error('api-url-missing');
  const token = await getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`api-${response.status}`);
}

/** Solicita o push de uma mensagem já persistida. Destinatários são calculados na API. */
export function requestMessageNotification(conversationId: string, messageId: string): Promise<void> {
  return post('/notifications/messages', { conversationId, messageId });
}

/** Espelha os integrantes do grupo (Firestore) no Realtime Database, usado pelas regras. */
export function syncGroupMembers(groupId: string): Promise<void> {
  return post(`/groups/${encodeURIComponent(groupId)}/sync-members`, {});
}
