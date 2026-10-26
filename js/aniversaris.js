// Aniversaris: { id, nom, dia: 'MM-DD', any: 1985 | null, relacio, notes }
import { ctx } from './ui.js';
import { ymd, parseYmd, daysBetween } from './util.js';

function dataAny(dia, y) {
  let [m, d] = dia.split('-').map(Number);
  if (m === 2 && d === 29 && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) d = 28;
  return ymd(new Date(y, m - 1, d));
}

// Ocurrència d'un aniversari en un any concret, amb l'edat que fa
export function ocurrenciaAny(a, y) {
  const date = dataAny(a.dia, y);
  return { date, edat: a.any ? y - a.any : null };
}

// Pròxima ocurrència a partir d'avui (inclòs)
export function proper(a, des = ymd()) {
  const y = parseYmd(des).getFullYear();
  let o = ocurrenciaAny(a, y);
  if (o.date < des) o = ocurrenciaAny(a, y + 1);
  return { ...o, falten: daysBetween(des, o.date) };
}

export function propers(dies = 30, des = ymd()) {
  return ctx.store.items('aniversaris').filter((a) => a.dia)
    .map((a) => ({ a, ...proper(a, des) }))
    .filter((x) => x.falten <= dies)
    .sort((x, y) => x.falten - y.falten);
}
