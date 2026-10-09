import type { ChatGroup } from './group';
import type { PublicProfile } from './user';

export type ConversationType = 'direct' | 'group';

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/** Item exibido na lista de conversas. */
export type ConversationListItem =
  | { kind: 'direct'; conversation: DirectConversation; other: PublicProfile | null; sortKey: number }
  | { kind: 'group'; group: ChatGroup; sortKey: number };
