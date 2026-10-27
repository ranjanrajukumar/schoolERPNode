import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { color, radius, space } from '../theme';
import { Banner, Button, Chips, Field, Muted } from '../ui';

/**
 * A small form in a sheet: collects a few values, sends them, and reports the result.
 * `action` = { label, fields: [{ key, label, keyboard, multiline, required, options, optionsPath, default }], method, path, body(values), confirm, done(result) }
 * Fields of type options (a fixed list) or optionsPath (a list read from the API) render as choices.
 */
export default function ActionModal({ visible, action, row, child = null, onClose, onDone }) {
  const [values, setValues] = useState({});
  const [options, setOptions] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !action) return;
    setError('');
    setValues(Object.fromEntries((action.fields ?? []).map((f) => [f.key, typeof f.default === 'function' ? String(f.default(row) ?? '') : String(f.default ?? '')])));
    (action.fields ?? []).filter((f) => f.optionsPath).forEach((f) => {
      api(f.optionsPath).then((list) => setOptions((o) => ({ ...o, [f.key]: [...(f.allLabel ? [{ value: '', label: f.allLabel }] : []), ...list.map((x) => (typeof x === 'string' ? { value: x, label: x } : { value: x.id ?? x.value, label: x.section ? `${x.name}-${x.section}` : x.name ?? x.label })) ] }))).catch(() => {});
    });
  }, [visible, action, row]);

  if (!action) return null;

  const submit = async () => {
    for (const f of action.fields ?? []) {
      if (f.required && !String(values[f.key] ?? '').trim()) { setError(`${f.label} is required.`); return; }
    }
    setBusy(true); setError('');
    try {
      const body = action.body ? action.body(values, row, child) : values;
      const result = await api(typeof action.path === 'function' ? action.path(row, child) : action.path, { method: action.method ?? 'POST', body });
      onDone(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: color.bg, borderTopLeftRadius: radius * 1.5, borderTopRightRadius: radius * 1.5, padding: space.lg, maxHeight: 560 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: color.ink, marginBottom: space.sm }}>{action.label}</Text>
          {action.confirm ? <Muted style={{ marginBottom: space.md }}>{typeof action.confirm === 'function' ? action.confirm(row) : action.confirm}</Muted> : null}
          <ScrollView keyboardShouldPersistTaps="handled">
            <Banner text={error} />
            {(action.fields ?? []).map((f) => {
              const choices = f.options ? f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)) : options[f.key];
              return choices ? (
                <View key={f.key} style={{ marginBottom: space.sm }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: color.muted, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</Text>
                  <Chips options={choices.length > 1 ? choices : [...choices, { value: '__', label: '—' }]} value={values[f.key]} onChange={(v) => setValues((x) => ({ ...x, [f.key]: v }))} />
                </View>
              ) : (
                <Field
                  key={f.key}
                  label={f.label + (f.required ? ' *' : '')}
                  value={values[f.key] ?? ''}
                  onChangeText={(t) => setValues((x) => ({ ...x, [f.key]: t }))}
                  keyboardType={f.keyboard}
                  multiline={f.multiline}
                  style={f.multiline ? { minHeight: 70 } : undefined}
                />
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: space.sm }}>
            <Button title="Cancel" kind="ghost" style={{ flex: 1 }} onPress={onClose} />
            <Button title={action.submit ?? 'Confirm'} kind={action.tone === 'danger' ? 'danger' : 'primary'} style={{ flex: 1 }} onPress={submit} busy={busy} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
