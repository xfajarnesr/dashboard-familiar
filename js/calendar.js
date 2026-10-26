// Ajunta totes les fonts del calendari en una llista d'ocurrències per dia
import { ctx, colorDe, nomDe } from './ui.js';
import { parseYmd, ymd, addDaysYmd, daysBetween } from './util.js';
import { ocurrenciaAny, titolData, colorData, tipusDe } from './aniversaris.js';

export const CATS = {
  familia: { nom: 'Família', color: '#3B4A5C' },
  feina: { nom: 'Feina', color: '#5A6F8C' },
  escola: { nom: 'Escola', color: '#2E9E6A' },
  salut: { nom: 'Salut', color: '#C2407A' },
  oci: { nom: 'Oci', color: '#7A5AC8' },
  altres: { nom: 'Altres', color: '#8A94A3' },
};
export const TIPUS_ESCOLAR = {
  vacances: { nom: 'Vacances', color: '#2E9E6A' },
  festiu: { nom: 'Festiu', color: '#D6452F' },
  lliure: { nom: 'Lliure disposició', color: '#E0A21B' },
  local: { nom: 'Festa local', color: '#E4572E' },
  curs: { nom: 'Curs', color: '#2F6FDB' },
};

// Què en veu aquest dispositiu? 'tot', 'ocupat' (només la franja) o null (gens).
// vis: 'tots' (per defecte), 'ocupat' (els altres veuen la franja sense detall) o 'jo' (només qui l'ha creat).
// No és xifrat: és per no fer soroll a l'altre.
export function visEvent(e) {
  const v = e.vis || 'tots';
  if (v === 'tots' || !e.by || e.by === ctx.me) return 'tot';
  if (v === 'ocupat' && e.time) return 'ocupat';
  return null;
}

function eachDay(a, b, fn) {
  for (let d = a; d <= b; d = addDaysYmd(d, 1)) fn(d);
}

export function ocurrencies(from, to, { barca = true, femeni = false, docs = true } = {}) {
  const s = ctx.store;
  const out = [];
  const push = (o) => { if (o.date >= from && o.date <= to) out.push(o); };

  for (const e of s.items('events')) {
    const vis = visEvent(e);
    if (!vis) continue;
    if (vis === 'ocupat') {
      const base = { title: `${nomDe(e.by)} ocupat`, time: e.time, timeEnd: e.timeEnd, kind: 'ocupat', color: colorDe(e.by), qui: e.by, ref: null };
      const len = e.end ? daysBetween(e.date, e.end) : 0;
      if (e.repeat === 'setmanal') {
        const dow = parseYmd(e.date).getDay();
        eachDay(from > e.date ? from : e.date, e.until && e.until < to ? e.until : to, (d) => { if (parseYmd(d).getDay() === dow) push({ ...base, date: d }); });
      } else if (len > 0) eachDay(e.date, e.end, (d) => push({ ...base, date: d, multi: true, first: d === e.date }));
      else push({ ...base, date: e.date });
      continue;
    }
    const color = e.qui && e.qui !== 'tots' && !Array.isArray(e.qui) ? colorDe(e.qui) : Array.isArray(e.qui) && e.qui.length === 1 ? colorDe(e.qui[0]) : CATS[e.cat]?.color || CATS.altres.color;
    const base = { title: e.title, time: e.time, timeEnd: e.timeEnd, kind: 'event', color, qui: e.qui, ref: e, notes: e.notes, lloc: e.lloc, priv: e.vis && e.vis !== 'tots' ? e.vis : null };
    const len = e.end ? daysBetween(e.date, e.end) : 0;
    if (e.repeat === 'anual') {
      const d0 = parseYmd(e.date);
      for (let y = parseYmd(from).getFullYear(); y <= parseYmd(to).getFullYear(); y++) {
        const d = ymd(new Date(y, d0.getMonth(), d0.getDate()));
        if (d >= e.date) push({ ...base, date: d, anys: y - d0.getFullYear() });
      }
    } else if (e.repeat === 'setmanal') {
      const dow = parseYmd(e.date).getDay();
      eachDay(from > e.date ? from : e.date, e.until && e.until < to ? e.until : to, (d) => { if (parseYmd(d).getDay() === dow) push({ ...base, date: d }); });
    } else if (len > 0) {
      eachDay(e.date, e.end, (d) => push({ ...base, date: d, multi: true, first: d === e.date }));
    } else push({ ...base, date: e.date });
  }

  for (const e of s.items('escolar')) {
    const t = TIPUS_ESCOLAR[e.tipus] || TIPUS_ESCOLAR.curs;
    const base = { title: e.title, kind: 'escolar', tipus: e.tipus, color: t.color, ref: e, qui: e.qui };
    if (e.end) eachDay(e.date, e.end, (d) => push({ ...base, date: d, multi: true, first: d === e.date }));
    else push({ ...base, date: e.date });
  }

  if (barca) {
    for (const p of s.get('barca')?.partits || []) {
      if (p.equip === 'femeni' && !femeni) continue;
      const d = ymd(new Date(p.data));
      const hora = new Date(p.data).toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
      push({ date: d, time: p.horaConfirmada === false ? null : hora, title: `${p.local} – ${p.visitant}`, kind: 'barca', color: '#A50044', ref: p, sub: p.competicio + (p.equip === 'femeni' ? ' · Femení' : '') });
    }
  }

  for (const a of s.items('aniversaris')) {
    if (!a.dia) continue;
    for (let y = parseYmd(from).getFullYear(); y <= parseYmd(to).getFullYear(); y++) {
      const o = ocurrenciaAny(a, y);
      push({ date: o.date, title: titolData(a, o.edat), kind: 'aniv', tipusData: tipusDe(a), color: colorData(a), ref: a, sub: a.relacio });
    }
  }

  // Franges d'horari d'un dia concret (tardes rotatòries…): un punt al calendari i una línia a l'agenda del dia
  for (const b of s.items('horaris')) {
    if (!b.data) continue;
    push({ date: b.data, time: b.inici, timeEnd: b.fi, title: b.text || 'Franja', kind: 'horari', color: colorDe(b.persona), qui: b.persona, ref: b });
  }

  if (docs) {
    for (const d of s.items('documents')) {
      if (!d.caducitat) continue;
      push({ date: d.caducitat, title: `Caduca: ${d.tipus}${d.persona ? ' (' + (ctx.membres.find((m) => m.id === d.persona)?.nom || d.persona) + ')' : ''}`, kind: 'doc', color: '#D6452F', ref: d });
    }
  }

  out.sort((a, b) => (a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date)));
  return out;
}

export function perDia(ocs) {
  const m = {};
  for (const o of ocs) (m[o.date] ||= []).push(o);
  return m;
}

// És dia sense escola? (festiu, vacances, lliure disposició o cap de setmana)
export function senseEscola(d, persona) {
  const dow = parseYmd(d).getDay();
  if (dow === 0 || dow === 6) return 'cap de setmana';
  for (const e of ctx.store.items('escolar')) {
    if (e.tipus === 'curs') continue;
    if (persona && Array.isArray(e.qui) && e.qui.length && !e.qui.includes(persona)) continue;
    if ((e.end && d >= e.date && d <= e.end) || e.date === d) return e.title;
  }
  return null;
}
