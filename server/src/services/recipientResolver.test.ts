import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRecipients } from './recipientResolver';

const base = {
  conversationType: 'group' as const,
  memberIds: ['a', 'b', 'c', 'd'],
  senderId: 'a',
  target: { type: 'conversation' as const },
  mentionedUserIds: [] as string[],
};

test('direta: notifica apenas o outro participante', () => {
  assert.deepEqual(resolveRecipients({ conversationType: 'direct', participantIds: ['a', 'b'], senderId: 'a' }), ['b']);
});

test('all_group_messages: todos menos o remetente', () => {
  assert.deepEqual(resolveRecipients({ ...base, policy: 'all_group_messages' }), ['b', 'c', 'd']);
});

test('mentioned_members: só mencionados que são integrantes', () => {
  const result = resolveRecipients({ ...base, policy: 'mentioned_members', mentionedUserIds: ['c', 'x', 'a'] });
  assert.deepEqual(result, ['c']);
});

test('mentioned_members: destinatário selecionado', () => {
  const result = resolveRecipients({ ...base, policy: 'mentioned_members', target: { type: 'member', memberId: 'd' } });
  assert.deepEqual(result, ['d']);
});

test('direct_messages_only e disabled: ninguém no grupo', () => {
  assert.deepEqual(resolveRecipients({ ...base, policy: 'direct_messages_only' }), []);
  assert.deepEqual(resolveRecipients({ ...base, policy: 'disabled' }), []);
});
