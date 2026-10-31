import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, useForm, Empty, nomDe } from '../ui.js';
import { ymd, parseYmd, addDaysYmd, startOfWeek, fmtCurt, fmtLlarg, DIES, MESOS_CAP, monthKey, uid, norm } from '../util.js';
import { PROTEINES, OBJECTIU, CALAIXOS, PRIO, prioDe, usos, pesDe, calaixDe, cobreix, proposaSetmana, proteinaSopar, components, equilibriSetmana, platsIds } from '../sopars.js';
import { categoritza } from './llistes.js';
import { dinarFora } from './horaris.js';

export const NENS = () => ctx.membres.filter((m) => m.escola);

export function menuMes(mk) {
  return ctx.store.get(`menu:${mk}`);
}
export function menuDia(d) {
  return menuMes(d.slice(0, 7))?.dies?.[d] || null;
}
// El menú d'un dia sense els nens que no dinen a l'escola (amb els avis…): no compten per a l'equilibri de proteïnes.
export function menuEfectiu(d) {
  const m = menuDia(d);
  if (!m) return null;
  const r = {};
  for (const [id, x] of Object.entries(m)) if (!dinarFora(id, d)) r[id] = x;
  return Object.keys(r).length ? r : null;
}
function menusRang(dies) {
  const r = {};
  for (const d of dies) { const m = menuEfectiu(d); if (m) r[d] = m; }
  return r;
}
// Nens que aquell dia dinen fora de l'escola: [{ nen, amb }]
export function dinarsFora(d) {
  return NENS().map((n) => ({ nen: n, b: dinarFora(n.id, d) })).filter((x) => x.b).map((x) => ({ nen: x.nen, amb: x.b.amb || 'fora' }));
}
export function platsDe(entry) {
  const cat = ctx.store.items('cataleg');
  return platsIds(entry).map((id) => cat.find((c) => c.id === id)).filter(Boolean);
}
export function platDe(entry) {
  return platsDe(entry)[0] || null;
}
export function nomSopar(entry) {
  if (!entry) return null;
  if (entry.text) return entry.text;
  const p = platsDe(entry);
  if (!p.length) return null;
  return p.map((x, i) => (i ? x.nom.charAt(0).toLowerCase() + x.nom.slice(1) : x.nom)).join(' + ');
}

// Suggeriments de sopar de les escoles per a un dia: [{ nen, escola, plats }]
// Format antic: array (de l'Ícar, l'únic que en tenia). Format nou: { icar: [...], helia: [...] }.
export function soparsEscola(d) {
  const s = menuMes(d.slice(0, 7))?.soparsEscola?.[d];
  if (!s) return [];
  const nens = NENS();
  const obj = Array.isArray(s) ? { [nens[0]?.id || 'icar']: s } : s;
  return Object.entries(obj).filter(([, v]) => v?.length).map(([id, plats]) => {
    const nen = nens.find((n) => n.id === id) || { id, nom: nomDe(id), color: 'var(--muted)' };
    return { nen, escola: nen.escola || '', plats };
  });
}
const colorNen = (n) => `color-mix(in srgb, ${n.color} 75%, var(--ink))`;
export function SugEscola({ d, onUse }) {
  const ss = soparsEscola(d);
  if (!ss.length) return null;
  return html`<div class="sug-escola">
    <span class="sug-tit">Recomanació de l'escola</span>
    ${ss.map((x) => html`<div class="sug-row">
      <span class="sug-txt"><b style=${{ color: colorNen(x.nen) }}>${x.nen.nom}</b>${x.escola ? html`<span class="muted"> · ${x.escola}</span>` : ''}<br />${x.plats.join(' + ')}</span>
      ${onUse && html`<button type="button" class="btn ghost sm" onClick=${() => onUse(x.plats)}>Fes-la servir</button>`}
    </div>`)}
  </div>`;
}

