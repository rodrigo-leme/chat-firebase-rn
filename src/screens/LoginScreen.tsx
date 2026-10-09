import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, TextField } from '../components/Form';
import { ErrorMessage } from '../components/Feedback';
import { colors } from '../components/theme';
import { useAuth } from '../hooks/useAuth';
import { friendlyError } from '../utils/errors';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (e) {
      setError(friendlyError(e, 'Não foi possível entrar.'));
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Chat Firebase</Text>
        <Text style={styles.subtitle}>Entre com seu e-mail e senha</Text>
        <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        <ErrorMessage message={error} />
        <Button title="Entrar" onPress={submit} loading={loading} />
        <Button title="Criar conta" variant="secondary" onPress={() => navigation.navigate('Register')} disabled={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  title: { fontSize: 30, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: colors.muted, marginBottom: 24, marginTop: 4 },
});
