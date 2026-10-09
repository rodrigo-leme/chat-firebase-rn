import type { ConversationType } from './chat';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: { mode: 'direct' } | { mode: 'pick'; selectedIds: string[]; groupId?: string };
  GroupForm: { groupId?: string; pickedIds?: string[] };
  Chat: { conversationId: string; conversationType: ConversationType };
  GroupMembers: { groupId: string };
  Profile: { uid: string };
};
