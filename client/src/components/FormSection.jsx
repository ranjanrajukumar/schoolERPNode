const TONES = ['blue', 'green', 'violet', 'amber'];
const GLYPHS = ['♙', '♧', '⌖', '◷', '▤', '✦'];

/** What each known section is about, so every long form reads like the Enquiry form: icon, title, one line of help. */
const LOOK = {
  Admission: ['▤', 'blue', 'Admission number, date, class and status'],
  Student: ['♙', 'blue', 'Who the student is'],
  'Contact & address': ['⌖', 'violet', 'How to reach the student and where they live'],
  Parents: ['♧', 'green', 'Father and mother details'],
  'Guardian (primary contact for the school)': ['♧', 'green', 'The person the school calls and messages'],
  'Previous school': ['◷', 'amber', 'Where the student studied before'],
  Remarks: ['✦', 'violet', 'Anything else worth recording'],
  'Student details': ['♙', 'blue', 'Who is applying'],
  Employment: ['▤', 'blue', 'Staff number, role, department and joining date'],
  Personal: ['♙', 'green', 'Who the staff member is'],
  'Qualification & experience': ['✦', 'violet', 'Training and previous work'],
  'Emergency contact': ['♧', 'amber', 'Who to call if something happens'],
  'Bank details (for payroll)': ['▤', 'blue', 'Where salary is paid. Admins and accountants only'],
  Login: ['⌖', 'violet', 'How the parent signs in to the portal'],
  'Work & identity': ['♧', 'green', 'Occupation and identity details'],
  Enquiry: ['⌖', 'violet', 'How the family found the school and the follow-up'],
};

/** One card of a form: an icon, a title and a short line, then the fields in the shared two-column grid. */
export default function FormSection({ title, index = 0, sub, glyph, tone, children }) {
  const look = LOOK[title];
  return (
    <section className="card">
      <header className="card-head">
        <span className={`tile-icon ${tone ?? look?.[1] ?? TONES[index % TONES.length]}`} aria-hidden="true">{glyph ?? look?.[0] ?? GLYPHS[index % GLYPHS.length]}</span>
        <span><h2>{title}</h2>{(sub ?? look?.[2]) && <small>{sub ?? look?.[2]}</small>}</span>
      </header>
      <div className="enq-grid">{children}</div>
    </section>
  );
}
