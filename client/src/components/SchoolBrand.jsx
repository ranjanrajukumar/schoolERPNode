import { useSchoolBrand } from '../hooks/useSchoolBrand.js';

/** The school's logo, or its first letter when none has been uploaded. Used beside the name in the sidebar, top bar and login page. */
function SchoolMark() {
  const { name, logoUrl } = useSchoolBrand();
  return logoUrl ? (
    <img className="brand-mark brand-logo" src={logoUrl} alt={`${name} logo`} />
  ) : (
    <span className="brand-mark" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Logo and school name as one block: <SchoolBrand /> replaces the old fixed "School ERP" heading. */
export default function SchoolBrand({ className = 'brand' }) {
  const { name } = useSchoolBrand();
  return (
    <div className={className}>
      <SchoolMark />
      <h2>{name}</h2>
    </div>
  );
}

const contactLine = (b) => [b.phone, b.email, b.website].filter(Boolean).join('  ·  ');

/** The strip at the bottom of every signed-in page: logo, name, address and contact details. */
export function AppFooter() {
  const b = useSchoolBrand();
  return (
    <footer className="app-footer no-print">
      <div className="footer-school">
        {b.logoUrl && <img src={b.logoUrl} alt="" className="footer-logo" />}
        <div>
          <strong>{b.name}</strong>
          {b.motto && <em>{b.motto}</em>}
        </div>
      </div>
      <div className="footer-contact">
        {b.address && <span>{b.address}</span>}
        {contactLine(b) && <span>{contactLine(b)}</span>}
      </div>
      <small>
        © {new Date().getFullYear()} {b.name}
      </small>
    </footer>
  );
}

/** Shown only when a page is printed: the letterhead (logo, name, address, contact) at the top and a line at the bottom of the sheet. */
export function PrintLetterhead() {
  const b = useSchoolBrand();
  return (
    <>
      <header className="print-letterhead">
        {b.logoUrl && <img src={b.logoUrl} alt="" />}
        <div>
          <h1>{b.name}</h1>
          {b.motto && <p className="motto">{b.motto}</p>}
          {b.address && <p>{b.address}</p>}
          {contactLine(b) && <p>{contactLine(b)}</p>}
        </div>
      </header>
      <div className="print-footer">
        {b.name}
        {b.address ? ` · ${b.address}` : ''}
      </div>
    </>
  );
}
