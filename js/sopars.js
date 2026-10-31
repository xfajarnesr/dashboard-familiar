// Motor de propostes de sopar.
// Regles: cada sopar ha de tenir verdura + hidrats + proteïna, la proteïna no ha de repetir
// la del dinar dels nens aquell dia, i la setmana (dinars + sopars) ha de quedar equilibrada.

import { addDaysYmd, ymd, startOfWeek, parseYmd } from './util.js';

export const PROTEINES = {
  peix: { nom: 'Peix', color: '#2B7BB9' },
  'carn-blanca': { nom: 'Carn blanca', color: '#D9893B' },
  'carn-vermella': { nom: 'Carn vermella', color: '#B8433A' },
  ou: { nom: 'Ou', color: '#D8B12A' },
  llegum: { nom: 'Llegum', color: '#6E8B3D' },
  lactic: { nom: 'Làctic', color: '#8C7BB8' },
  vegetal: { nom: 'Proteïna vegetal', color: '#4E9A87' },
};

// Objectiu setmanal aproximat per als nens (5 dinars d'escola + 7 sopars = 12 àpats)
export const OBJECTIU = { peix: 3, llegum: 3, ou: 2.5, 'carn-blanca': 2, 'carn-vermella': 1, lactic: 0.5, vegetal: 0.5 };

export const COMPLEMENTS = {
  verdura: ['Amanida verda', 'Verdures al vapor', 'Tomàquet amanit', 'Crudités de pastanaga i cogombre', 'Bròquil bullit'],
  hidrats: ['Pa integral', 'Patata bullida', 'Arròs blanc', 'Torrades'],
  proteina: { ou: 'Ou dur', lactic: 'Formatge fresc', peix: 'Tonyina', llegum: 'Hummus', 'carn-blanca': 'Pernil de gall dindi', vegetal: 'Tofu a la planxa', 'carn-vermella': 'Pernil' },
};

const protTipus = (t) => (t === 'vegetal' ? 'llegum' : t); // a efectes d'equilibri, soja/tofu compten com a llegum

export function proteinaDinar(menuDia) {
  // menuDia: { icar: {proteina}, helia: {proteina} }
  if (!menuDia) return [];
  return [...new Set(Object.values(menuDia).map((x) => x && x.proteina).filter(Boolean))];
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

// Retorna la proteïna efectiva d'un sopar (plat + complements)
// Un sopar pot combinar diversos elements del catàleg (hamburguesa de pollastre + pa + tomàquet).
// Les dades antigues tenen `platId` (un sol plat); les noves, `plats` (llista d'ids).
export function platsIds(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.plats) && entry.plats.length) return entry.plats;
  return entry.platId ? [entry.platId] : [];
}

// El catàleg s'organitza en calaixos. Els bàsics són un sol aliment; els elaborats diuen què cobreixen;
// les combinacions són llistes d'ids (les favorites es desen al catàleg, les recents surten del pla).
export const CALAIXOS = {
  proteina: { nom: 'Proteïna', color: '#b0506a' },
  hidrats: { nom: 'Hidrats', color: '#c08a2a' },
  verdura: { nom: 'Verdura', color: '#5f9a3a' },
  elaborat: { nom: 'Elaborats', color: '#7A4FC4' },
  combo: { nom: 'Combinacions freqüents', color: '#D6336C' },
};
// Prioritat: 2 = sovint, 1 = normal (per defecte), 0 = de tant en tant
export const PRIO = { 2: 'Sovint', 1: 'Normal', 0: 'De tant en tant' };
export const prioDe = (c) => (c?.prio === 0 || c?.prio === 2 ? c.prio : c?.favorit && calaixDe(c) !== 'combo' ? 2 : 1);
// Quants sopars fixats dels últims 90 dies porten cada element (el que feu de debò puja sol)
export function usos(pla, avui) {
  const r = {};
  for (const p of pla) {
    if (!p.fixat || p.id > avui) continue;
    if ((parseYmd(avui) - parseYmd(p.id)) / 86400000 > 90) continue;
    for (const id of platsIds(p)) r[id] = (r[id] || 0) + 1;
  }
  return r;
}
// Pes per ordenar i proposar: la prioritat marcada més una mica per l'ús real
export const pesDe = (c, us = {}) => (prioDe(c) - 1) * 1.8 + Math.min(us[c.id] || 0, 4) * 0.4;

