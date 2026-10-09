import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type Props = { uri: string; name: string; size?: number; isGroup?: boolean };

/** Foto com imagem padrão (inicial) quando ausente ou com falha de carregamento. */
export function Avatar({ uri, name, size = 44, isGroup = false }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return <Image source={{ uri }} style={dimension} onError={() => setFailed(true)} accessibilityLabel={name} />;
  }
  return (
    <View style={[styles.fallback, dimension, { backgroundColor: isGroup ? colors.group : colors.primary }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFF', fontWeight: '700' },
});
