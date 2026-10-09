import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';
import type { ChatMessage as Message } from '../types/chat';

type Props = {
  message: Message;
  isMine: boolean;
  authorName: string | null;
  mentionNames: string[];
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function ChatMessageComponent({ message, isMine, authorName, mentionNames }: Props) {
  return (
    <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
      {authorName && !isMine ? <Text style={styles.author}>{authorName}</Text> : null}
      {mentionNames.length > 0 ? (
        <Text style={[styles.mention, isMine && { color: '#DBEAFE' }]}>Para: {mentionNames.map((n) => `@${n}`).join(', ')}</Text>
      ) : null}
      <Text style={[styles.text, isMine && { color: '#FFF' }]}>{message.text}</Text>
      <Text style={[styles.time, isMine && { color: '#DBEAFE' }]}>{formatTime(message.createdAt)}</Text>
    </View>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.mine, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.theirs, borderBottomLeftRadius: 4 },
  author: { fontSize: 12, fontWeight: '700', color: colors.group, marginBottom: 2 },
  mention: { fontSize: 12, color: colors.primaryDark, marginBottom: 2 },
  text: { fontSize: 16, color: colors.text },
  time: { fontSize: 10, color: colors.muted, alignSelf: 'flex-end', marginTop: 2 },
});
