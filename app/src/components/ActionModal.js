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
// One choice from a list. A short list is a row of chips. A long one (all classes, all subjects) shows nothing until you type: the
// suggestions are the choices that match, and picking one closes them and shows it as "Selected".
const SUGGESTIONS = 8;
function ChoicePicker({ options, value, onChange }) {
  const [query, setQuery] = useState('');
  if (options.length <= 6) return <Chips options={options.length > 1 ? options : [...options, { value: '__', label: '—' }]} value={value} onChange={onChange} />;
  const needle = query.trim().toLowerCase();
  const matches = needle ? options.filter((o) => o.value !== '' && String(o.label).toLowerCase().includes(needle)) : [];
  const chosen = options.find((o) => o.value === value && o.value !== '');
  return (
    <View style={{ marginBottom: space.md }}>
      {chosen ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: color.header }}><Text style={{ color: '#fff', fontWeight: '700' }}>{chosen.label}</Text></View>
          <Pressable onPress={() => onChange('')}><Text style={{ color: color.muted }}>Clear</Text></Pressable>
        </View>
      ) : null}
      <Field value={query} onChangeText={setQuery} placeholder={chosen ? 'Type to choose another…' : 'Type to search…'} autoCapitalize="none" style={{ marginBottom: 4 }} />
      {needle ? (
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: color.line, borderRadius: 10, overflow: 'hidden' }}>
          {matches.slice(0, SUGGESTIONS).map((o, i) => (
            <Pressable key={o.value} onPress={() => { onChange(o.value); setQuery(''); }} style={{ paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <Text style={{ color: color.ink }}>{o.label}</Text>
            </Pressable>
          ))}
          {matches.length === 0 ? <Text style={{ padding: 12, color: color.muted }}>Nothing matches “{query}”.</Text> : null}
          {matches.length > SUGGESTIONS ? <Text style={{ padding: 10, color: color.muted, fontSize: 12 }}>{matches.length - SUGGESTIONS} more: keep typing to narrow it down.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export default function ActionModal({ visible, action, row, child = null, onClose, onDone }) {
  const [values, setValues] = useState({});
  const [options, setOptions] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !action) return;
    const fields = typeof action.fields === 'function' ? action.fields(row, child) : action.fields ?? [];
    setError('');
    setValues(Object.fromEntries(fields.map((f) => {
      const value = typeof f.default === 'function' ? f.default(row) : f.default;
      return [f.key, f.type === 'lineItems' || f.multi ? (Array.isArray(value) ? value : []) : String(value ?? '')];
    })));
    fields.filter((f) => f.optionsPath).forEach((f) => {
      api(f.optionsPath).then((list) => setOptions((o) => ({ ...o, [f.key]: [...(f.allLabel ? [{ value: '', label: f.allLabel }] : []), ...list.filter((x) => !f.filterOption || f.filterOption(x)).map((x) => (typeof x === 'string' ? { value: x, label: x } : f.mapOption ? f.mapOption(x) : { value: String(x.id ?? x.value), label: x.section ? `${x.name}-${x.section}` : x.name ?? x.label })) ] }))).catch(() => {});
    });
  }, [visible, action, row]);

  if (!action) return null;

  const fields = typeof action.fields === 'function' ? action.fields(row, child) : action.fields ?? [];

  const submit = async () => {
    for (const f of fields) {
      if (f.required && f.type === 'lineItems' && (!Array.isArray(values[f.key]) || !values[f.key].length || values[f.key].some((line) => !line.itemId || !String(line.quantity ?? '').trim()))) { setError(`${f.label} needs an item and quantity on every line.`); return; }
      if (f.type === 'lineItems') { const ids = (values[f.key] ?? []).map((line) => line.itemId).filter(Boolean); if (new Set(ids).size !== ids.length) { setError('Each item can appear only once on an order.'); return; } }
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
            {fields.map((f) => {
              const choices = f.options ? f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)) : options[f.key];
              if (f.type === 'lineItems') {
                const lines = Array.isArray(values[f.key]) ? values[f.key] : [];
                const updateLine = (index, patch) => setValues((current) => ({ ...current, [f.key]: lines.map((line, i) => i === index ? { ...line, ...patch } : line) }));
                return <View key={f.key} style={{ marginBottom: space.md }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: color.muted, textTransform: 'uppercase', marginBottom: 6 }}>{f.label}{f.required ? ' *' : ''}</Text>
                  {lines.map((line, index) => <View key={`${f.key}-${index}`} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: color.line, borderRadius: 10, padding: space.sm, marginBottom: space.sm }}>
                    <Text style={{ color: color.ink, fontWeight: '700', marginBottom: 4 }}>Line {index + 1}</Text>
                    {choices ? <Chips options={choices.length > 1 ? choices : [...choices, { value: '__', label: '—' }]} value={String(line.itemId ?? '')} onChange={(v) => updateLine(index, { itemId: v === '__' ? '' : v })} /> : <Muted>Loading choices…</Muted>}
                    <Field label="Quantity" value={String(line.quantity ?? '')} keyboardType="number-pad" onChangeText={(v) => updateLine(index, { quantity: v.replace(/[^0-9]/g, '') })} />
                    <Field label="Unit cost" value={String(line.unitCost ?? '')} keyboardType="decimal-pad" onChangeText={(v) => updateLine(index, { unitCost: v.replace(/[^0-9.]/g, '') })} />
                    {lines.length > 1 ? <Button title="Remove line" kind="ghost" onPress={() => setValues((current) => ({ ...current, [f.key]: lines.filter((_, i) => i !== index) }))} /> : null}
                  </View>)}
                  <Button title="Add another item" kind="ghost" onPress={() => setValues((current) => ({ ...current, [f.key]: [...lines, { itemId: '', quantity: '', unitCost: '0' }] }))} />
                </View>;
              }
              return choices && f.multi ? (
                <View key={f.key} style={{ marginBottom: space.sm }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: color.muted, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}{f.required ? ' *' : ''}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{choices.map((choice) => { const selected = (values[f.key] ?? []).includes(String(choice.value)); return <Pressable key={choice.value} onPress={() => setValues((current) => ({ ...current, [f.key]: selected ? current[f.key].filter((x) => x !== String(choice.value)) : [...(current[f.key] ?? []), String(choice.value)] }))} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: selected ? color.header : '#fff', borderWidth: 1, borderColor: color.line }}><Text style={{ color: selected ? '#fff' : color.ink }}>{choice.label}</Text></Pressable>; })}</View>
                </View>
              ) : choices ? (
                <View key={f.key} style={{ marginBottom: space.sm }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: color.muted, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</Text>
                  <ChoicePicker options={choices} value={values[f.key]} onChange={(v) => setValues((x) => ({ ...x, [f.key]: v === '__' ? '' : v }))} />
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
