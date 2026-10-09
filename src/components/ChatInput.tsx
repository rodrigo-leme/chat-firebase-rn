import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from './theme';
import type { PublicProfile } from '../types/user';

type Props = {
  sending: boolean;
  members: PublicProfile[]; // vazio em conversas individuais
  onSend: (text: string, mentionedUserIds: string[]) => Promise<boolean>;
};

export function ChatInput({ sending, members, onSend }: Props) {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  const toggleMention = useCallback((uid: string) => {
    setMentions((current) => (current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]));
  }, []);

  const submit = useCallback(async () => {
    const ok = await onSend(text, mentions);
    if (ok) {
      setText('');
      setMentions([]);
      setShowMentions(false);
    }
  }, [onSend, text, mentions]);

  return (
    <View style={styles.wrapper}>
      {showMentions && members.length > 0 ? (
        <ScrollView horizontal style={styles.chips} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}>
          {members.map((m) => {
            const active = mentions.includes(m.uid);
            return (
              <Pressable key={m.uid} onPress={() => toggleMention(m.uid)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={{ color: active ? '#FFF' : colors.primary }}>@{m.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <View style={styles.row}>
        {members.length > 0 ? (
          <Pressable onPress={() => setShowMentions((v) => !v)} style={styles.iconButton} accessibilityLabel="Mencionar integrante">
            <Text style={[styles.at, mentions.length > 0 && { color: colors.primary }]}>@</Text>
          </Pressable>
        ) : null}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Digite uma mensagem"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={submit}
          disabled={sending || !text.trim()}
          style={[styles.send, (sending || !text.trim()) && { opacity: 0.5 }]}
          accessibilityRole="button"
        >
          {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendText}>Enviar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  chips: { paddingTop: 8, maxHeight: 44 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipActive: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8 },
  iconButton: { padding: 8 },
  at: { fontSize: 20, fontWeight: '700', color: colors.muted },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
  },
  send: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: '#FFF', fontWeight: '600' },
});
