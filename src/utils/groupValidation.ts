export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_LIMIT = 50;

export function parseMemberLimit(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) ? parsed : null;
}

/** Retorna mensagem de erro ou null se válido. */
export function validateGroup(name: string, memberIds: string[], memberLimit: number | null): string | null {
  if (name.trim().length === 0) return 'Informe o nome do grupo.';
  if (memberLimit === null) return 'O limite deve ser um número inteiro.';
  if (memberLimit < MIN_GROUP_MEMBERS || memberLimit > MAX_GROUP_LIMIT) {
    return `O limite deve estar entre ${MIN_GROUP_MEMBERS} e ${MAX_GROUP_LIMIT}.`;
  }
  if (memberIds.length < MIN_GROUP_MEMBERS) return 'O grupo precisa de pelo menos 2 integrantes.';
  if (memberIds.length > memberLimit) {
    return `O grupo tem ${memberIds.length} integrantes, acima do limite de ${memberLimit}.`;
  }
  return null;
}

export function availableSlots(memberCount: number, memberLimit: number): number {
  return Math.max(memberLimit - memberCount, 0);
}
