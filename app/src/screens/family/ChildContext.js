import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Banner, Chips, Empty, Loading, Screen, Title, useLoad } from '../../ui';

const ChildContext = createContext(null);
export const useChild = () => useContext(ChildContext);

/** The children this parent may see (or the student's own record), and which one is selected on every screen. */
export function ChildProvider({ children: screens }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [childId, setChildId] = useState(null);

  useEffect(() => {
    api('/portal/children')
      .then((rows) => { setList(rows); setChildId((id) => id ?? rows[0]?.id ?? null); })
      .catch((err) => setError(err.message));
  }, []);

  const value = useMemo(
    () => ({ list: list ?? [], child: (list ?? []).find((c) => c.id === childId) ?? null, setChildId, error, loading: list === null && !error }),
    [list, childId, error],
  );
  return <ChildContext.Provider value={value}>{screens}</ChildContext.Provider>;
}

/**
 * One portal screen for the selected child: title, child switcher, pull-to-refresh, loading and error states.
 * `path(child)` is the API path to read; `render(data, child, reload)` draws it. `deps` are extra values the path depends on.
 */
export function ChildScreen({ title, sub, path, render, deps = [], header, back = false }) {
  const { list, child, setChildId, loading: loadingKids, error: kidsError } = useChild();
  const { data, error, loading, reload } = useLoad(() => (child ? api(path(child)) : Promise.resolve(null)), [child?.id, ...deps]);

  return (
    <Screen onRefresh={reload} refreshing={loading && data !== null} back={back}>
      <Title sub={typeof sub === 'function' ? sub(child) : sub}>{title}</Title>
      {loadingKids ? <Loading /> : kidsError ? <Banner text={kidsError} /> : !child ? (
        <Empty>No student is linked to this account yet. Please ask the school office.</Empty>
      ) : (
        <>
          <Chips options={list.map((c) => ({ value: c.id, label: c.name.split(' ')[0] }))} value={child.id} onChange={setChildId} />
          {header}
          <Banner text={error} />
          {data === null && loading ? <Loading /> : data !== null ? render(data, child, reload) : null}
        </>
      )}
    </Screen>
  );
}
