import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors } from './theme';
import type { ConversationListItem } from '../types/chat';

type Props = { item: ConversationListItem; onPress: (item: ConversationListItem) => void };

export function ConversationItem({ item, onPress }: Props) {
  const isGroup = item.kind === 'group';
  const name = isGroup ? item.group.name : item.other?.name ?? 'Usuário';
  const photo = isGroup ? item.group.photoUrl : item.other?.photoUrl ?? '';
  const subtitle = isGroup ? `${item.group.memberIds.length} integrantes` : 'Conversa individual';

  return (
    <Pressable style={styles.row} onPress={() => onPress(item)}>
      <Avatar uri={photo} name={name} isGroup={isGroup} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: isGroup ? '#EDE9FE' : '#DBEAFE' }]}>
        <Text style={{ color: isGroup ? colors.group : colors.primary, fontSize: 12, fontWeight: '600' }}>
          {isGroup ? 'Grupo' : 'Individual'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});
