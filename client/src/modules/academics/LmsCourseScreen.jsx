import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import './lms.css';
import LmsAssessmentPanel from './LmsAssessmentPanel.jsx';
import LmsEnrollment from './LmsEnrollment.jsx';
import LmsAnnouncements from './LmsAnnouncements.jsx';
import LmsMaterials from './LmsMaterials.jsx';

const SCREENS = {
  materials: {
    title: 'LMS Content Library',
    hint: 'Upload documents and files, or add web and video links, for students to learn from.',
    Body: LmsMaterials,
  },
  enrollment: {
    title: 'LMS Enrollment',
    hint: 'Choose which active students of the class are enrolled in a course.',
    Body: LmsEnrollment,
  },
  announcements: {
    title: 'LMS Announcements',
    hint: 'Post notices to the students of a course. Published notices also send a push alert.',
    Body: LmsAnnouncements,
  },
  assignments: {
    title: 'LMS Assignments',
    hint: 'Create assignments, review submissions and return scores with feedback.',
    Body: (p) => <LmsAssessmentPanel {...p} only="assignments" />,
  },
  quizzes: {
    title: 'LMS Quizzes & Tests',
    hint: 'Build quizzes, then review attempts and score written answers.',
    Body: (p) => <LmsAssessmentPanel {...p} only="quizzes" />,
  },
};

// Shared shell: pick a course, then show one LMS form for it.
export default function LmsCourseScreen({ kind }) {
  const { title, hint, Body } = SCREENS[kind];
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/lms/courses')
      .then((rows) => {
        setCourses(rows);
        if (rows.length) setCourseId(String(rows[0].id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const course = courses.find((row) => String(row.id) === courseId);
  return (
    <div className="lms-ns lms-page">
      <div className="profile-head">
        <div>
          <h1>{title}</h1>
          <p className="hint">{hint}</p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="card">
        <label>
          <span>Course</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Choose course</option>
            {courses.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title} · {row.className} · {row.subjectName}
                {row.published ? '' : ' (draft)'}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!loading && !courses.length && (
        <p className="hint">No courses yet. Create one under Courses &amp; Lessons first.</p>
      )}
      {course && <Body key={course.id} course={course} />}
    </div>
  );
}
