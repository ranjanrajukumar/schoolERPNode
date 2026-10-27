import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { getServerUrl } from '../api';
import { useAuth } from '../auth';
import { globalMode, useChangeSchool, useClient } from '../client';
import { color } from '../theme';
import { Button, Card, Muted, Screen, Title } from '../ui';

/** Extra pages (given as `links`), the password, and sign out. Used by both the family and the staff apps. */
export default function MoreScreen({ navigation, links = [] }) {
  const { user, signOut } = useAuth();
  const { client } = useClient();
  const changeSchool = useChangeSchool();
  const confirmChange = () => {
    if (Platform.OS === 'web') { if (globalThis.confirm?.('Sign out and use another account?')) changeSchool(); return; }
    Alert.alert('Switch account?', 'You will be signed out and can sign in as someone else.', [{ text: 'Stay', style: 'cancel' }, { text: 'Switch account', style: 'destructive', onPress: changeSchool }]);
  };
  return (
    <Screen>
      <Title sub={`Signed in as ${user?.role}${globalMode && client ? ` at ${client.name}` : ''}`}>{user?.name}</Title>
      {links.length > 0 && (
        <Card style={{ padding: 0 }}>
          {links.map(([label, route, params], i) => (
            <Pressable key={label} onPress={() => navigation.navigate(route, params)} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: color.ink }}>{label}</Text>
              <Text style={{ color: color.muted, fontSize: 18 }}>{'›'}</Text>
            </Pressable>
          ))}
        </Card>
      )}
      <Card style={{ padding: 0 }}>
        <Pressable onPress={() => navigation.navigate('ChangePassword')} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: color.ink }}>Change password</Text>
          <Text style={{ color: color.muted, fontSize: 18 }}>{'›'}</Text>
        </Pressable>
      </Card>
      <View style={{ marginTop: 8, gap: 8 }}>
        {globalMode ? <Button title="Switch account" kind="ghost" onPress={confirmChange} /> : null}
        <Button title="Sign out" kind="danger" onPress={signOut} />
      </View>
      <Muted style={{ textAlign: 'center', marginTop: 16 }}>Server: {getServerUrl()}</Muted>
    </Screen>
  );
}
