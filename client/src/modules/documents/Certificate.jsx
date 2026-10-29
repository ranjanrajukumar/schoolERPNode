import { renderParagraphs, templateVars } from './templateText.js';

const fmt = (date) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';
const pronouns = { male: ['He', 'his', 'son'], female: ['She', 'her', 'daughter'] };

/** The wording of each certificate. `d` is the frozen snapshot saved when it was issued. */
function Body({ type, d }) {
  const [she, her, child] = pronouns[d.gender] ?? ['The student', 'the', 'ward'];
  const cls = d.className ? `Class ${d.className}` : 'this school';
  const year = d.academicYear ? ` for the academic year ${d.academicYear}` : '';

  if (type === 'bonafide') {
    return (
      <>
        <p>
          This is to certify that <b>{d.studentName}</b>, {child} of <b>{d.guardianName || '—'}</b>, bearing
          admission number <b>{d.admissionNo}</b>
          {d.dob && (
            <>
              {' '}
              and born on <b>{fmt(d.dob)}</b>
            </>
          )}
          , is a bonafide student of this school and is studying in <b>{cls}</b>
          {year}.
        </p>
        {d.purpose && (
          <p>
            This certificate is issued on request for the purpose of <b>{d.purpose}</b>.
          </p>
        )}
      </>
    );
  }
  if (type === 'character') {
    return (
      <>
        <p>
          This is to certify that <b>{d.studentName}</b>, {child} of <b>{d.guardianName || '—'}</b>, admission
          number <b>{d.admissionNo}</b>, is a student of <b>{cls}</b> of this school{year}.
        </p>
        <p>
          {she} bears a <b>{d.conduct}</b> moral character and conduct, to the best of our knowledge.
        </p>
        {d.purpose && <p>Issued for: {d.purpose}.</p>}
      </>
    );
  }
  if (type === 'fee') {
    return (
      <>
        <p>
          This is to certify that <b>{d.studentName}</b>, admission number <b>{d.admissionNo}</b>, of{' '}
          <b>{cls}</b>
          {year}, has the following fee position with this school:
        </p>
        <table className="cert-table">
          <tbody>
            <tr>
              <td>Total fees billed</td>
              <td>{d.feesBilled}</td>
            </tr>
            <tr>
              <td>Total fees paid</td>
              <td>{d.feesPaid}</td>
            </tr>
            <tr>
              <td>Outstanding balance</td>
              <td>
                <b>{d.feesOutstanding}</b>
              </td>
            </tr>
          </tbody>
        </table>
        {d.purpose && <p>Issued for: {d.purpose}.</p>}
      </>
    );
  }
  return (
    <>
      <p>
        This is to certify that <b>{d.studentName}</b>, {child} of <b>{d.guardianName || '—'}</b>, admission
        number <b>{d.admissionNo}</b>
        {d.dob && (
          <>
            , born on <b>{fmt(d.dob)}</b>
          </>
        )}
        , was a student of <b>{cls}</b> of this school.
      </p>
      <p>
        {she} left the school on <b>{fmt(d.leavingDate)}</b> for the following reason:{' '}
        <b>{d.leavingReason}</b>.
      </p>
      <p>
        {she} has {d.duesCleared ? 'cleared' : 'not cleared'} all dues to the school, and {her} conduct was{' '}
        <b>{d.conduct}</b>. {she} is entitled to seek admission to another school.
      </p>
    </>
  );
}

export default function Certificate({ data }) {
  return (
    <div className="certificate">
      <div className="cert-head">
        <h2>{data.school}</h2>
        {data.schoolInfo?.address && (
          <p className="cert-address">
            {data.schoolInfo.address}
            {data.schoolInfo.phone && ` · ${data.schoolInfo.phone}`}
          </p>
        )}
        <h1>{data.title}</h1>
      </div>
      <p className="cert-meta">
        <span>
          No: <b>{data.certificateNo}</b>
        </span>
        <span>
          Date: <b>{fmt(data.issuedOn)}</b>
        </span>
      </p>
      {data.details.templateBody ? (
        renderParagraphs(data.details.templateBody, templateVars(data.details, data.school)).map((p, i) => (
          <p key={i} style={{ whiteSpace: 'pre-line' }}>
            {p}
          </p>
        ))
      ) : (
        <Body type={data.type} d={data.details} />
      )}
      <div className="cert-sign">
        <span>Class teacher</span>
        <span>
          {data.schoolInfo?.principal || 'Principal'}
          <br />
          <small>Principal</small>
        </span>
      </div>
      <button className="no-print" onClick={() => window.print()}>
        Print
      </button>
    </div>
  );
}
