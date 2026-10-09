export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: { value: NotificationPolicy; label: string }[] = [
  { value: 'all_group_messages', label: 'Todas as mensagens' },
  { value: 'mentioned_members', label: 'Somente mencionados' },
  { value: 'direct_messages_only', label: 'Apenas conversas individuais' },
  { value: 'disabled', label: 'Desativadas' },
];

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

/** Dados enviados no payload do push. */
export type PushData = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};