export function ProtChip({ t }) {
  if (!t || !PROTEINES[t]) return null;
  return html`<span class="pchip" style=${{ '--c': PROTEINES[t].color }}>${PROTEINES[t].nom}</span>`;
}
export function VHP({ c }) {
  return html`<span class="vhp" title="Verdura · Hidrats · Proteïna">
    <i class=${c.verdura ? 'on v' : ''}>V</i><i class=${c.hidrats ? 'on h' : ''}>H</i><i class=${c.proteina ? 'on p' : ''}>P</i>
  </span>`;
}

export function DinarNens({ d, curt }) {
  const m = menuDia(d);
  const nens = NENS();
  const fora = dinarsFora(d);
  if (!m && !fora.length) return html`<p class="muted small">Sense menú d'escola</p>`;
  const color = (n) => `color-mix(in srgb, ${n.color} 75%, var(--ink))`;
  return html`<div class="dinars">${nens.map((n) => {
    const f = fora.find((x) => x.nen.id === n.id);
    if (f) return html`<div class="dinar fora"><span class="dinar-who" style=${{ color: color(n) }}>${n.nom}</span> <span class="dinar-amb">amb ${f.amb}</span></div>`;
    const x = m?.[n.id];
    if (!x) return null;
    return html`<div class="dinar"><span class="dinar-who" style=${{ color: color(n) }}>${n.nom}</span>
      <span class="dinar-plats">${x.plats.join(' · ')}</span> <${ProtChip} t=${x.proteina} /></div>`;
  })}</div>`;
}

export function SoparLine({ d, onEdit }) {
  const entry = ctx.store.items('pla').find((p) => p.id === d);
  if (!entry || !nomSopar(entry)) return html`<p class="muted small">Encara no hi ha sopar previst</p>`;
  const comp = entry.text ? null : components(platsDe(entry), entry.complements);
  const prot = proteinaSopar(entry, ctx.store.items('cataleg'));
  return html`<div class="sopar">
    <div class="sopar-main"><b>${nomSopar(entry)}</b>${entry.complements?.length ? html`<span class="muted"> + ${entry.complements.join(' + ').toLowerCase()}</span>` : ''}</div>
    <div class="sopar-meta">${comp && html`<${VHP} c=${comp} />`}<${ProtChip} t=${prot} />${!entry.fixat && html`<span class="tag">proposta</span>`}</div>
  </div>`;
}

// ---------------- Vista ----------------
export function MenjarView({ sub }) {
  const tab = sub || 'setmana';
  return html`<section class="view sec-menjar">
    <header class="view-head"><h1>Menjar</h1></header>
    <${Seg} value=${tab} onChange=${(v) => ctx.nav(`menjar/${v}`)} options=${[{ value: 'setmana', label: 'Sopars' }, { value: 'escola', label: "Menú d'escola" }, { value: 'cataleg', label: 'Plats' }]} />
    ${tab === 'setmana' && html`<${Setmana} />`}
    ${tab === 'escola' && html`<${MenuEscola} />`}
    ${tab === 'cataleg' && html`<${Cataleg} />`}
  </section>`;
}

