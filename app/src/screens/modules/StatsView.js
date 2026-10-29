import { useRef } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../api';
import { color } from '../../theme';
import { Banner, Card, Empty, Heading, Loading, Muted, Row, Screen, Tile, TileRow, Title, useLoad } from '../../ui';
import { autoFields } from '../../registry/format';

/**
 * A summary page: tiles, lists, and (for an `auto` page) every readable field of the record.
 * cfg = { title, path | path(child), tiles(data, role), lists: [{ title, rows(data), row(item) }], auto }.
 */
function StatsBody({ cfg, child, role, reloadRef }) {
  const path = typeof cfg.path === 'function' ? cfg.path(child) : cfg.path;
  const { data, error, loading, reload } = useLoad(() => (path ? api(path) : Promise.resolve(null)), [path]);
  if (reloadRef) reloadRef.current = reload;

  return (
    <>
      <Banner text={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          {cfg.tiles ? (
            <TileRow>
              {cfg.tiles(data, role).filter(Boolean).map((t) => <Tile key={t.label} label={t.label} value={t.value ?? '—'} hint={t.hint} tone={t.tone} />)}
            </TileRow>
          ) : null}
          {(cfg.lists ?? []).map((l) => {
            const rows = l.rows(data) ?? [];
            return (
              <Card key={l.title}>
                <Heading>{l.title}</Heading>
                {rows.length ? rows.map((x, i) => {
                  const v = typeof x === 'string' ? { title: x } : l.row(x);
                  return <Row key={i} left={v.title} sub={v.sub} right={v.right !== undefined ? <Text style={{ fontWeight: '700', color: color.ink }}>{v.right}</Text> : undefined} />;
                }) : <Empty>{l.empty ?? 'Nothing here.'}</Empty>}
              </Card>
            );
          })}
          {cfg.auto ? (
            <Card>
              {autoFields(data).map(([label, value]) => <Row key={label} left={label} right={<Muted>{value}</Muted>} />)}
              {!autoFields(data).length ? <Empty>Nothing recorded yet.</Empty> : null}
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}

export function StatsScreen({ cfg, role, child = null, back = true }) {
  const reloadRef = useRef(() => {});
  return (
    <Screen back={back} onRefresh={() => reloadRef.current()}>
      <Title sub={cfg.sub}>{cfg.title}</Title>
      <StatsBody cfg={cfg} role={role} child={child} reloadRef={reloadRef} />
    </Screen>
  );
}

