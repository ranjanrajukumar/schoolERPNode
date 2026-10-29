import { useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api, fetchBlob } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';

const blankAssignment = { title: '', instructions: '', dueOn: '', maxScore: 100, published: false };
const blankQuestion = () => ({
  type: 'single_choice',
  prompt: '',
  choicesText: '',
  correctIndex: 0,
  correctIndexesText: '',
  points: 1,
});

export default function LmsAssessmentPanel({ course, only = null }) {
  const [tab, setTab] = useState(only ?? 'assignments');
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [gradebook, setGradebook] = useState(null);
  const [form, setForm] = useState(blankAssignment);
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    dueOn: '',
    maxAttempts: 3,
    published: false,
    questions: [blankQuestion()],
  });
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [scores, setScores] = useState({});
  const [quizAttempts, setQuizAttempts] = useState(null);
  const [quizReview, setQuizReview] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [quizModal, setQuizModal] = useState(false);

  const loadAssignments = async () => setAssignments(await api(`/lms/courses/${course.id}/assignments`));
  const loadQuizzes = async () => setQuizzes(await api(`/lms/courses/${course.id}/quizzes`));
  const loadGradebook = async () => setGradebook(await api(`/lms/courses/${course.id}/gradebook`));
  useEffect(() => {
    setError('');
    setSubmission(null);
    loadAssignments().catch((e) => setError(e.message));
    loadQuizzes().catch((e) => setError(e.message));
  }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 'gradebook') loadGradebook().catch((e) => setError(e.message));
  }, [tab, course.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createAssignment = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/lms/courses/${course.id}/assignments`, { method: 'POST', body: form });
      setForm(blankAssignment);
      setAssignmentModal(false);
      await loadAssignments();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const createQuiz = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const questions = quizForm.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: Number(q.points),
        ...(q.type === 'short_answer'
          ? {}
          : q.type === 'true_false'
            ? { correctIndex: Number(q.correctIndex) }
            : {
                choices: q.choicesText
                  .split('|')
                  .map((x) => x.trim())
                  .filter(Boolean),
                ...(q.type === 'multiple_choice'
                  ? {
                      correctIndexes: q.correctIndexesText
                        .split(',')
                        .map((x) => Number(x.trim()) - 1)
                        .filter((x) => Number.isInteger(x) && x >= 0),
                    }
                  : { correctIndex: Number(q.correctIndex) }),
              }),
      }));
      await api(`/lms/courses/${course.id}/quizzes${editingQuiz ? `/${editingQuiz.id}` : ''}`, {
        method: editingQuiz ? 'PUT' : 'POST',
        body: { ...quizForm, questions },
      });
      setEditingQuiz(null);
      setQuizForm({
        title: '',
        description: '',
        dueOn: '',
        maxAttempts: 3,
        published: false,
        questions: [blankQuestion()],
      });
      setQuizModal(false);
      await loadQuizzes();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const showSubmissions = async (a) => {
    try {
      const data = await api(`/lms/courses/${course.id}/assignments/${a.id}/submissions`);
      setSubmission(data);
      setScores(
        Object.fromEntries(
          data.rows.map((r) => [r.studentId, { score: r.score ?? '', feedback: r.feedback ?? '' }]),
        ),
      );
    } catch (err) {
      setError(err.message);
    }
  };
  const grade = async (row) => {
    try {
      await api(
        `/lms/courses/${course.id}/assignments/${submission.assignment.id}/submissions/${row.studentId}`,
        { method: 'PUT', body: scores[row.studentId] },
      );
      setError('');
      await showSubmissions(submission.assignment);
      await loadAssignments();
    } catch (err) {
      setError(err.message);
    }
  };
  const toggleAssignment = async (a) => {
    try {
      await api(`/lms/courses/${course.id}/assignments/${a.id}`, {
        method: 'PUT',
        body: {
          title: a.title,
          instructions: a.instructions,
          dueOn: a.dueOn,
          maxScore: a.maxScore,
          published: !a.published,
        },
      });
      await loadAssignments();
    } catch (err) {
      setError(err.message);
    }
  };
  const removeAssignment = async (a) => {
    if (!window.confirm(`Delete assignment “${a.title}” and its submissions?`)) return;
    try {
      await api(`/lms/courses/${course.id}/assignments/${a.id}`, { method: 'DELETE' });
      await loadAssignments();
    } catch (err) {
      setError(err.message);
    }
  };
  const removeQuiz = async (q) => {
    if (!window.confirm(`Delete quiz “${q.title}” and its attempts?`)) return;
    try {
      await api(`/lms/courses/${course.id}/quizzes/${q.id}`, { method: 'DELETE' });
      await loadQuizzes();
    } catch (err) {
      setError(err.message);
    }
  };
  const toggleQuiz = async (q) => {
    try {
      await api(`/lms/courses/${course.id}/quizzes/${q.id}`, {
        method: 'PUT',
        body: { ...q, published: !q.published },
      });
      await loadQuizzes();
    } catch (err) {
      setError(err.message);
    }
  };
  const downloadSubmission = async (row) => {
    try {
      const blob = await fetchBlob(
        `/lms/courses/${course.id}/assignments/${submission.assignment.id}/submissions/${row.studentId}/file`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = row.attachmentName || 'submission';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    }
  };
  const editQuiz = (q) => {
    setQuizModal(true);
    setEditingQuiz(q);
    setQuizForm({
      title: q.title,
      description: q.description ?? '',
      dueOn: q.dueOn ?? '',
      maxAttempts: q.maxAttempts,
      published: q.published,
      questions: q.questions.map((x) => ({
        id: x.id,
        type: x.type || 'single_choice',
        prompt: x.prompt,
        choicesText: (x.choices ?? []).join(' | '),
        correctIndex: x.correctIndex ?? 0,
        correctIndexesText: (x.correctIndexes ?? []).map((i) => i + 1).join(', '),
        points: x.points ?? 1,
      })),
    });
  };
  const showQuizAttempts = async (q) => {
    try {
      setQuizAttempts({ quiz: q, rows: await api(`/lms/courses/${course.id}/quizzes/${q.id}/attempts`) });
      setQuizReview({});
    } catch (err) {
      setError(err.message);
    }
  };
  const reviewAttempt = async (attempt) => {
    try {
      const scores = Object.fromEntries(
        attempt.questions
          .filter((question) => question.type === 'short_answer')
          .map((question) => [question.id, Number(quizReview[attempt.id]?.[question.id] ?? 0)]),
      );
      await api(`/lms/courses/${course.id}/quizzes/${quizAttempts.quiz.id}/attempts/${attempt.id}/review`, {
        method: 'PUT',
        body: { questionScores: scores, feedback: quizReview[attempt.id]?.feedback ?? '' },
      });
      await showQuizAttempts(quizAttempts.quiz);
      await loadQuizzes();
    } catch (err) {
      setError(err.message);
    }
  };
  const editQuizQuestion = (index, changes) =>
    setQuizForm((form) => ({
      ...form,
      questions: form.questions.map((q, i) => (i === index ? { ...q, ...changes } : q)),
    }));

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <h2>
        {only === 'assignments' ? 'Assignments' : only === 'quizzes' ? 'Quizzes & tests' : 'Assessments'} ·{' '}
        {course.title}
      </h2>
      {!only && (
        <div className="tabs-line" role="tablist">
          {[
            ['assignments', 'Assignments'],
            ['quizzes', 'Quizzes'],
            ['gradebook', 'Gradebook'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {tab === 'assignments' && (
        <>
          <div className="row-actions" style={{ margin: '10px 0' }}>
            <button
              type="button"
              onClick={() => {
                setError('');
                setAssignmentModal(true);
              }}
            >
              + Create assignment
            </button>
          </div>
          <Modal
            className="lms-ns"
            open={assignmentModal}
            title="Create assignment"
            onClose={() => setAssignmentModal(false)}
          >
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <form onSubmit={createAssignment} className="enquiry-form">
              <div className="enq-grid">
                <label className="wide">
                  <span>Title *</span>
                  <input
                    required
                    maxLength={160}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>
                <label>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={form.dueOn}
                    onChange={(e) => setForm({ ...form, dueOn: e.target.value })}
                  />
                </label>
                <label>
                  <span>Maximum score</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={form.maxScore}
                    onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                  />
                </label>
                <label className="wide">
                  <span>Instructions</span>
                  <textarea
                    rows={3}
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />{' '}
                  Publish assignment
                </label>
              </div>
              <div className="form-actions">
                <button disabled={busy}>{busy ? 'Saving…' : 'Add assignment'}</button>
                <button type="button" className="ghost" onClick={() => setAssignmentModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Due</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <b>{a.title}</b>
                      <small className="block">Score out of {a.maxScore}</small>
                    </td>
                    <td>{a.dueOn || '—'}</td>
                    <td>
                      {a.graded} graded · {a.submissions} submitted
                    </td>
                    <td>{a.published ? 'Published' : 'Draft'}</td>
                    <td className="row-actions">
                      <button type="button" className="ghost" onClick={() => showSubmissions(a)}>
                        Review
                      </button>
                      <button type="button" className="ghost" onClick={() => toggleAssignment(a)}>
                        {a.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <Gate action="delete">
                        <button type="button" className="ghost" onClick={() => removeAssignment(a)}>
                          Delete
                        </button>
                      </Gate>
                    </td>
                  </tr>
                ))}
                {!assignments.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No assignments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {submission && (
            <div className="table-scroll">
              <h3>Submissions · {submission.assignment.title}</h3>
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Work</th>
                    <th>Score / {submission.assignment.maxScore}</th>
                    <th>Feedback</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {submission.rows.map((r) => (
                    <tr key={r.studentId}>
                      <td>
                        {r.name}
                        <small className="block">{r.admissionNo}</small>
                        {r.isLate && <span className="badge rejected">Submitted late</span>}
                      </td>
                      <td>
                        {r.response ? (
                          <span style={{ whiteSpace: 'pre-wrap' }}>{r.response}</span>
                        ) : r.submittedAt ? (
                          'Submitted'
                        ) : (
                          'Not submitted'
                        )}
                        {r.resourceUrl && (
                          <a className="block" target="_blank" rel="noopener noreferrer" href={r.resourceUrl}>
                            Open work link
                          </a>
                        )}
                        {r.attachmentName && (
                          <button type="button" className="ghost" onClick={() => downloadSubmission(r)}>
                            Download {r.attachmentName}
                          </button>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={submission.assignment.maxScore}
                          step="0.5"
                          disabled={!r.submittedAt}
                          value={scores[r.studentId]?.score ?? ''}
                          onChange={(e) =>
                            setScores({
                              ...scores,
                              [r.studentId]: { ...scores[r.studentId], score: e.target.value },
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          disabled={!r.submittedAt}
                          value={scores[r.studentId]?.feedback ?? ''}
                          onChange={(e) =>
                            setScores({
                              ...scores,
                              [r.studentId]: { ...scores[r.studentId], feedback: e.target.value },
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={
                            !r.submittedAt ||
                            scores[r.studentId]?.score == null ||
                            scores[r.studentId]?.score === ''
                          }
                          onClick={() => grade(r)}
                        >
                          Save grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {tab === 'quizzes' && (
        <>
          <div className="row-actions" style={{ margin: '10px 0' }}>
            <button
              type="button"
              onClick={() => {
                setError('');
                setEditingQuiz(null);
                setQuizForm({
                  title: '',
                  description: '',
                  dueOn: '',
                  maxAttempts: 3,
                  published: false,
                  questions: [blankQuestion()],
                });
                setQuizModal(true);
              }}
            >
              + Create quiz
            </button>
          </div>
          <Modal
            className="lms-ns"
            open={quizModal}
            title={editingQuiz ? 'Edit quiz' : 'Create quiz'}
            onClose={() => {
              setQuizModal(false);
              setEditingQuiz(null);
            }}
          >
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <form onSubmit={createQuiz} className="enquiry-form">
              <div className="enq-grid">
                <label className="wide">
                  <span>Title *</span>
                  <input
                    required
                    maxLength={160}
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  />
                </label>
                <label>
                  <span>Attempts per student</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quizForm.maxAttempts}
                    onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: e.target.value })}
                  />
                </label>
                <label>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={quizForm.dueOn}
                    onChange={(e) => setQuizForm({ ...quizForm, dueOn: e.target.value })}
                  />
                </label>
                <label>
                  <span>Description</span>
                  <input
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={quizForm.published}
                    onChange={(e) => setQuizForm({ ...quizForm, published: e.target.checked })}
                  />{' '}
                  Publish quiz
                </label>
              </div>
              {quizForm.questions.map((q, i) => (
                <div key={i} className="enq-grid card" style={{ margin: '10px 0', padding: 14 }}>
                  <label className="wide">
                    <span>Question {i + 1} *</span>
                    <input
                      required
                      maxLength={500}
                      value={q.prompt}
                      onChange={(e) => editQuizQuestion(i, { prompt: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Question type</span>
                    <select value={q.type} onChange={(e) => editQuizQuestion(i, { type: e.target.value })}>
                      <option value="single_choice">Single choice</option>
                      <option value="multiple_choice">Multiple choice</option>
                      <option value="true_false">True or false</option>
                      <option value="short_answer">Written response (teacher reviewed)</option>
                    </select>
                  </label>
                  <label>
                    <span>Points</span>
                    <input
                      type="number"
                      min="0.01"
                      max="1000"
                      step="0.01"
                      required
                      value={q.points}
                      onChange={(e) => editQuizQuestion(i, { points: e.target.value })}
                    />
                  </label>
                  {!['short_answer', 'true_false'].includes(q.type) && (
                    <label className="wide">
                      <span>Choices (separate with |)</span>
                      <input
                        required
                        placeholder="Choice A | Choice B | Choice C"
                        value={q.choicesText}
                        onChange={(e) => editQuizQuestion(i, { choicesText: e.target.value })}
                      />
                    </label>
                  )}
                  {q.type === 'multiple_choice' ? (
                    <label className="wide">
                      <span>Correct choice numbers (comma separated, starting at 1)</span>
                      <input
                        required
                        placeholder="1, 3"
                        value={q.correctIndexesText}
                        onChange={(e) => editQuizQuestion(i, { correctIndexesText: e.target.value })}
                      />
                    </label>
                  ) : q.type !== 'short_answer' ? (
                    <label>
                      <span>Correct answer</span>
                      <select
                        value={q.correctIndex}
                        onChange={(e) => editQuizQuestion(i, { correctIndex: Number(e.target.value) })}
                      >
                        {(q.type === 'true_false'
                          ? ['True', 'False']
                          : q.choicesText
                              .split('|')
                              .map((s) => s.trim())
                              .filter(Boolean)
                        ).map((choice, index) => (
                          <option key={index} value={index}>
                            {index + 1}. {choice}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="hint wide">
                      Students will type a response. You will score it in quiz review.
                    </p>
                  )}
                  {quizForm.questions.length > 1 && (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        setQuizForm({ ...quizForm, questions: quizForm.questions.filter((_, n) => n !== i) })
                      }
                    >
                      Remove question
                    </button>
                  )}
                </div>
              ))}
              <div className="form-actions">
                <button
                  type="button"
                  className="ghost"
                  disabled={quizForm.questions.length >= 50}
                  onClick={() =>
                    setQuizForm({ ...quizForm, questions: [...quizForm.questions, blankQuestion()] })
                  }
                >
                  + Add question
                </button>
                <button disabled={busy}>
                  {busy ? 'Saving…' : editingQuiz ? 'Save quiz' : 'Create quiz'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setQuizModal(false);
                    setEditingQuiz(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Quiz / test</th>
                  <th>Due</th>
                  <th>Questions</th>
                  <th>Attempts</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {quizzes.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <b>{q.title}</b>
                      <small className="block">{q.description}</small>
                    </td>
                    <td>{q.dueOn || 'No due date'}</td>
                    <td>{q.questions.length}</td>
                    <td>
                      {q.attemptCount}/{q.maxAttempts} used
                    </td>
                    <td>{q.published ? 'Published' : 'Draft'}</td>
                    <td className="row-actions">
                      <button type="button" className="ghost" onClick={() => showQuizAttempts(q)}>
                        Review attempts
                      </button>
                      {q.attemptCount === 0 && (
                        <Gate action="edit">
                          <button type="button" className="ghost" onClick={() => editQuiz(q)}>
                            Edit
                          </button>
                        </Gate>
                      )}
                      <button type="button" className="ghost" onClick={() => toggleQuiz(q)}>
                        {q.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <Gate action="delete">
                        <button type="button" className="ghost" onClick={() => removeQuiz(q)}>
                          Delete
                        </button>
                      </Gate>
                    </td>
                  </tr>
                ))}
                {!quizzes.length && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No quizzes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {quizAttempts && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Attempts · {quizAttempts.quiz.title}</h3>
              {quizAttempts.rows.map((attempt) => (
                <article className="card" key={attempt.id}>
                  <b>{attempt.studentName}</b>
                  <small className="block">
                    {attempt.admissionNo} · {new Date(attempt.completedAt).toLocaleString()} · {attempt.score}
                    /{attempt.maxScore} · {attempt.reviewStatus}
                  </small>
                  {attempt.questions.map((question) => (
                    <div key={question.id} style={{ marginTop: 10 }}>
                      <b>
                        {question.prompt} ({question.points} pts)
                      </b>
                      <p className="hint">
                        Answer:{' '}
                        {Array.isArray(question.answer)
                          ? question.answer.map((i) => question.choices[i]).join(', ')
                          : question.type === 'single_choice' || question.type === 'true_false'
                            ? question.choices[question.answer]
                            : question.answer}
                      </p>
                      {question.type === 'short_answer' ? (
                        <label>
                          <span>Score (0–{question.points})</span>
                          <input
                            type="number"
                            min="0"
                            max={question.points}
                            step="0.01"
                            value={quizReview[attempt.id]?.[question.id] ?? question.awarded}
                            onChange={(e) =>
                              setQuizReview({
                                ...quizReview,
                                [attempt.id]: { ...quizReview[attempt.id], [question.id]: e.target.value },
                              })
                            }
                          />
                        </label>
                      ) : (
                        <small>
                          {question.awarded}/{question.points} points
                        </small>
                      )}
                    </div>
                  ))}
                  <label className="block">
                    <span>Feedback</span>
                    <input
                      value={quizReview[attempt.id]?.feedback ?? attempt.feedback ?? ''}
                      onChange={(e) =>
                        setQuizReview({
                          ...quizReview,
                          [attempt.id]: { ...quizReview[attempt.id], feedback: e.target.value },
                        })
                      }
                    />
                  </label>
                  <button type="button" onClick={() => reviewAttempt(attempt)}>
                    Save review
                  </button>
                </article>
              ))}
              {!quizAttempts.rows.length && <p className="hint">No student attempts yet.</p>}
            </div>
          )}
        </>
      )}
      {tab === 'gradebook' && (
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Lessons</th>
                {gradebook?.assignments.map((a) => (
                  <th key={`a${a.id}`}>{a.title}</th>
                ))}
                {gradebook?.quizzes.map((q) => (
                  <th key={`q${q.id}`}>{q.title} best</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gradebook?.rows.map((r) => (
                <tr key={r.studentId}>
                  <td>
                    {r.name}
                    <small className="block">{r.admissionNo}</small>
                  </td>
                  <td>
                    {r.lessonsCompleted}/{r.lessonsTotal}
                  </td>
                  {r.assignments.map((a, i) => (
                    <td key={i}>
                      {a.score == null
                        ? a.submitted
                          ? 'Awaiting grade'
                          : '—'
                        : `${a.score}/${gradebook.assignments[i].maxScore}`}
                    </td>
                  ))}
                  {r.quizzes.map((q, i) => (
                    <td key={i}>
                      {q.bestScore == null ? '—' : `${q.bestScore}/${q.maxScore}`} ({q.attempts})
                    </td>
                  ))}
                </tr>
              ))}
              {gradebook && !gradebook.rows.length && (
                <tr>
                  <td colSpan={2}>No active students in this class.</td>
                </tr>
              )}
            </tbody>
          </table>
          {!gradebook && <p>Loading gradebook…</p>}
        </div>
      )}
    </section>
  );
}
