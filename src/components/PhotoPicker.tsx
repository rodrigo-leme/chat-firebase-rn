import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from './Avatar';
import { colors } from './theme';

type Props = { uri: string; name: string; onPick: (uri: string) => void; isGroup?: boolean };

/** Seleciona uma foto da galeria, tratando a permissão. */
export function PhotoPicker({ uri, name, onPick, isGroup = false }: Props) {
  const pick = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher uma imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) onPick(result.assets[0].uri);
  }, [onPick]);

  return (
    <Pressable onPress={pick} style={styles.container} accessibilityRole="button">
      <Avatar uri={uri} name={name || '?'} size={88} isGroup={isGroup} />
      <Text style={styles.link}>{uri ? 'Trocar foto' : 'Escolher foto'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 12, gap: 6 },
  link: { color: colors.primary, fontWeight: '600' },
});
