import StudentPhoto from './StudentPhoto.jsx';

const TONES = ['blue', 'amber', 'green', 'violet'];

/** The round picture shown beside a name in a grid: the stored photo when there is one, else the initials. */
export default function PersonThumb({ id, entity = 'student', has, name = '' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <StudentPhoto
      studentId={id}
      entity={entity}
      show={Boolean(has)}
      alt={name}
      className="thumb"
      fallback={
        <span className={`avatar-chip ${TONES[id % TONES.length]}`} aria-hidden="true">
          {initials}
        </span>
      }
    />
  );
}