function Setmana() {
  const [dl, setDl] = useState(ymd(startOfWeek()));
  const [edit, setEdit] = useState(null);
  const avui = ymd();
  const dies = Array.from({ length: 7 }, (_, i) => addDaysYmd(dl, i));
  const pla = ctx.store.items('pla');
  const cataleg = ctx.store.items('cataleg');
  const menus = menusRang(dies);
  const proposa = () => {
    const props = proposaSetmana(dl, { cataleg, pla, menus, llavor: uid() });
    for (const p of props) ctx.store.upsert('pla', { ...p, by: ctx.me }, `proposa sopars de la setmana del ${fmtCurt(dl)}`);
    ctx.toast(props.length ? `${props.length} sopars proposats` : 'Tots els dies ja estan decidits');
  };
  const eq = equilibriSetmana(dl, { cataleg, pla, menus });
  const fixa = (d, v) => { const e = pla.find((p) => p.id === d); if (e) ctx.store.upsert('pla', { id: d, fixat: v }, v ? `fixa sopar de ${fmtCurt(d)}` : `desfixa sopar de ${fmtCurt(d)}`); };
  const aCompra = (d) => {
    const e = pla.find((p) => p.id === d);
    const ingr = [...new Set(platsDe(e).flatMap((p) => (p.ingredients?.length ? p.ingredients : calaixDe(p) === 'elaborat' ? [] : [p.nom.toLowerCase()])))];
    if (!ingr.length) { ctx.toast('Aquest plat no té ingredients. Afegeix-los a "Els nostres plats".'); return; }
    const actuals = ctx.store.items('compra');
    let n = 0;
    for (const i of ingr) {
      const ex = actuals.find((x) => norm(x.text) === norm(i));
      if (ex && !ex.fet) continue;
      if (ex) ctx.store.upsert('compra', { id: ex.id, fet: false, by: ctx.me }, `afegeix ${i}`);
      else ctx.store.upsert('compra', { id: uid(), text: i, cat: categoritza(i), fet: false, by: ctx.me }, `afegeix ${i}`);
      n++;
    }
    ctx.toast(n ? `${n} ingredients afegits a la compra` : 'Ja ho tens tot a la llista');
  };
  return html`<div>
    <div class="weeknav">
      <button class="icon-btn" aria-label="Setmana anterior" onClick=${() => setDl(addDaysYmd(dl, -7))}><${Icon} n="left" /></button>
      <b>Setmana del ${parseYmd(dl).getDate()} ${MESOS_CAP[parseYmd(dl).getMonth()].toLowerCase()}</b>
      <button class="icon-btn" aria-label="Setmana següent" onClick=${() => setDl(addDaysYmd(dl, 7))}><${Icon} n="right" /></button>
    </div>
    <div class="propose">
      <button class="btn primary" onClick=${proposa}><${Icon} n="spark" size=${16} /> Proposa els dies lliures</button>
      <p class="hint">Mira què dinen els nens a l'escola i equilibra la setmana. Els sopars fixats (amb cadenat) no es toquen.</p>
    </div>
    <div class="equil">
      ${Object.keys(OBJECTIU).filter((t) => t !== 'vegetal').map((t) => {
        const v = eq[t] || 0, o = OBJECTIU[t];
        return html`<div class="eq-row" title=${`${PROTEINES[t].nom}: ${v.toFixed(1)} de ${o}`}>
          <span>${PROTEINES[t].nom}</span>
          <span class="eq-bar"><i style=${{ width: `${Math.min(100, (v / Math.max(o, 1)) * 100)}%`, background: PROTEINES[t].color }}></i></span>
          <span class=${'eq-n' + (v > o + 1 ? ' over' : '')}>${fmtN(v)}/${fmtN(o)}</span>
        </div>`;
      })}
      <p class="hint">Recompte de dinars d'escola + sopars d'aquesta setmana.</p>
    </div>
    <div class="days">
      ${dies.map((d) => {
        const e = pla.find((p) => p.id === d);
        const sug = soparsEscola(d);
        return html`<article class=${'day' + (d === avui ? ' today' : '')}>
          <header><h3>${DIES[parseYmd(d).getDay()]} <span class="muted">${parseYmd(d).getDate()}</span></h3>
            <div class="day-actions">
              ${e && nomSopar(e) && html`<button class="icon-btn" title=${e.fixat ? 'Desfixa' : 'Fixa aquest sopar'} aria-label=${e.fixat ? 'Desfixa' : 'Fixa'} onClick=${() => fixa(d, !e.fixat)}><${Icon} n=${e.fixat ? 'lock' : 'unlock'} size=${18} /></button>`}
              ${platsIds(e).length > 0 && html`<button class="icon-btn" title="Ingredients a la compra" aria-label="Ingredients a la compra" onClick=${() => aCompra(d)}><${Icon} n="cart" size=${18} /></button>`}
              <button class="icon-btn" title="Canvia" aria-label="Canvia el sopar" onClick=${() => setEdit(d)}><${Icon} n="edit" size=${18} /></button>
            </div>
          </header>
          <${DinarNens} d=${d} />
          <div class="sopar-wrap"><span class="lbl">Sopar</span><${SoparLine} d=${d} /></div>
          ${e?.motius?.length && !e.fixat ? html`<p class="motius">${e.motius.join('. ')}.</p>` : ''}
          ${sug.map((x) => html`<p class="sug"><b style=${{ color: colorNen(x.nen) }}>${x.nen.nom}</b> · l'escola suggereix: ${x.plats.join(' + ').toLowerCase()}</p>`)}
        </article>`;
      })}
    </div>
    ${edit && html`<${SoparForm} d=${edit} onClose=${() => setEdit(null)} />`}
  </div>`;
}

