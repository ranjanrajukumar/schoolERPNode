import './lms.css';

const jump = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

const Check = ({ done }) => <span className={`lms-check${done ? ' done' : ''}`} aria-hidden="true">{done ? '✓' : ''}</span>;

/** Left-hand outline of a course for a learner: each section with its lessons and Done marks, then the assessments. */
export default function LmsCourseOutline({ course }) {
  const sections = [];
  for (const lesson of course.lessons) {
    const title = lesson.moduleTitle ? `${lesson.moduleSequence}. ${lesson.moduleTitle}` : 'Lessons';
    const last = sections[sections.length - 1];
    if (last?.title === title) last.lessons.push(lesson); else sections.push({ title, lessons: [lesson] });
  }
  const assessments = (course.assignments?.length ?? 0) + (course.quizzes?.length ?? 0);
  return <nav className="lms-outline" aria-label={`${course.title} outline`}>
    <h4>{course.completed}/{course.total} lessons done · {course.completionPercent}%</h4>
    {sections.map((section) => {
      const done = section.lessons.every((l) => l.completedAt);
      return <div className="lms-outline-unit" key={section.title}>
        <b><Check done={done} /><span className="grow">{section.title}</span>{done && <span className="lms-done-tag">Done</span>}</b>
        {section.lessons.map((l) => <a key={l.id} href={`#lms-lesson-${l.id}`} onClick={jump(`lms-lesson-${l.id}`)}><Check done={l.completedAt} /><span className="grow">{l.title}</span>{l.completedAt && <span className="lms-done-tag">Done</span>}</a>)}
      </div>;
    })}
    {assessments > 0 && <div className="lms-outline-unit lms-outline-assess">
      <b><span className="grow">Assessments</span></b>
      {course.assignments.map((a) => <a key={`a${a.id}`} href={`#lms-assignment-${a.id}`} onClick={jump(`lms-assignment-${a.id}`)}><Check done={a.submission} /><span className="grow">{a.title}<small className="block">Assignment · {a.maxScore} marks{a.dueOn ? ` · due ${a.dueOn}` : ''}</small></span>{a.submission && <span className="lms-done-tag">Done</span>}</a>)}
      {course.quizzes.map((q) => <a key={`q${q.id}`} href={`#lms-quiz-${q.id}`} onClick={jump(`lms-quiz-${q.id}`)}><Check done={q.attemptCount > 0} /><span className="grow">{q.title}<small className="block">Quiz · {q.questions.length} questions{q.bestScore != null ? ` · best ${q.bestScore}/${q.maxScore}` : ''}</small></span>{q.attemptCount > 0 && <span className="lms-done-tag">Done</span>}</a>)}
    </div>}
    {!course.lessons.length && !assessments && <small>Nothing published yet.</small>}
  </nav>;
}
