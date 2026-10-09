import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, TextField } from '../components/Form';
import { ErrorMessage } from '../components/Feedback';
import { PhotoPicker } from '../components/PhotoPicker';
import { colors } from '../components/theme';
import { useAuth } from '../hooks/useAuth';
import { friendlyError } from '../utils/errors';

function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Converte DD/MM/AAAA em AAAA-MM-DD, validando a data. */
function toIsoDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const valid = date.getFullYear() === Number(yyyy) && date.getMonth() === Number(mm) - 1 && date.getDate() === Number(dd);
  if (!valid || date.getTime() > Date.now()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const isoDate = toIsoDate(birthDate);
    const phoneDigits = phone.replace(/\D/g, '');
    if (!name.trim()) return setError('Informe seu nome.');
    if (!email.trim()) return setError('Informe seu e-mail.');
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    if (phoneDigits.length < 10) return setError('Informe um celular válido com DDD.');
    if (!isoDate) return setError('Informe uma data de nascimento válida (DD/MM/AAAA).');

    setLoading(true);
    setError(null);
    try {
      const result = await register({ name, email, password, phoneNumber: phone, birthDate: isoDate, photoUri });
      if (result.photoFailed) {
        Alert.alert('Conta criada', 'Não foi possível enviar a foto agora. Uma imagem padrão será exibida.');
      }
    } catch (e) {
      setError(friendlyError(e, 'Não foi possível criar a conta.'));
      setLoading(false);
    }
  }, [name, email, password, confirm, phone, birthDate, photoUri, register]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <PhotoPicker uri={photoUri ?? ''} name={name} onPick={setPhotoUri} />
        <TextField label="Nome" value={name} onChangeText={setName} autoComplete="name" />
        <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <TextField label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <TextField label="Celular" value={phone} onChangeText={(v) => setPhone(maskPhone(v))} keyboardType="phone-pad" placeholder="(11) 91234-5678" />
        <TextField label="Data de nascimento" value={birthDate} onChangeText={(v) => setBirthDate(maskDate(v))} keyboardType="number-pad" placeholder="DD/MM/AAAA" />
        <ErrorMessage message={error} />
        <Button title="Cadastrar" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: colors.background },
});
