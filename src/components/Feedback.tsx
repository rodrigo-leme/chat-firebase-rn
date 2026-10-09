import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

export function Banner({ message, tone = 'warning' }: { message: string; tone?: 'warning' | 'danger' }) {
  return (
    <View style={[styles.banner, { backgroundColor: tone === 'danger' ? '#FEE2E2' : '#FEF3C7' }]}>
      <Text style={{ color: tone === 'danger' ? colors.danger : colors.warning }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  muted: { color: colors.muted, textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  error: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginVertical: 8 },
  errorText: { color: colors.danger },
  banner: { paddingVertical: 8, paddingHorizontal: 16 },
});
