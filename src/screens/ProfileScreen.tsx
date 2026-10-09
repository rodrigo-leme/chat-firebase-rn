import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ErrorMessage, Loading } from '../components/Feedback';
import { colors } from '../components/theme';
import { getUserProfile } from '../services/userService';
import { friendlyError } from '../utils/errors';
import type { ChatUser } from '../types/user';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !value && { color: colors.muted }]}>{value || 'Não informado'}</Text>
    </View>
  );
}

export function ProfileScreen({ route, navigation }: Props) {
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Perfil' });
    getUserProfile(route.params.uid)
      .then((p) => {
        setProfile(p);
        if (!p) setError('Perfil não encontrado.');
      })
      .catch((e: unknown) =>
        setError(friendlyError(e, 'Não foi possível carregar o perfil.') === 'Você não tem permissão para esta ação.'
          ? 'Você só pode ver o perfil de quem compartilha uma conversa ou grupo com você.'
          : friendlyError(e, 'Não foi possível carregar o perfil.')),
      )
      .finally(() => setLoading(false));
  }, [route.params.uid, navigation]);

  if (loading) return <Loading />;
  if (!profile) return <ErrorMessage message={error} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Avatar uri={profile.photoUrl} name={profile.name} size={110} />
        <Text style={styles.name}>{profile.name || 'Não informado'}</Text>
      </View>
      <Field label="E-mail" value={profile.email} />
      <Field label="Celular" value={profile.phoneNumber} />
      <Field label="Data de nascimento" value={formatDate(profile.birthDate)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 10 },
  field: { backgroundColor: colors.surface, padding: 14, borderRadius: 10, marginBottom: 8 },
  label: { fontSize: 12, color: colors.muted },
  value: { fontSize: 16, color: colors.text, marginTop: 2 },
});
