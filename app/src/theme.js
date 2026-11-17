// Mirrors the web design tokens in client/src/styles.css (:root). Change a value
// there and here together so both apps keep the same look.
export const color = {
  primary: '#2563eb', primarySoft: '#eaf1ff', header: '#2563eb', onPrimary: '#ffffff',
  ink: '#0f172a', muted: '#667289', line: '#e6eaf2', lineStrong: '#d5dce9', bg: '#f4f6fa', card: '#ffffff', surface2: '#f6f8fc', faint: '#9aa3b5', shadow: '#0f172a',
  green: '#15803d', greenSoft: '#e3f6e9', amber: '#8a5a00', amberSoft: '#fef3d1', red: '#dc2626', redSoft: '#fdecec',
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = 16;
export const radiusSm = 12;
export const TONES = {
  green: { bg: color.greenSoft, fg: color.green },
  amber: { bg: color.amberSoft, fg: color.amber },
  red: { bg: color.redSoft, fg: color.red },
  blue: { bg: color.primarySoft, fg: color.primary },
  grey: { bg: '#eef0f5', fg: color.muted },
};
