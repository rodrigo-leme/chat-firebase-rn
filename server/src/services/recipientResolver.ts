export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

export type ResolverInput =
  | { conversationType: 'direct'; participantIds: string[]; senderId: string }
  | {
      conversationType: 'group';
      memberIds: string[];
      policy: NotificationPolicy;
      senderId: string;
      target: MessageTarget;
      mentionedUserIds: string[];
    };

/**
 * Calcula os destinatários do push no servidor (nunca confia no cliente).
 * Regras: remetente nunca recebe; somente participantes recebem.
 */
export function resolveRecipients(input: ResolverInput): string[] {
  if (input.conversationType === 'direct') {
    return input.participantIds.filter((id) => id !== input.senderId);
  }

  const members = new Set(input.memberIds);
  const others = input.memberIds.filter((id) => id !== input.senderId);

  switch (input.policy) {
    case 'all_group_messages':
      return others;
    case 'mentioned_members': {
      const targeted = new Set(input.mentionedUserIds);
      if (input.target.type === 'member') targeted.add(input.target.memberId);
      return Array.from(targeted).filter((id) => id !== input.senderId && members.has(id));
    }
    case 'direct_messages_only':
    case 'disabled':
      return [];
  }
}
