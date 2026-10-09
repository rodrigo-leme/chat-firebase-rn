import { useCallback, useEffect, useState } from 'react';
import { sendMessage, subscribeConnection, subscribeMessages } from '../services/chatService';
import { friendlyError } from '../utils/errors';
import type { ChatMessage, ConversationType } from '../types/chat';

export function useChat(conversationId: string, conversationType: ConversationType, myUid: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState(false);

  // Listener em tempo real, removido ao desmontar ou trocar de conversa.
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    const unsubscribe = subscribeMessages(
      conversationId,
      (list) => {
        setMessages(list);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(friendlyError(e, 'Não foi possível carregar as mensagens.'));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [conversationId]);

  const send = useCallback(
    async (text: string, mentionedUserIds: string[]): Promise<boolean> => {
      if (!text.trim()) return false;
      setSending(true);
      setSendError(null);
      try {
        const result = await sendMessage({ conversationId, conversationType, senderId: myUid, text, mentionedUserIds });
        setPushWarning(result.pushFailed);
        return true;
      } catch (e) {
        setSendError(friendlyError(e, 'Falha ao enviar a mensagem. Tente novamente.'));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType, myUid],
  );

  return { messages, loading, error, sending, sendError, pushWarning, send };
}

export function useConnection(): boolean {
  const [connected, setConnected] = useState(true);
  useEffect(() => subscribeConnection(setConnected), []);
  return connected;
}