export function calaixDe(c) {
  if (!c) return null;
  if (c.calaix) return c.calaix;
  return Array.isArray(c.plats) ? 'combo' : 'elaborat'; // plats antics: compten com a elaborats
}
// Què aporta un element: { verdura, hidrats, proteina } (booleans)
export function cobreix(c) {
  const k = calaixDe(c);
  if (k === 'proteina') return { verdura: false, hidrats: false, proteina: true };
  if (k === 'hidrats') return { verdura: false, hidrats: true, proteina: false };
  if (k === 'verdura') return { verdura: true, hidrats: false, proteina: false };
  return { verdura: !!c.verdura, hidrats: !!c.hidrats, proteina: !!c.proteina };
}

export function proteinaSopar(entry, cataleg) {
  if (!entry) return null;
  if (entry.proteina) return entry.proteina;
  for (const id of platsIds(entry)) {
    const plat = cataleg.find((c) => c.id === id);
    if (plat?.proteina) return plat.proteina;
  }
  return entry.complementProteina || null;
}

// `plats` pot ser un element o una llista; `complements` són els textos antics (abans de tenir calaixos)
export function components(plats, complements = []) {
  const ll = (Array.isArray(plats) ? plats : [plats]).filter(Boolean).map(cobreix);
  const c = { verdura: ll.some((p) => p.verdura), hidrats: ll.some((p) => p.hidrats), proteina: ll.some((p) => p.proteina) };
  for (const x of complements || []) {
    if (COMPLEMENTS.verdura.includes(x)) c.verdura = true;
    if (COMPLEMENTS.hidrats.includes(x)) c.hidrats = true;
    if (Object.values(COMPLEMENTS.proteina).includes(x)) c.proteina = true;
  }
  return c;
}

/**
 * Proposa sopars per als dies lliures d'una setmana.
 * Candidats: una proteïna bàsica, un elaborat o una combinació favorita. Després s'hi afegeix
 * el que falti (hidrats, verdura i, si cal, proteïna) dels calaixos de bàsics.
 * @returns {Array} propostes [{id:ymd, plats:[ids], motius, fixat:false}]
 */
