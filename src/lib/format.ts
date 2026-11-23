const dtf = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const dttf = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const ni = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const fmtDate = (d?: Date | string | null) => (d ? dtf.format(new Date(d)) : '—');
export const fmtDateTime = (d?: Date | string | null) => (d ? dttf.format(new Date(d)) : '—');
export const inr = (n?: number | null) => `₹${nf.format(n ?? 0)}`;
export const inr0 = (n?: number | null) => `₹${ni.format(n ?? 0)}`;
export const num0 = (n?: number | null) => ni.format(n ?? 0);
export const toInputDate = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '—');
/** Start of today in UTC date-only form (dates are stored as UTC midnight). */
export const todayDate = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
export const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleString('en-IN', { month: 'long' });
