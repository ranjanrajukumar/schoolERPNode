import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getServerUrl, saveServerUrl } from '../api';
import { useAuth } from '../auth';
import { globalLogin, globalMode, useClient } from '../client';
import SchoolBadge from '../components/SchoolBadge';
import { color, radius, space } from '../theme';
import { Banner, Button, Card, Chips, Field, Muted } from '../ui';

const ROLE_LABEL = { student: 'Student', teacher: 'Teacher', parent: 'Parent', admin: 'Administrator', accountant: 'Accountant' };

// Single-school mode only: everyone signs in the same way and the school's server knows who they are; the choice only words the box.
const WHO = {
  student: { label: 'Student', field: 'Admission number or email', hint: 'Your admission number, or the email the school gave you' },
  teacher: { label: 'Teacher', field: 'Email', hint: 'The email on your staff profile' },
  parent: { label: 'Parent', field: 'Email', hint: 'The email the school has for you' },
};

/** When one phone number or email is a login at several schools or roles, the person says which one they want. */
function ChooseAccount({ accounts, onChoose, onBack, busy, error }) {
  return (
    <>
      <Text style={{ fontSize: 20, fontWeight: '800', color: color.ink, textAlign: 'center' }}>Choose an account</Text>
      <Muted style={{ textAlign: 'center', marginBottom: space.lg }}>This sign-in matches more than one account.</Muted>
      <Banner text={error} />
      {accounts.map((a) => (
        <Pressable key={`${a.clientCode}-${a.role}-${a.name}`} onPress={() => onChoose(a)} disabled={busy} accessibilityRole="button" accessibilityLabel={`${a.clientName}, ${ROLE_LABEL[a.role] ?? a.role}, ${a.name}`}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: color.line, padding: space.md, marginBottom: space.sm, opacity: busy ? 0.6 : 1 }}>
          <SchoolBadge school={{ name: a.clientName, logoUrl: a.logoUrl }} />
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: color.ink }}>{a.clientName}</Text>
            <Muted>{ROLE_LABEL[a.role] ?? a.role} {'·'} {a.name}</Muted>
          </View>
          <Ionicons name="chevron-forward" size={20} color={color.muted} />
        </Pressable>
      ))}
      <Pressable onPress={onBack} style={{ alignItems: 'center', padding: space.md }}><Muted>Back</Muted></Pressable>
    </>
  );
}

/**
 * Sign in. With the global registry the person types a mobile number (or email) and password and the app works out which school and role they
 * are; without it they sign in at the one school this app serves.
 */
export default function LoginScreen() {
  const { signIn, signInWithTicket } = useAuth();
  const { client, connect } = useClient();
  const [who, setWho] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState(null); // set when the sign-in matched more than one account
  const [server, setServer] = useState(getServerUrl());
  const [showServer, setShowServer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const enter = async (account) => {
    setBusy(true); setError('');
    try {
      await connect(account); // from now on every call goes to this school
      await signInWithTicket(account.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!identifier.trim() || !password) { setError(globalMode ? 'Enter your mobile number or email, and your password.' : `Enter your ${WHO[who].field.toLowerCase()} and password.`); return; }
    setBusy(true); setError('');
    try {
      if (globalMode) {
        const found = await globalLogin(identifier, password);
        if (found.length === 1) { await enter(found[0]); return; }
        setAccounts(found);
        return;
      }
      if (showServer) await saveServerUrl(server);
      await signIn(identifier, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const brand = (
    <View style={{ alignItems: 'center', marginBottom: space.xl }}>
      {client && !globalMode ? <SchoolBadge school={client} size={68} /> : (
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="school" size={34} color="#fff" />
        </View>
      )}
      <Text style={{ fontSize: 24, fontWeight: '800', color: color.ink, marginTop: space.md, textAlign: 'center' }}>School ERP</Text>
      <Muted>{globalMode ? 'Students, teachers and parents sign in here' : 'Sign in to continue'}</Muted>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.xl }} keyboardShouldPersistTaps="handled">
          {brand}

          {accounts ? (
            <ChooseAccount accounts={accounts} onChoose={enter} onBack={() => { setAccounts(null); setError(''); }} busy={busy} error={error} />
          ) : (
            <>
              {!globalMode ? <Chips options={Object.entries(WHO).map(([value, w]) => ({ value, label: w.label }))} value={who} onChange={(v) => { setWho(v); setError(''); }} /> : null}
              <Card>
                <Banner text={error} />
                {globalMode ? (
                  <Field label="Mobile number or email" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" placeholder="98765 43210 or you@example.com" />
                ) : (
                  <Field label={WHO[who].field} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" placeholder={WHO[who].hint} />
                )}
                <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType="password" onSubmitEditing={submit} />
                {showServer && !globalMode ? <Field label="Server address" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.20:4000/api" /> : null}
                <Button title="Sign in" onPress={submit} busy={busy} />
              </Card>
              {globalMode ? (
                <Muted style={{ textAlign: 'center', marginTop: space.md }}>Your school is found from your mobile number or email. A student can also use the admission number.</Muted>
              ) : (
                <Pressable onPress={() => setShowServer((v) => !v)} style={{ alignItems: 'center', padding: space.md }}>
                  <Muted>{showServer ? 'Hide server address' : 'Server address'}</Muted>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
