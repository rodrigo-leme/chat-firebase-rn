/** Gera um id determinístico para a conversa direta: direct_<uidMenor>_<uidMaior>. */
export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) {
    throw new Error('Não é possível conversar consigo mesmo.');
  }
  const [first, second] = [uidA, uidB].sort();
  return `direct_${first}_${second}`;
}

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.startsWith('direct_');
}

export function otherParticipant(participants: [string, string], myUid: string): string {
  return participants[0] === myUid ? participants[1] : participants[0];
}
