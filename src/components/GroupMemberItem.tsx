import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors } from './theme';
import type { PublicProfile } from '../types/user';

type Props = {
  profile: PublicProfile;
  subtitle?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: (profile: PublicProfile) => void;
  actionLabel?: string;
  onAction?: (profile: PublicProfile) => void;
};

/** Linha de usuário/integrante, usada nas telas de usuários e de integrantes. */
export function GroupMemberItem({ profile, subtitle, selected, disabled, onPress, actionLabel, onAction }: Props) {
  return (
    <Pressable
      style={[styles.row, selected && styles.selected, disabled && { opacity: 0.5 }]}
      disabled={disabled || !onPress}
      onPress={() => onPress?.(profile)}
    >
      <Avatar uri={profile.photoUrl} name={profile.name} size={40} />
      <View style={styles.info}>
        <Text style={styles.name}>{profile.name}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {selected !== undefined ? <Text style={styles.check}>{selected ? '✓' : ''}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={() => onAction(profile)} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  selected: { backgroundColor: '#EFF6FF' },
  info: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted },
  check: { color: colors.primary, fontSize: 18, fontWeight: '700', width: 20 },
  action: { color: colors.danger, fontWeight: '600' },
});
