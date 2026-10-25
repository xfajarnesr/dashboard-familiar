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
export function proteinaSopar(entry, cataleg) {
  if (!entry) return null;
  if (entry.proteina) return entry.proteina;
  const plat = cataleg.find((c) => c.id === entry.platId);
  if (plat?.proteina) return plat.proteina;
  return entry.complementProteina || null;
}

export function components(plat, complements = []) {
  const c = { verdura: !!plat?.verdura, hidrats: !!plat?.hidrats, proteina: !!plat?.proteina };
  for (const x of complements) {
    if (COMPLEMENTS.verdura.includes(x)) c.verdura = true;
    if (COMPLEMENTS.hidrats.includes(x)) c.hidrats = true;
    if (Object.values(COMPLEMENTS.proteina).includes(x)) c.proteina = true;
  }
  return c;
}

/**
 * Proposa sopars per als dies lliures d'una setmana.
 * @param {string} dilluns  YYYY-MM-DD del dilluns
 * @param {object} ctx { cataleg:[], pla:[] (items), menus: {ymd: menuDia}, llavor: string }
 * @returns {Array} propostes [{id:ymd, platId, complements, complementProteina, motius, fixat:false}]
 */
export function proposaSetmana(dilluns, { cataleg, pla, menus, llavor = '' }) {
  const plats = cataleg.filter((c) => !c.desactivat);
  if (!plats.length) return [];
  const dies = Array.from({ length: 7 }, (_, i) => addDaysYmd(dilluns, i));
  const plaMap = Object.fromEntries(pla.map((p) => [p.id, p]));
  const recompte = {};
  const add = (t, w = 1) => { if (t) recompte[protTipus(t)] = (recompte[protTipus(t)] || 0) + w; };

  // Dinars dels nens de la setmana
  for (const d of dies) for (const t of proteinaDinar(menus[d])) add(t, 1 / Math.max(1, proteinaDinar(menus[d]).length));
  // Sopars ja fixats
  for (const d of dies) if (plaMap[d]?.fixat) add(proteinaSopar(plaMap[d], cataleg));

  // Plats usats recentment (14 dies abans)
  const recents = new Map();
  for (const p of pla) {
    if (!p.platId) continue;
    const dd = (parseYmd(dilluns) - parseYmd(p.id)) / 86400000;
    if (dd > 0 && dd <= 14) recents.set(p.platId, true);
  }

  const propostes = [];
  const usatsSetmana = new Set(dies.map((d) => plaMap[d]?.fixat && plaMap[d].platId).filter(Boolean));
  let anterior = plaMap[addDaysYmd(dilluns, -1)] ? proteinaSopar(plaMap[addDaysYmd(dilluns, -1)], cataleg) : null;

  for (const d of dies) {
    if (plaMap[d]?.fixat) { anterior = proteinaSopar(plaMap[d], cataleg); continue; }
    const dinar = proteinaDinar(menus[d]);
    const dow = parseYmd(d).getDay();
    const feiner = dow >= 1 && dow <= 4; // dl–dj: millor coses ràpides
    let millor = null;
    for (const plat of plats) {
      const t = protTipus(plat.proteina);
      let s = 0;
      const motius = [];
      if (t) {
        const deficit = (OBJECTIU[t] || 0.5) - (recompte[t] || 0);
        s += deficit * 2;
        if (dinar.map(protTipus).includes(t)) { s -= 7; }
        if (anterior && protTipus(anterior) === t) s -= 3;
      } else {
        s -= 1; // sense proteïna pròpia: caldrà complement
      }
      if (usatsSetmana.has(plat.id)) s -= 20;
      if (recents.has(plat.id)) s -= 4;
      if (plat.favorit) s += 1.5;
      if (feiner && plat.temps === 'ràpid') s += 1;
      if (feiner && plat.temps === 'llarg') s -= 1.5;
      s += hash(llavor + d + plat.id) * 1.6;
      if (!millor || s > millor.s) millor = { s, plat, motius };
    }
    const plat = millor.plat;
    const complements = [];
    let complementProteina = null;
    const idx = Math.floor(hash(llavor + d) * 100);
    if (!plat.verdura) complements.push(COMPLEMENTS.verdura[idx % COMPLEMENTS.verdura.length]);
    if (!plat.hidrats) complements.push(COMPLEMENTS.hidrats[idx % COMPLEMENTS.hidrats.length]);
    if (!plat.proteina) {
      // tria la proteïna amb més dèficit que no coincideixi amb el dinar
      const opcions = ['ou', 'lactic', 'peix', 'llegum', 'carn-blanca']
        .filter((t) => !dinar.map(protTipus).includes(t))
        .sort((a, b) => ((OBJECTIU[b] || 0) - (recompte[b] || 0)) - ((OBJECTIU[a] || 0) - (recompte[a] || 0)));
      complementProteina = opcions[0] || 'ou';
      complements.push(COMPLEMENTS.proteina[complementProteina]);
    }
    const prot = plat.proteina || complementProteina;
    const motius = [];
    if (dinar.length) {
      const noms = dinar.map((t) => PROTEINES[t]?.nom.toLowerCase()).join(' i ');
      motius.push(dinar.map(protTipus).includes(protTipus(prot)) ? `Al migdia ja han menjat ${noms}` : `Al migdia han menjat ${noms}, al vespre toca una altra cosa`);
    }
    const t = protTipus(prot);
    if (t && OBJECTIU[t]) {
      const portem = recompte[t] || 0;
      if (portem < OBJECTIU[t]) motius.push(`${PROTEINES[t].nom}: en porten ${fmtN(portem)} de ${fmtN(OBJECTIU[t])} aquesta setmana`);
    }
    add(prot);
    usatsSetmana.add(plat.id);
    anterior = prot;
    propostes.push({ id: d, platId: plat.id, complements, complementProteina, motius, fixat: false });
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
