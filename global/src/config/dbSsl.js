import fs from 'node:fs';

/**
 * TLS options for a hosted MySQL (Aiven etc.). Set DB_SSL=true and give the provider's CA certificate either as a file path
 * (DB_SSL_CA, e.g. ca.pem) or as the certificate text itself (DB_SSL_CA_PEM, handy on hosts without files). The server certificate is verified.
 * Without DB_SSL the connection stays plain, as for a local MySQL.
 */
export function dbSsl() {
  if (process.env.DB_SSL !== 'true') return {};
  // A pasted certificate may arrive with its line breaks written as the two characters \n
  const ca = process.env.DB_SSL_CA_PEM?.split('\\n').join('\n') || (process.env.DB_SSL_CA && fs.readFileSync(process.env.DB_SSL_CA, 'utf8'));
  if (!ca) throw new Error('DB_SSL=true needs DB_SSL_CA (path to ca.pem) or DB_SSL_CA_PEM (the certificate text).');
  return { ssl: { ca } };
}
