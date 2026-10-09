import { useEffect, useState } from 'react';
import { listenNotificationTaps, listenTokenRefresh, registerDevice, type RegistrationResult } from '../services/notificationService';
import type { PushData } from '../types/notification';

/** Registra o aparelho após o login e trata toques nas notificações. */
export function useNotifications(uid: string | null, onOpen: (data: PushData) => void) {
  const [status, setStatus] = useState<RegistrationResult['status'] | 'idle' | 'error'>('idle');

  useEffect(() => {
    if (!uid) {
      setStatus('idle');
      return undefined;
    }
    registerDevice(uid)
      .then((result) => setStatus(result.status))
      .catch(() => setStatus('error'));
    return listenTokenRefresh(uid);
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return listenNotificationTaps(onOpen);
  }, [uid, onOpen]);

  return status;
}
