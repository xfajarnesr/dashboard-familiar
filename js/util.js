// Utilitats de dates i petits ajudants (tot en hora local)

export const DIES_CURTS = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];
export const DIES = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
export const MESOS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
export const MESOS_CAP = MESOS.map((m) => m[0].toUpperCase() + m.slice(1));

const pad = (n) => String(n).padStart(2, '0');

export function ymd(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d, n) {
  const x = typeof d === 'string' ? parseYmd(d) : new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function addDaysYmd(s, n) {
  return ymd(addDays(s, n));
}
export function startOfWeek(d = new Date()) {
  const x = typeof d === 'string' ? parseYmd(d) : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = dilluns
  x.setDate(x.getDate() - dow);
  return x;
}
export function daysBetween(a, b) {
  const A = typeof a === 'string' ? parseYmd(a) : a;
  const B = typeof b === 'string' ? parseYmd(b) : b;
  return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 86400000);
}
export function monthKey(d = new Date()) {
  const x = typeof d === 'string' ? parseYmd(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
}

// "d'octubre" / "de novembre"
export function deMes(i) {
  const m = MESOS[i];
  return /^[aeiouàèéíòóú]/i.test(m) ? `d'${m}` : `de ${m}`;
}
export function fmtLlarg(s) {
  const d = typeof s === 'string' ? parseYmd(s) : s;
  return `${DIES[d.getDay()]} ${d.getDate()} ${deMes(d.getMonth())}`;
}
export function fmtCurt(s) {
  const d = typeof s === 'string' ? parseYmd(s) : s;
  return `${DIES_CURTS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}
export function fmtData(s) {
  const d = typeof s === 'string' ? parseYmd(s) : s;
  return `${d.getDate()} ${deMes(d.getMonth())} ${d.getFullYear()}`;
}
export function relatiu(s, avui = ymd()) {
  const n = daysBetween(avui, s);
  if (n === 0) return 'avui';
  if (n === 1) return 'demà';
  if (n === -1) return 'ahir';
  if (n > 1 && n < 7) return `${DIES[parseYmd(s).getDay()]}`;
  if (n >= 7) return `d'aquí a ${n} dies`;
  return `fa ${-n} dies`;
}
export function hhmmToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
export function minToHhmm(n) {
  return `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function clone(x) {
  return x == null ? x : JSON.parse(JSON.stringify(x));
}
export function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Base64 <-> UTF-8
export function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function lsGet(k, def = null) {
  try {
    const v = localStorage.getItem(k);
    return v == null ? def : JSON.parse(v);
  } catch {
    return def;
  }
}
export function lsSet(k, v) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

// Edat llegible a una data: "3 setmanes", "11 mesos", "2 anys i 5 mesos"
export function edat(naixement, a = ymd()) {
  if (!naixement) return '';
  const n = parseYmd(naixement), d = parseYmd(a);
  if (d < n) return '';
  let mesos = (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth();
  if (d.getDate() < n.getDate()) mesos--;
  if (mesos < 1) { const s = Math.floor(daysBetween(n, d) / 7); return s <= 1 ? (daysBetween(n, d) <= 1 ? 'acabat de néixer' : `${daysBetween(n, d)} dies`) : `${s} setmanes`; }
  if (mesos < 24) return `${mesos} ${mesos === 1 ? 'mes' : 'mesos'}`;
  const anys = Math.floor(mesos / 12), m = mesos % 12;
  return `${anys} anys${m ? ` i ${m} ${m === 1 ? 'mes' : 'mesos'}` : ''}`;
}
// "2026-10-26T03:15" en hora local
export function ara() {
  const d = new Date();
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
