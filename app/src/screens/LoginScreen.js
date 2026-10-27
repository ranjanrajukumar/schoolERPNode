import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getServerUrl, saveServerUrl } from '../api';
import { useAuth } from '../auth';
import { color, space } from '../theme';
import { Banner, Button, Card, Field, Muted } from '../ui';

/** Parents and teachers sign in with their email; a student can use the admission number. */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState(getServerUrl());
  const [showServer, setShowServer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!identifier.trim() || !password) { setError('Enter your email (or admission number) and password.'); return; }
    setBusy(true); setError('');
    try {
      if (showServer) await saveServerUrl(server);
      await signIn(identifier, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: space.xl }}>
        <View style={{ alignItems: 'center', marginBottom: space.xl }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', marginBottom: space.md }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>S</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: color.ink }}>School ERP</Text>
          <Muted>Sign in to continue</Muted>
        </View>

        <Card>
          <Banner text={error} />
          <Field label="Email or admission number" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType="password" onSubmitEditing={submit} />
          {showServer && <Field label="Server address" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.20:4000/api" />}
          <Button title="Sign in" onPress={submit} busy={busy} />
        </Card>

        <Pressable onPress={() => setShowServer((v) => !v)} style={{ alignItems: 'center', padding: space.md }}>
          <Muted>{showServer ? 'Hide server address' : 'Server address'}</Muted>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
