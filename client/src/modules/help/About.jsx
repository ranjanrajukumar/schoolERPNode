import TableCard from '../../components/TableCard.jsx';
import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function About() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/support/about')
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  return (
    <>
      <h1>About {d.name}</h1>
      <TableCard>
        <tbody>
          <tr>
            <td>School</td>
            <td>{d.school}</td>
          </tr>
          <tr>
            <td>Version</td>
            <td>{d.version}</td>
          </tr>
          <tr>
            <td>Environment</td>
            <td>{d.environment}</td>
          </tr>
          <tr>
            <td>Server</td>
            <td>
              Node {d.node} on {d.platform}
            </td>
          </tr>
          <tr>
            <td>Server running for</td>
            <td>{d.uptimeHours} hours</td>
          </tr>
        </tbody>
      </TableCard>
      <p className="hint">
        School ERP covers admissions, students, academics, attendance, examinations, fees, staff, timetable,
        communication, transport, library, inventory, hostel, health and safety, activities, documents and
        reports.
      </p>
    </>
  );
}
