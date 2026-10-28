import { useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import ActionModal from '../../components/ActionModal';
import { useAuth } from '../../auth';
import { color, space } from '../../theme';
import { Badge, Banner, Button, Card, Heading, Muted, Row, Screen, Title } from '../../ui';
import { autoFields, autoRow, formatValue } from '../../registry/format';
import { findScreen } from '../../registry';
import { useChild } from '../family/ChildContext';
import { openPrivateFile, uploadBinary } from '../../api';

/** One record: its fields, a Call button for every phone number, and the actions its module allows. */
export default function DetailScreen({ route, navigation }) {
  const { registry, moduleKey, screenKey, row } = route.params;
  const cfg = findScreen(registry, moduleKey, screenKey);
  const { user } = useAuth();
  const kids = useChild();
  const child = cfg.scope === 'child' ? kids?.child ?? null : null;
  const [active, setActive] = useState(null);
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);

  const head = (cfg.row ?? autoRow)(row, child);
  const fields = cfg.detail
    ? cfg.detail.map(([label, key]) => [label, formatValue(typeof key === 'string' ? key : label, typeof key === 'function' ? key(row) : row[key]), key]).filter(([, v]) => v !== null)
    : autoFields(row);
  const phones = fields.filter(([label, value]) => /phone|mobile/i.test(label) && /\d{6,}/.test(String(value)));
  const lmsReadAction = cfg.key === 'lms' && user?.role === 'student' ? [{
    kind: 'action', label: row.viewCount ? 'Record another read' : 'Mark as read', method: 'POST',
    path: (_r, c) => `/portal/children/${c?.id}/lms/lessons/${row.id}/view`, body: () => ({}), done: () => 'Lesson read recorded.',
  }] : [];
  const actions = [...(cfg.actions ?? []), ...lmsReadAction].filter((a) => (!a.when || a.when(row)) && (!a.roles || a.roles.includes(user?.role)));

  const run = (a) => {
    if (a.kind === 'file') { openPrivateFile(a.path(row, child), a.name?.(row) ?? 'school-document').catch((e) => setMessage(e.message)); return; }
    if (a.kind === 'upload') {
      DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true }).then(async (picked) => {
        if (picked.canceled) return;
        const asset = picked.assets[0];
        if (asset.size > 5 * 1024 * 1024) throw new Error('File exceeds the 5 MB limit.');
        const bytes = Platform.OS === 'web' ? (asset.file ? await asset.file.arrayBuffer() : await (await fetch(asset.uri)).arrayBuffer()) : await new File(asset.uri).arrayBuffer();
        if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('File exceeds the 5 MB limit.');
        await uploadBinary(`${a.path(row, child)}?name=${encodeURIComponent(asset.name)}`, bytes, asset.mimeType || 'application/octet-stream');
        setMessage(a.done?.() ?? 'File submitted.');
      }).catch((e) => setMessage(e.message));
      return;
    }
    if (a.kind === 'link') { Linking.openURL(a.url(row)).catch(() => setMessage('Could not open the link.')); return; }
    if (a.kind === 'navigate') { navigation.navigate(a.route, a.params ? a.params(row) : undefined); return; }
    setActive(a);
  };

  return (
    <Screen back>
      <Title sub={head.sub}>{head.title}</Title>
      {head.badge ? <View style={{ marginBottom: space.md }}><Badge text={head.badge.text} tone={head.badge.tone} /></View> : null}
      <Banner text={message} kind="ok" />

      {!finished && actions.length > 0 && (
        <View style={{ gap: 8, marginBottom: space.md }}>
          {actions.map((a) => <Button key={a.label} title={a.label} kind={a.tone === 'danger' ? 'danger' : a.tone === 'ghost' ? 'ghost' : 'primary'} onPress={() => run(a)} />)}
        </View>
      )}
      {phones.length > 0 && (
        <View style={{ gap: 8, marginBottom: space.md }}>
          {phones.map(([label, value]) => <Button key={label} kind="ghost" title={`Call ${label.toLowerCase()}: ${value}`} onPress={() => Linking.openURL(`tel:${String(value).replace(/\s/g, '')}`)} />)}
        </View>
      )}

      <Card>
        <Heading>Details</Heading>
        {fields.length ? fields.map(([label, value]) => (
          <Row key={label} left={<Text style={{ color: color.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>} right={<Text style={{ color: color.ink, maxWidth: 220, textAlign: 'right' }}>{value}</Text>} />
        )) : <Muted>Nothing else recorded.</Muted>}
      </Card>

      <ActionModal
        visible={Boolean(active)}
        action={active ? { confirm: active.fields ? undefined : 'Are you sure?', ...active } : null}
        row={row}
        child={child}
        onClose={() => setActive(null)}
        onDone={(res) => { setMessage(active?.done ? active.done(res, row) : 'Done.'); setActive(null); setFinished(true); }}
      />
    </Screen>
  );
}
