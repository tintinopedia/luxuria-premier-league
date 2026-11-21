export const oversStr = (b = 0) => `${Math.floor(b / 6)}${b % 6 ? '.' + (b % 6) : ''}`;
export const sr = (r, b) => (b ? ((r / b) * 100).toFixed(2) : '0.00');
export const econ = (r, b) => (b ? ((r / b) * 6).toFixed(2) : '0.00');
export const rr = (r, b) => (b ? ((r / b) * 6).toFixed(2) : '0.00');

export const toDate = (t) => (t ? (t.toDate ? t.toDate() : new Date(t)) : null);
export const fmtDate = (t, opts) => {
  const d = toDate(t);
  return d ? d.toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};
export const fmtTime = (t) => {
  const d = toDate(t);
  return d ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
};
export const isToday = (t) => {
  const d = toDate(t);
  return !!d && d.toDateString() === new Date().toDateString();
};
export function timeAgo(t) {
  const d = toDate(t);
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
}
export const toLocalInput = (t) => {
  const d = toDate(t);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