const protColor = (c) => (c.proteina && PROTEINES[c.proteina] ? PROTEINES[c.proteina].color : CALAIXOS[calaixDe(c)]?.color || '#7d8a97');
const minus = (t, i) => (i ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const clauCombo = (ids) => [...ids].sort().join('|');

// Combinacions per triar d'un toc: les favorites (desades al catàleg) i les recents (sopars fixats dels últims 45 dies).
export function combinacions() {
  const cat = ctx.store.items('cataleg');
  const byId = Object.fromEntries(cat.map((c) => [c.id, c]));
  const ok = (ids) => ids.filter((id) => byId[id]);
  const favs = cat.filter((c) => calaixDe(c) === 'combo' && !c.desactivat).map((c) => ({ id: c.id, plats: ok(c.plats || []), fav: true })).filter((c) => c.plats.length);
  const vistes = new Set(favs.map((c) => clauCombo(c.plats)));
  const lim = addDaysYmd(ymd(), -45);
  const recents = [];
  for (const p of ctx.store.items('pla').filter((p) => p.fixat && p.id >= lim).sort((a, b) => b.id.localeCompare(a.id))) {
    const ids = ok(platsIds(p));
    if (ids.length < 2) continue;
    const k = clauCombo(ids);
    if (vistes.has(k)) continue;
    vistes.add(k);
    recents.push({ id: 'r-' + p.id, plats: ids, fav: false, data: p.id });
    if (recents.length >= 6) break;
  }
  return { favs, recents, nom: (c) => c.plats.map((id, i) => minus(byId[id].nom, i)).join(' + ') };
}

// Ordre: el que feu més sovint primer (prioritat marcada + ús real), després alfabètic
const ordena = (ll, us) => ll.slice().sort((a, b) => pesDe(b, us) - pesDe(a, us) || a.nom.localeCompare(b.nom));
const prioCls = (c) => ` p${prioDe(c)}`;
function Chip({ c, on, onClick }) {
  return html`<button type="button" class=${'pchipbtn' + prioCls(c) + (on ? ' on' : '')} style=${{ '--c': protColor(c) }} aria-pressed=${on} onClick=${onClick}>${c.nom}</button>`;
}

function SoparForm({ d, onClose }) {
  const e = ctx.store.items('pla').find((p) => p.id === d) || { id: d };
  const totCat = ctx.store.items('cataleg');
  const cataleg = totCat.filter((c) => !c.desactivat && calaixDe(c) !== 'combo').sort((a, b) => a.nom.localeCompare(b.nom));
  const [f, set, setF] = useForm({ plats: platsIds(e), text: e.text || '', proteina: e.proteina || '' });
  const [q, setQ] = useState('');
  const triats = f.plats.map((id) => totCat.find((c) => c.id === id)).filter(Boolean);
  const togPlat = (id) => setF((x) => ({ ...x, text: '', plats: x.plats.includes(id) ? x.plats.filter((y) => y !== id) : [...x.plats, id] }));
  const save = () => {
    const item = { id: d, plats: f.text ? [] : f.plats, platId: null, text: f.text || null, complements: [], proteina: f.text ? f.proteina || null : null, complementProteina: null, fixat: true, motius: [], by: ctx.me };
    ctx.store.upsert('pla', item, `sopar de ${fmtCurt(d)}`);
    onClose();
  };
  const buida = () => { ctx.store.remove('pla', d, `treu sopar de ${fmtCurt(d)}`); onClose(); };
  const nq = norm(q.trim());
  const us = usos(ctx.store.items('pla'), ymd());
  const filtra = (ll) => ordena(ll.filter((c) => !nq || norm(c.nom).includes(nq)), us);
  const comp = components(triats, e.text ? [] : f.plats.length === platsIds(e).length ? e.complements : []);
  const falta = ['proteina', 'hidrats', 'verdura'].filter((k) => !comp[k]).map((k) => (k === 'proteina' ? 'proteïna' : k));
  const cmb = combinacions();
  const jaFav = cmb.favs.some((c) => clauCombo(c.plats) === clauCombo(f.plats));
  const desaFav = () => {
    const nom = triats.map((c, i) => minus(c.nom, i)).join(' + ');
    ctx.store.upsert('cataleg', { id: uid(), nom, calaix: 'combo', plats: f.plats, favorit: true, by: ctx.me }, `combinació favorita: ${nom}`);
    ctx.toast('Desada a les combinacions favorites');
  };
  const on = (id) => !f.text && f.plats.includes(id);
  const bloc = (k, contingut, extra = '') => html`<section class=${'pgrup ' + extra} style=${{ '--c': CALAIXOS[k].color }}><h4 class="pgrup-h">${CALAIXOS[k].nom}</h4>${contingut}</section>`;
  const prot = filtra(cataleg.filter((c) => calaixDe(c) === 'proteina'));
  const elab = filtra(cataleg.filter((c) => calaixDe(c) === 'elaborat'));
  const combos = [...cmb.favs, ...cmb.recents].filter((c) => !nq || norm(cmb.nom(c)).includes(nq));
  return html`<${Sheet} title=${`Sopar de ${fmtLlarg(d)}`} onClose=${onClose} noFocus=${true}
    actions=${html`<button class="btn ghost danger" onClick=${buida}>Deixa'l buit</button><button class="btn primary" onClick=${save}>Desa i fixa</button>`}>
    <${DinarNens} d=${d} />
    <${SugEscola} d=${d} onUse=${(plats) => setF((x) => ({ ...x, text: plats.join(' + '), plats: [] }))} />

    <div class="triats">
      <span class="field-label">El sopar</span>
      ${f.text ? html`<p class="small">${f.text}</p>`
        : triats.length ? html`<div class="chips">${triats.map((c) => html`<button type="button" class="chip on" style=${{ '--c': protColor(c) }} onClick=${() => togPlat(c.id)} aria-label=${`Treu ${c.nom}`}>${c.nom} <${Icon} n="x" size=${14} /></button>`)}</div>`
        : html`<p class="muted small">Tria una peça de cada calaix (o un elaborat i el que hi falti).</p>`}
      ${!f.text && triats.length > 0 && html`<div class="sopar-meta"><${VHP} c=${comp} /><span class=${'small ' + (falta.length ? 'falta' : 'muted')}>${falta.length ? `Falta ${falta.join(' i ')}` : 'Complet'}</span>
        ${triats.length > 1 && !jaFav && html`<button type="button" class="linkbtn" onClick=${desaFav}>★ Desa com a favorita</button>`}</div>`}
    </div>

    <input class="picker-q" type="search" value=${q} onInput=${(ev) => setQ(ev.target.value)} placeholder="Busca…" aria-label="Busca un aliment o plat" />
    <div class="picker">
      ${combos.length > 0 && bloc('combo', combos.map((c) => {
        const sel = !f.text && clauCombo(c.plats) === clauCombo(f.plats);
        return html`<button type="button" class=${'pitem' + (sel ? ' on' : '')} onClick=${() => setF((x) => ({ ...x, text: '', plats: sel ? [] : [...c.plats] }))}>
          <span class="pbox">${sel && html`<${Icon} n="check" size=${14} />`}</span>
          <span class="pnom">${c.fav ? '★ ' : ''}${cmb.nom(c)}${!c.fav && html`<span class="muted small"> · ${fmtCurt(c.data)}</span>`}</span>
        </button>`;
      }))}
      ${prot.length > 0 && bloc('proteina', Object.keys(PROTEINES).map((t) => {
        const g = prot.filter((c) => c.proteina === t);
        if (!g.length) return null;
        return html`<div class="psub" style=${{ '--c': PROTEINES[t].color }}><span class="psub-h">${PROTEINES[t].nom}</span>
          <div class="pchips">${g.map((c) => html`<${Chip} c=${c} on=${on(c.id)} onClick=${() => togPlat(c.id)} />`)}</div></div>`;
      }))}
      ${['hidrats', 'verdura'].map((k) => {
        const g = filtra(cataleg.filter((c) => calaixDe(c) === k));
        return g.length > 0 && bloc(k, html`<div class="pchips pad">${g.map((c) => html`<${Chip} c=${c} on=${on(c.id)} onClick=${() => togPlat(c.id)} />`)}</div>`);
      })}
      ${elab.length > 0 && bloc('elaborat', elab.map((c) => html`<button type="button" class=${'pitem' + (on(c.id) ? ' on' : '')} aria-pressed=${on(c.id)} onClick=${() => togPlat(c.id)}>
          <span class="pbox">${on(c.id) && html`<${Icon} n="check" size=${14} />`}</span>
          <span class=${'pnom' + prioCls(c)}>${c.nom}</span>
          <${VHP} c=${cobreix(c)} />
        </button>`))}
    </div>

    <${Field} label="O escriu-lo" hint="Si escrius alguna cosa aquí, té prioritat sobre el que hagis triat."><input value=${f.text} onInput=${set('text')} placeholder="Restes de l'arròs de dinar…" /><//>
    ${f.text && html`<${Field} label="Proteïna principal"><select value=${f.proteina} onChange=${set('proteina')}><option value="">—</option>${Object.entries(PROTEINES).map(([k, v]) => html`<option value=${k}>${v.nom}</option>`)}</select><//>`}
  <//>`;
}

function MenuEscola() {
  const mesos = [...new Set([...ctx.store.menuMonths, monthKey()])].sort();
  const [mk, setMk] = useState(monthKey());
  const m = menuMes(mk);
  const seg = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
  const falta = !ctx.store.menuMonths.includes(seg);
  const avui = ymd();
  const [passats, setPassats] = useState(false);
  const dl = ymd(startOfWeek());
  const totsDies = m ? Object.keys(m.dies).sort() : [];
  const dies = passats ? totsDies : totsDies.filter((d) => d >= dl);
  return html`<div>
    ${falta && html`<div class="notice">Encara no hi ha el menú de ${MESOS_CAP[Number(seg.slice(5)) - 1].toLowerCase()}. Quan arribin els PDF, passa'ls a Claude i demana-li que els afegeixi al dashboard.</div>`}
    <div class="chips">${mesos.map((k) => html`<button class=${'chip' + (k === mk ? ' on' : '')} onClick=${() => setMk(k)}>${MESOS_CAP[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}</button>`)}</div>
    ${!m && html`<${Empty} title="No hi ha menú per a aquest mes" text="Passa el PDF del menjador a Claude i el carregarà aquí." />`}
    ${m && html`<p class="hint">${Object.entries(m.fonts || {}).map(([k, v]) => html`<span><b>${nomDe(k)}:</b> ${v}. </span>`)}</p>
      <div class="menu-list">
        ${dies.map((d) => html`<div class=${'menu-day' + (d === avui ? ' today' : '') + (d < avui ? ' past' : '')}>
          <h4>${fmtCurt(d)}</h4><${DinarNens} d=${d} />
        </div>`)}
      </div>
      ${dies.length < totsDies.length && html`<button class="linkbtn" onClick=${() => setPassats(true)}>Mostra també els dies passats (${totsDies.length - dies.length})</button>`}`}
  </div>`;
}

const fmtN = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const TEMPS = { 'ràpid': 'Ràpid', normal: 'Normal', llarg: 'Llarg' };
const NOU = { id: null, nom: '', calaix: 'proteina', proteina: 'carn-blanca', verdura: false, hidrats: false, temps: 'normal', ingredients: [] };
function Cataleg() {
  const [edit, setEdit] = useState(null);
  const cat = ctx.store.items('cataleg').slice().sort((a, b) => a.nom.localeCompare(b.nom));
  const item = (c, extra) => html`<button class=${'cat-item' + (c.desactivat ? ' off' : '')} onClick=${() => setEdit(c)}>
    <span class=${prioCls(c)}>${calaixDe(c) === 'combo' ? '★ ' : ''}${c.nom}</span><span class="cat-meta">${extra}</span></button>`;
  const grup = (k, contingut) => html`<div class="cat-group" style=${{ '--c': CALAIXOS[k].color }}><h3 class="cat-h">${CALAIXOS[k].nom}</h3>${contingut}</div>`;
  const de = (k) => cat.filter((c) => calaixDe(c) === k);
  const us = usos(ctx.store.items('pla'), ymd());
  const xips = (ll) => html`<div class="pchips cat-xips">${ordena(ll, us).map((c) => html`<button class=${'pchipbtn' + prioCls(c) + (c.desactivat ? ' off' : '')} style=${{ '--c': c.proteina && PROTEINES[c.proteina] ? PROTEINES[c.proteina].color : CALAIXOS[calaixDe(c)].color }} onClick=${() => setEdit(c)}>${c.nom}</button>`)}</div>`;
  return html`<div>
    <div class="sec-head"><p class="hint">Un sopar és una peça de cada calaix, o un elaborat i el que hi falti. En gran, el que feu sovint; en petit, el que feu de tant en tant. Toca un element per canviar-ho.</p>
      <button class="btn primary" onClick=${() => setEdit({ ...NOU })}><${Icon} n="plus" size=${16} /> Afegeix</button></div>
    ${grup('proteina', Object.keys(PROTEINES).map((t) => {
      const g = de('proteina').filter((c) => c.proteina === t);
      return g.length ? html`<h4 class="cat-sub" style=${{ color: PROTEINES[t].color }}>${PROTEINES[t].nom}</h4>${xips(g)}` : null;
    }))}
    ${grup('hidrats', xips(de('hidrats')))}
    ${grup('verdura', xips(de('verdura')))}
    ${grup('elaborat', ordena(de('elaborat'), us).map((c) => item(c, html`<${VHP} c=${cobreix(c)} />${c.proteina && html`<${ProtChip} t=${c.proteina} />`}`)))}
    ${de('combo').length > 0 && grup('combo', de('combo').map((c) => item(c)))}
    <p class="hint">Les combinacions favorites es desen des de la fitxa de cada sopar (★ Desa com a favorita).</p>
    ${edit && html`<${PlatForm} plat=${edit} onClose=${() => setEdit(null)} />`}
  </div>`;
}

function PlatForm({ plat, onClose }) {
  const [f, set, setF] = useForm({ ...plat, calaix: calaixDe(plat) || 'proteina', prio: prioDe(plat), ingredientsTxt: (plat.ingredients || []).join(', ') });
  const k = f.calaix;
  const save = () => {
    if (!f.nom.trim()) return;
    const { ingredientsTxt, ...rest } = f;
    const item = { ...rest, nom: f.nom.trim(), id: f.id || uid(), ingredients: ingredientsTxt.split(',').map((x) => x.trim()).filter(Boolean) };
    if (k !== 'combo') item.favorit = false; // la prioritat substitueix el «preferit»
    if (k === 'proteina') Object.assign(item, { proteina: f.proteina || 'carn-blanca', verdura: false, hidrats: false });
    if (k === 'hidrats') Object.assign(item, { proteina: null, verdura: false, hidrats: true });
    if (k === 'verdura') Object.assign(item, { proteina: null, verdura: true, hidrats: false });
    if (k === 'elaborat') item.proteina = f.proteina || null;
    ctx.store.upsert('cataleg', item, `catàleg: ${item.nom}`);
    onClose();
  };
  const del = () => { ctx.store.remove('cataleg', f.id, `treu ${f.nom} del catàleg`); onClose(); };
  return html`<${Sheet} title=${plat.id ? 'Edita' : 'Afegeix al catàleg'} onClose=${onClose}
    actions=${html`${plat.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Nom"><input value=${f.nom} onInput=${set('nom')} placeholder=${k === 'elaborat' ? 'Truita de patates' : 'Pollastre'} /><//>
    ${k !== 'combo' && html`<div class="field"><span class="field-label">Calaix</span><${Seg} small value=${k} onChange=${(v) => setF((x) => ({ ...x, calaix: v }))} options=${['proteina', 'hidrats', 'verdura', 'elaborat'].map((v) => ({ value: v, label: CALAIXOS[v].nom }))} /></div>`}
    ${(k === 'proteina' || k === 'elaborat') && html`<${Field} label=${k === 'proteina' ? 'Tipus de proteïna' : 'Proteïna que porta'}><select value=${f.proteina || ''} onChange=${set('proteina')}>${k === 'elaborat' && html`<option value="">Cap</option>`}${Object.entries(PROTEINES).map(([v, x]) => html`<option value=${v}>${x.nom}</option>`)}</select><//>`}
    ${k === 'elaborat' && html`<div class="checks">
      <label class="check"><input type="checkbox" checked=${!!f.hidrats} onChange=${set('hidrats')} /> Ja porta hidrats</label>
      <label class="check"><input type="checkbox" checked=${!!f.verdura} onChange=${set('verdura')} /> Ja porta verdura</label>
    </div>
    <${Field} label="Temps de preparació"><select value=${f.temps || 'normal'} onChange=${set('temps')}>${Object.entries(TEMPS).map(([v, x]) => html`<option value=${v}>${x}</option>`)}</select><//>`}
    ${k === 'combo' && html`<p class="hint">Combinació: ${(f.plats || []).map((id) => ctx.store.items('cataleg').find((c) => c.id === id)?.nom).filter(Boolean).join(' + ')}</p>`}
    ${k !== 'combo' && html`<${Field} label="Per a la compra" hint=${k === 'elaborat' ? 'Ingredients separats per comes.' : "Si ho deixes buit, s'hi afegeix el nom tal qual."}><input value=${f.ingredientsTxt} onInput=${set('ingredientsTxt')} /><//>`}
    ${k !== 'combo' && html`<div class="field"><span class="field-label">Quan el feu?</span><${Seg} small value=${String(f.prio)} onChange=${(v) => setF((x) => ({ ...x, prio: Number(v) }))} options=${[2, 1, 0].map((v) => ({ value: String(v), label: PRIO[v] }))} />
      <span class="field-hint">Els de «sovint» surten primer i més grans, i el botó Proposa els tria més. L'app també aprèn del que aneu fixant.</span></div>`}
    <div class="checks">
      <label class="check"><input type="checkbox" checked=${!!f.desactivat} onChange=${set('desactivat')} /> No el proposis mai</label>
    </div>
  <//>`;
}
