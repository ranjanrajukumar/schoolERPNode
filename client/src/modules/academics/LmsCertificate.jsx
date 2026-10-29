import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { longDate } from './lmsUi.jsx';

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function Sheet({ course, cert }) {
  return <div className="lms-cert">
    <small>{cert.schoolName}</small>
    <h2>Certificate of Completion</h2>
    <p>This is to certify that</p>
    <h3>{cert.studentName}</h3>
    <p>has successfully completed all {course.total} lessons of</p>
    <h3>{course.title}</h3>
    <p>{course.subjectName}{course.className ? ` · ${course.className}` : ''}</p>
    <footer>Issued on {longDate(cert.issuedOn)}{cert.admissionNo ? ` · Admission no. ${cert.admissionNo}` : ''}</footer>
  </div>;
}

const PRINT_CSS = 'body{font-family:Georgia,serif;margin:0;display:grid;place-items:center;min-height:100vh}.c{box-sizing:border-box;width:90%;max-width:900px;padding:48px 40px;border:8px double #1e3a8a;text-align:center}.c small{letter-spacing:.15em;text-transform:uppercase;color:#475569}.c h2{font-size:34px;margin:14px 0;color:#1e3a8a}.c h3{font-size:28px;margin:10px 0;border-bottom:1px solid #94a3b8;display:inline-block;padding:0 24px 4px}.c p{margin:10px 0;color:#334155}.c footer{margin-top:36px;color:#475569;font-size:14px}';

/** What the student sees on a course: a hint while the course is unfinished, a View certificate button once it is earned. */
export default function LmsCertificate({ course }) {
  const [open, setOpen] = useState(false);
  const cert = course.certificate;
  if (!cert) return null;
  if (!cert.earned) return <p className="hint">Complete all {course.total} lessons to earn your certificate ({course.completed}/{course.total} done).</p>;

  const print = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!doctype html><title>Certificate</title><style>${PRINT_CSS}</style><div class="c"><small>${esc(cert.schoolName)}</small><h2>Certificate of Completion</h2><p>This is to certify that</p><h3>${esc(cert.studentName)}</h3><p>has successfully completed all ${esc(course.total)} lessons of</p><h3>${esc(course.title)}</h3><p>${esc(course.subjectName)}${course.className ? ` · ${esc(course.className)}` : ''}</p><footer>Issued on ${esc(longDate(cert.issuedOn))}${cert.admissionNo ? ` · Admission no. ${esc(cert.admissionNo)}` : ''}</footer></div>`);
    win.document.close(); win.focus(); win.print();
  };

  return <>
    <button type="button" onClick={() => setOpen(true)}>View certificate</button>
    <Modal className="lms-ns" open={open} title="Certificate of completion" onClose={() => setOpen(false)} wide>
      <Sheet course={course} cert={cert} />
      <div className="form-actions"><button type="button" onClick={print}>Print or save as PDF</button><button type="button" className="ghost" onClick={() => setOpen(false)}>Close</button></div>
    </Modal>
  </>;
}
