import { useState } from 'react';
import { useAuth } from '../auth';
import { Banner, Button, Card, Field, Muted, Screen, Title } from '../ui';

/** Shown first when the account holds a temporary password: nothing else works until it is replaced. */
export default function ChangePasswordScreen({ forced = false }) {
  const { changePassword, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const submit = async () => {
    setError(''); setDone('');
    if (next.length < 8) { setError('The new password must be at least 8 characters.'); return; }
    if (next !== again) { setError('The two new passwords do not match.'); return; }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setAgain('');
      setDone('Password changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back={!forced}>
      <Title sub={forced ? 'You were given a temporary password. Choose your own to continue.' : undefined}>{forced ? 'Choose a new password' : 'Change password'}</Title>
      <Card>
        <Banner text={error} />
        <Banner text={done} kind="ok" />
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" />
        <Field label="New password again" value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" />
        <Muted style={{ marginBottom: 12 }}>At least 8 characters, different from the current one.</Muted>
        <Button title="Save password" onPress={submit} busy={busy} />
      </Card>
      {forced && <Button title="Sign out" kind="ghost" onPress={signOut} />}
    </Screen>
  );
}
