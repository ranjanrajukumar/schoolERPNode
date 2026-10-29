import { Link, useParams } from 'react-router-dom';
import { findPlanned } from '../../config/menu.js';

/** Placeholder for menu entries that are on the roadmap but not built yet. */
export default function Planned() {
  const { moduleSlug, itemSlug } = useParams();
  const found = findPlanned(moduleSlug, itemSlug);
  if (!found) return <p className="error">That page does not exist.</p>;
  const { group, item } = found;
  const built = group.items.filter((i) => i.built);

  return (
    <>
      <h1>{item.label}</h1>
      <div className="card">
        <p>
          <span className="badge partial">Planned</span> {group.label} → {item.label} is on the roadmap and
          has not been built yet.
        </p>
        {built.length > 0 && (
          <>
            <p className="hint">Available now in {group.label}:</p>
            <p>
              {[...new Map(built.map((i) => [i.to, i])).values()].map((i) => (
                <Link key={i.to} className="btn" to={i.to}>
                  {i.label}
                </Link>
              ))}
            </p>
          </>
        )}
      </div>
    </>
  );
}
