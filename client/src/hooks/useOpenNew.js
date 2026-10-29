import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Lets a link such as /staff?new=1 open that page's "new" popup, then tidies the address bar. */
export function useOpenNew(open, allowed = true) {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('new') && allowed) {
      open();
      setParams({}, { replace: true });
    }
  }, [params, allowed]); // eslint-disable-line react-hooks/exhaustive-deps
}