export function proposaSetmana(dilluns, { cataleg, pla, menus, llavor = '' }) {
  const actius = cataleg.filter((c) => !c.desactivat);
  const per = (k) => actius.filter((c) => calaixDe(c) === k);
  const byId = Object.fromEntries(cataleg.map((c) => [c.id, c]));
  const prots = per('proteina'), hid = per('hidrats'), ver = per('verdura');
  const cands = [
    ...prots.map((c) => ({ key: c.id, plats: [c.id], prot: c.proteina, fav: c.favorit, tipus: 'proteina' })),
    ...per('elaborat').map((c) => ({ key: c.id, plats: [c.id], prot: c.proteina, fav: c.favorit, temps: c.temps, tipus: 'elaborat' })),
    ...per('combo').map((c) => {
      const pl = (c.plats || []).filter((id) => byId[id] && !byId[id].desactivat);
      return { key: c.id, plats: pl, prot: pl.map((id) => byId[id].proteina).find(Boolean) || null, fav: true, tipus: 'combo' };
    }).filter((c) => c.plats.length),
  ];
  if (!cands.length) return [];
  const dies = Array.from({ length: 7 }, (_, i) => addDaysYmd(dilluns, i));
  const plaMap = Object.fromEntries(pla.map((p) => [p.id, p]));
  const recompte = {};
  const add = (t, w = 1) => { if (t) recompte[protTipus(t)] = (recompte[protTipus(t)] || 0) + w; };

  for (const d of dies) for (const t of proteinaDinar(menus[d])) add(t, 1 / Math.max(1, proteinaDinar(menus[d]).length));
  for (const d of dies) if (plaMap[d]?.fixat) add(proteinaSopar(plaMap[d], cataleg));

  const recents = new Set();
  for (const p of pla) {
    const dd = (parseYmd(dilluns) - parseYmd(p.id)) / 86400000;
    if (dd > 0 && dd <= 14) for (const id of platsIds(p)) recents.add(id);
  }
  const usats = new Set(dies.flatMap((d) => (plaMap[d]?.fixat ? platsIds(plaMap[d]) : [])));
  const us = usos(pla, dilluns);
  const pesPlats = (ids) => ids.reduce((a, id) => a + (byId[id] ? pesDe(byId[id], us) : 0), 0) / Math.max(1, ids.length);
  let anterior = plaMap[addDaysYmd(dilluns, -1)] ? proteinaSopar(plaMap[addDaysYmd(dilluns, -1)], cataleg) : null;
  const tria = (llista, clau) => {
    if (!llista.length) return null;
    const ord = llista.map((c) => ({ c, s: (usats.has(c.id) ? -3 : 0) + pesDe(c, us) * 1.2 + hash(llavor + clau + c.id) * 2.5 })).sort((a, b) => b.s - a.s);
    return ord[0].c;
  };

  const propostes = [];
  for (const d of dies) {
    if (plaMap[d]?.fixat) { anterior = proteinaSopar(plaMap[d], cataleg); continue; }
    const dinar = proteinaDinar(menus[d]).map(protTipus);
    const dow = parseYmd(d).getDay();
    const feiner = dow >= 1 && dow <= 4;
    let millor = null;
    for (const c of cands) {
      const t = protTipus(c.prot);
      let s = 0;
      if (t) {
        s += ((OBJECTIU[t] || 0.5) - (recompte[t] || 0)) * 2;
        if (dinar.includes(t)) s -= 7;
        if (anterior && protTipus(anterior) === t) s -= 3;
      } else s -= 1;
      if (c.plats.some((id) => usats.has(id))) s -= c.tipus === 'proteina' ? 6 : 20;
      if (c.plats.some((id) => recents.has(id))) s -= c.tipus === 'proteina' ? 1 : 4;
      s += pesPlats(c.plats);
      if (c.tipus === 'combo') s += 1.5;
      if (c.tipus === 'elaborat') s -= 0.5; // en feu menys
      if (feiner && c.temps === 'llarg') s -= 1.5;
      s += hash(llavor + d + c.key) * 1.6;
      if (!millor || s > millor.s) millor = { s, c };
    }
    const plats = [...millor.c.plats];
    const comp = components(plats.map((id) => byId[id]));
    let prot = millor.c.prot;
    if (!comp.proteina) {
      const opcions = ['ou', 'lactic', 'peix', 'llegum', 'carn-blanca']
        .filter((t) => !dinar.includes(t))
        .sort((a, b) => ((OBJECTIU[b] || 0) - (recompte[b] || 0)) - ((OBJECTIU[a] || 0) - (recompte[a] || 0)));
      const p = tria(prots.filter((c) => opcions.slice(0, 2).includes(protTipus(c.proteina))), d + 'p') || tria(prots, d + 'p');
      if (p) { plats.push(p.id); prot = p.proteina; }
    }
    if (!comp.hidrats) { const h = tria(hid, d + 'h'); if (h) plats.push(h.id); }
    if (!comp.verdura) { const v = tria(ver, d + 'v'); if (v) plats.push(v.id); }
    const motius = [];
    if (dinar.length) {
      const noms = proteinaDinar(menus[d]).map((t) => PROTEINES[t]?.nom.toLowerCase()).join(' i ');
      motius.push(dinar.includes(protTipus(prot)) ? `Al migdia ja han menjat ${noms}` : `Al migdia han menjat ${noms}, al vespre toca una altra cosa`);
    }
    const t = protTipus(prot);
    if (t && OBJECTIU[t]) {
      const portem = recompte[t] || 0;
      if (portem < OBJECTIU[t]) motius.push(`${PROTEINES[t].nom}: en porten ${fmtN(portem)} de ${fmtN(OBJECTIU[t])} aquesta setmana`);
    }
    add(prot);
    plats.forEach((id) => usats.add(id));
    anterior = prot;
    propostes.push({ id: d, plats, platId: null, text: null, complements: [], complementProteina: null, motius, fixat: false });
  }
  return propostes;
}

function fmtN(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

// Recompte de proteïnes d'una setmana (per mostrar l'equilibri)
export function equilibriSetmana(dilluns, { cataleg, pla, menus }) {
  const dies = Array.from({ length: 7 }, (_, i) => addDaysYmd(dilluns, i));
  const plaMap = Object.fromEntries(pla.map((p) => [p.id, p]));
  const r = {};
  for (const d of dies) {
    const dn = proteinaDinar(menus[d]);
    for (const t of dn) r[protTipus(t)] = (r[protTipus(t)] || 0) + 1 / dn.length;
    const s = proteinaSopar(plaMap[d], cataleg);
    if (s) r[protTipus(s)] = (r[protTipus(s)] || 0) + 1;
  }
  return r;
}

export { startOfWeek, ymd };
