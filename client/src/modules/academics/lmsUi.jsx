import { TagList } from './LmsCourseMeta.jsx';

// Small pieces shared by the LMS dashboards: banner colours, progress bar, avatar initials and short dates.
const BANNERS = [
  'linear-gradient(135deg, #8b7cf0 0%, #6a5ae0 100%)',
  'linear-gradient(135deg, #d4e6a5 0%, #6f9f80 100%)',
  'linear-gradient(135deg, #f6c987 0%, #e8895e 100%)',
  'linear-gradient(135deg, #8fd3e8 0%, #5a8fd6 100%)',
  'linear-gradient(135deg, #f3a8c0 0%, #c4638b 100%)',
];
const banner = (index) => BANNERS[index % BANNERS.length];
export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
export const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? { day: '', month: '' }
    : { day: d.getDate(), month: d.toLocaleString('en', { month: 'short' }).toUpperCase() };
};
export const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
};
export const todayIso = () => new Date().toISOString().slice(0, 10);

function Progress({ value, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="lms-progress">
      <span
        className="lms-bar wide"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <i style={{ width: `${pct}%` }} />
      </span>
      <b>{pct}%</b>
    </div>
  );
}

export function CourseCard({ course, index, meta, progress, progressLabel, action, onOpen }) {
  return (
    <article className="lms-course">
      <div
        className="lms-course-banner"
        style={{
          background: course.bannerImage
            ? `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.45)), center / cover url(${course.bannerImage})`
            : banner(index),
        }}
      >
        <small>{(course.subjectName || 'COURSE').toUpperCase()}</small>
        <h3>{course.title}</h3>
        <span className="lms-star" aria-hidden="true">
          ✳
        </span>
      </div>
      <div className="lms-course-body">
        <div className="lms-course-meta">
          {meta.map((m) => (
            <small key={m}>{m}</small>
          ))}
        </div>
        <h3>{course.title}</h3>
        {course.description && <p className="hint">{course.description}</p>}
        <TagList tags={course.tags} />
        <Progress value={progress} label={`${course.title} ${progressLabel}`} />
        <button type="button" className="lms-open" onClick={onOpen}>
          <span>{action}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
