// Salut dels nens: registre (temperatura, medicació, símptomes, visites), creixement (pes, alçada, talles)
// i fitxes de medicaments amb la dosi que us han indicat. L'app no calcula dosis: només les recorda.
import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, Who, Empty, useForm, nomDe, colorDe, naixDe } from '../ui.js';
import { ymd, parseYmd, fmtLlarg, fmtData, uid, lsGet, lsSet, edat, ara, addDaysYmd, daysBetween } from '../util.js';
import { PROSPECTES, dosiProspecte, liniaFila, fmtMl, dosiUnica } from '../prospectes.js';

export const TIPUS_REG = {
  temp: { nom: 'Temperatura', icon: 'thermo' },
  med: { nom: 'Medicació', icon: 'pill' },
  simptoma: { nom: 'Símptoma', icon: 'note' },
  visita: { nom: 'Visita', icon: 'heart' },
  vacuna: { nom: 'Vacuna', icon: 'heart' },
  nota: { nom: 'Nota', icon: 'note' },
};

const nens = () => ctx.membres.filter((m) => !m.adult);
const items = (k, nen) => ctx.store.items('salut').filter((x) => x.k === k && (!nen || x.nen === nen));
export const registres = (nen) => items('reg', nen).sort((a, b) => b.ts.localeCompare(a.ts));
const mesures = (nen) => items('mesura', nen).sort((a, b) => b.data.localeCompare(a.data));
const meds = (nen) => items('med', nen).sort((a, b) => (b.actiu !== false) - (a.actiu !== false) || a.nom.localeCompare(b.nom));

// Darrer pes apuntat d'un nen (de «Pes i talles»)
export function ultimPes(nenId) {
  const m = mesures(nenId).find((x) => x.pes != null && x.pes !== '');
  return m ? { kg: Number(m.pes), data: m.data, dies: daysBetween(m.data, ymd()) } : null;
}
function mesosDe(nenId) {
  const nx = naixDe(nenId);
  if (!nx) return null;
  const a = parseYmd(nx), b = new Date();
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() - (b.getDate() < a.getDate() ? 1 : 0);
}

const minDes = (ts) => Math.round((Date.now() - new Date(ts).getTime()) / 60000);
export function fa(ts) {
  const m = minDes(ts);
  if (m < 1) return 'ara mateix';
  if (m < 60) return `fa ${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return `fa ${h} h${r ? ` ${r} min` : ''}`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ahir' : `fa ${d} dies`;
}
const hora = (ts) => ts.slice(11, 16);
const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
const fmtNum = (n, dec = 1) => (n == null ? '' : n.toLocaleString('ca', { maximumFractionDigits: dec }));
function sumaHores(ts, h) {
  const d = new Date(new Date(ts).getTime() + h * 3600e3);
  return { ymd: ymd(d), hora: d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' }) };
}
const txtReg = (r) => r.tipus === 'temp' ? `${fmtNum(r.temp)} °C${r.text ? ` · ${r.text}` : ''}`
  : r.tipus === 'med' ? `${r.medNom || 'Medicament'}${r.dosi ? ` · ${r.dosi}` : ''}${r.text ? ` · ${r.text}` : ''}`
  : r.text || TIPUS_REG[r.tipus]?.nom;

// Estat d'un medicament: última presa, quan toca la següent segons l'interval que heu apuntat i preses en 24 h
export function estatMed(m) {
  const preses = registres(m.nen).filter((r) => r.tipus === 'med' && (r.medId === m.id || (!r.medId && r.medNom === m.nom)));
  const ult = preses[0];
  if (!ult) return null;
  const en24 = preses.filter((r) => minDes(r.ts) < 24 * 60).length;
  const out = { ult, en24 };
  if (m.interval) {
    const seg = sumaHores(ult.ts, Number(m.interval));
    out.aviat = minDes(ult.ts) < Number(m.interval) * 60;
    out.seg = seg.ymd === ymd() ? `a les ${seg.hora}` : `${seg.ymd === addDaysYmd(ymd(), 1) ? 'demà' : fmtLlarg(seg.ymd)} a les ${seg.hora}`;
  }
  if (m.maxDia) out.massa = en24 >= Number(m.maxDia);
  return out;
}

// Resum per a la targeta d'avisos d'Avui: el que s'ha apuntat les darreres 24 h
export function avisosSalut() {
  const out = [];
  for (const n of nens()) {
    const rs = registres(n.id).filter((r) => (r.tipus === 'temp' || r.tipus === 'med') && minDes(r.ts) < 24 * 60);
    if (!rs.length) continue;
    const t = rs.find((r) => r.tipus === 'temp');
    const parts = [];
    if (t) parts.push(`${fmtNum(t.temp)} °C a les ${hora(t.ts)}`);
    const vistos = new Set();
    for (const r of rs.filter((r) => r.tipus === 'med')) {
      const k = r.medId || r.medNom;
      if (vistos.has(k)) continue;
      vistos.add(k);
      parts.push(`${r.medNom || 'medicament'} a les ${hora(r.ts)}`);
    }
    out.push({ cls: 'salut', txt: `${n.nom}: ${parts.join(' · ')}`, go: 'mes/salut' });
  }
  return out;
}

export function SalutView({ Back }) {
  const ns = nens();
  const [nen, setNenS] = useState(() => (ns.some((n) => n.id === lsGet('df.salut.nen')) ? lsGet('df.salut.nen') : ns[0]?.id));
  const [tab, setTabS] = useState(lsGet('df.salut.tab', 'registre'));
  const setNen = (v) => { setNenS(v); lsSet('df.salut.nen', v); };
  const setTab = (v) => { setTabS(v); lsSet('df.salut.tab', v); };
  if (!ns.length) return html`<section class="view sec-salut"><${Back} title="Salut dels nens" /><${Empty} title="No hi ha nens a la família" text="Afegeix-los a Ajustos." /></section>`;
  const n = ns.find((x) => x.id === nen) || ns[0];
  return html`<section class="view sec-salut">
    <${Back} title="Salut dels nens" />
    <div class="nens" role="radiogroup" aria-label="Nen">${ns.map((x) => html`<button role="radio" aria-checked=${x.id === n.id} class=${'nen' + (x.id === n.id ? ' on' : '')} style=${{ '--c': x.color }} onClick=${() => setNen(x.id)}>
      <b>${x.nom}</b><small>${naixDe(x.id) ? edat(naixDe(x.id)) : x.curs || ''}</small></button>`)}</div>
    <${Seg} value=${tab} onChange=${setTab} options=${[{ value: 'registre', label: 'Registre' }, { value: 'creixement', label: 'Pes i talles' }, { value: 'meds', label: 'Medicaments' }]} />
    ${tab === 'registre' && html`<${Registre} key=${n.id} n=${n} />`}
    ${tab === 'creixement' && html`<${Creixement} key=${n.id} n=${n} />`}
    ${tab === 'meds' && html`<${Medicaments} key=${n.id} n=${n} />`}
  </section>`;
}

// ---------- Registre ----------
function Registre({ n }) {
  const [edit, setEdit] = useState(null);
  const rs = registres(n.id);
  const ms = meds(n.id).filter((m) => m.actiu !== false);
  const temp = rs.find((r) => r.tipus === 'temp');
  const nou = (tipus, extra = {}) => setEdit({ id: null, k: 'reg', nen: n.id, tipus, ts: ara(), temp: '', text: '', dosi: '', medId: '', medNom: '', ...extra });
  const estats = ms.map((m) => [m, estatMed(m)]).filter(([, e]) => e && minDes(e.ult.ts) < 72 * 60);
  const perDia = [];
  for (const r of rs.slice(0, 80)) {
    const d = r.ts.slice(0, 10);
    if (!perDia.length || perDia[perDia.length - 1][0] !== d) perDia.push([d, []]);
    perDia[perDia.length - 1][1].push(r);
  }
  return html`<div>
    <div class="salut-btns">
      <button class="sbtn" onClick=${() => nou('temp')}><${Icon} n="thermo" size=${22} /><span>Temperatura</span></button>
      <button class="sbtn" onClick=${() => nou('med', ms.length === 1 ? { medId: ms[0].id, medNom: ms[0].nom, dosi: ms[0].dosi || '' } : {})}><${Icon} n="pill" size=${22} /><span>Medicació</span></button>
      <button class="sbtn" onClick=${() => nou('simptoma')}><${Icon} n="note" size=${22} /><span>Altres</span></button>
    </div>
    ${(temp && minDes(temp.ts) < 72 * 60) || estats.length ? html`<div class="card salut-estat">
      ${temp && minDes(temp.ts) < 72 * 60 && html`<p><${Icon} n="thermo" size=${16} /> Darrera temperatura: <b>${fmtNum(temp.temp)} °C</b> <span class="muted">${fa(temp.ts)} (${hora(temp.ts)})</span></p>`}
      ${estats.map(([m, e]) => html`<div class="med-estat">
        <p><${Icon} n="pill" size=${16} /> <b>${m.nom}:</b> ${e.ult.dosi || m.dosi || ''} <span class="muted">${fa(e.ult.ts)} (${hora(e.ult.ts)}, ${nomDe(e.ult.by)})</span></p>
        ${e.seg && html`<p class=${'small ' + (e.aviat ? 'warn-txt' : 'ok-txt')}>${e.aviat ? `Interval apuntat: cada ${m.interval} h. La següent, ${e.seg}.` : `Ja han passat les ${m.interval} h de l'interval apuntat.`}</p>`}
        ${m.maxDia && html`<p class=${'small ' + (e.massa ? 'late' : 'muted')}>${e.en24} ${e.en24 === 1 ? 'presa' : 'preses'} en 24 h (màxim apuntat: ${m.maxDia}).</p>`}
      </div>`)}
    </div>` : ''}
    ${rs.length === 0 && html`<${Empty} title="Res apuntat" text=${`Apunta la febre i la medicació de ${n.nom} quan passi: així qui s'aixeca de nit sap què s'ha fet i quan, i ho podeu ensenyar al pediatre.`} />`}
    ${perDia.map(([d, g]) => html`<div class="lgroup"><h3>${d === ymd() ? 'Avui' : d === addDaysYmd(ymd(), -1) ? 'Ahir' : fmtLlarg(d)}</h3>
      <ul class="items regs">${g.map((r) => html`<li class=${'item reg reg-' + r.tipus} onClick=${() => setEdit(r)}>
        <span class="reg-h">${hora(r.ts)}</span>
        <${Icon} n=${TIPUS_REG[r.tipus]?.icon || 'note'} size=${17} />
        <span class="item-txt">${txtReg(r)}${r.tipus !== 'temp' && r.tipus !== 'med' && r.tipus !== 'simptoma' ? html`<small class="muted"> · ${TIPUS_REG[r.tipus]?.nom}</small>` : ''}</span>
        <${Who} id=${r.by} small=${true} />
      </li>`)}</ul></div>`)}
    ${edit && html`<${RegForm} r=${edit} n=${n} onClose=${() => setEdit(null)} />`}
  </div>`;
}

function RegForm({ r, n, onClose }) {
  const [f, set, setF] = useForm({ ...r, temp: r.temp ?? '', text: r.text || '', dosi: r.dosi || '', medId: r.medId || '', medNom: r.medNom || '' });
  const ms = meds(n.id).filter((m) => m.actiu !== false || m.id === f.medId);
  const med = ms.find((m) => m.id === f.medId);
  const e = med && !r.id ? estatMed(med) : null;
  const kg = ultimPes(n.id)?.kg;
  const triaMed = (m) => setF((x) => ({ ...x, medId: m ? m.id : '', medNom: m ? m.nom : '', dosi: m ? (m.prospecte ? dosiUnica(m.prospecte, kg) : m.dosi || '') : x.dosi }));
  const save = () => {
    if (!f.ts) return;
    if (f.tipus === 'temp' && num(f.temp) == null) return ctx.toast('Escriu la temperatura');
    if (f.tipus === 'med' && !f.medNom.trim()) return ctx.toast('Tria o escriu el medicament');
    if (!['temp', 'med'].includes(f.tipus) && !f.text.trim()) return ctx.toast('Escriu què ha passat');
    const item = { id: f.id || uid(), k: 'reg', nen: n.id, tipus: f.tipus, ts: f.ts, text: f.text.trim(), by: f.by || ctx.me };
    if (f.tipus === 'temp') item.temp = num(f.temp);
    if (f.tipus === 'med') Object.assign(item, { medId: f.medId || null, medNom: f.medNom.trim(), dosi: f.dosi.trim() });
    ctx.store.upsert('salut', item, `salut ${n.nom}: ${TIPUS_REG[f.tipus].nom.toLowerCase()}`);
    onClose();
  };
  const del = () => { ctx.store.remove('salut', f.id, `salut ${n.nom}: esborra registre`); onClose(); };
  return html`<${Sheet} title=${`${TIPUS_REG[f.tipus].nom} · ${n.nom}`} onClose=${onClose}
    actions=${html`${r.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Què"><div class="chips">${Object.entries(TIPUS_REG).map(([k, v]) => html`<button type="button" class=${'chip' + (f.tipus === k ? ' on' : '')} onClick=${() => setF((x) => ({ ...x, tipus: k }))}>${v.nom}</button>`)}</div><//>
    <${Field} label="Quan"><input type="datetime-local" value=${f.ts} onInput=${set('ts')} /><//>
    ${f.tipus === 'temp' && html`<${Field} label="Temperatura (°C)"><input inputmode="decimal" value=${f.temp} onInput=${set('temp')} placeholder="38,2" /><//>`}
    ${f.tipus === 'med' && html`
      <${Field} label="Medicament" hint=${ms.length ? '' : 'Pots desar-ne la dosi a la pestanya Medicaments i aquí sortirà ja escrita.'}>
        ${ms.length > 0 && html`<div class="chips">${ms.map((m) => html`<button type="button" class=${'chip' + (f.medId === m.id ? ' on' : '')} onClick=${() => triaMed(f.medId === m.id ? null : m)}>${m.nom}</button>`)}</div>`}
        ${!f.medId && html`<input value=${f.medNom} onInput=${set('medNom')} placeholder="Nom del medicament" />`}
      <//>
      <${Field} label="Dosi donada" hint=${med?.dosi ? `La que teniu apuntada per a ${n.nom}: ${med.dosi}${med.interval ? `, cada ${med.interval} h` : ''}.` : ''}><input value=${f.dosi} onInput=${set('dosi')} placeholder="ml, mg…" /><//>
      ${med?.prospecte && !r.id && html`<${DosiProspecte} m=${med} n=${n} />`}
      ${e && e.aviat && html`<p class="hint warn-txt">L'última presa de ${med.nom} va ser ${fa(e.ult.ts)} (${hora(e.ult.ts)}). L'interval que teniu apuntat és de ${med.interval} h: la següent, ${e.seg}.</p>`}
      ${e && e.massa && html`<p class="hint late">Ja porta ${e.en24} preses en 24 h, el màxim que teniu apuntat.</p>`}`}
    <${Field} label=${['temp', 'med'].includes(f.tipus) ? 'Nota (opcional)' : 'Descripció'}><textarea rows="2" value=${f.text} onInput=${set('text')} placeholder=${f.tipus === 'visita' ? 'Pediatre: otitis, tornar d\'aquí a 10 dies' : f.tipus === 'vacuna' ? 'Quina vacuna i on' : f.tipus === 'temp' ? 'Axil·lar, rectal, després del bany…' : 'Tos, mocs, vòmit, no menja…'}></textarea><//>
    ${r.id && r.by && html`<p class="hint">Apuntat per ${nomDe(r.by)}.</p>`}
  <//>`;
}

// ---------- Creixement ----------
const CAMPS = [['pes', 'Pes', 'kg'], ['alcada', 'Alçada', 'cm'], ['talla', 'Talla de roba', ''], ['sabata', 'Sabata', '']];
function ultim(ms, k) { return ms.find((m) => m[k] != null && m[k] !== ''); }

function Grafic({ punts, unitat, color }) {
  if (punts.length < 2) return null;
  const W = 320, H = 130, p = { l: 34, r: 10, t: 12, b: 22 };
  const xs = punts.map((q) => parseYmd(q.d).getTime()), ys = punts.map((q) => q.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 1) { y0 -= 0.5; y1 += 0.5; }
  const X = (x) => p.l + ((x - x0) / (x1 - x0 || 1)) * (W - p.l - p.r);
  const Y = (y) => H - p.b - ((y - y0) / (y1 - y0)) * (H - p.t - p.b);
  const pts = punts.map((q, i) => [X(xs[i]), Y(q.v)]);
  const curt = (d) => { const x = parseYmd(d); return `${x.getMonth() + 1}/${String(x.getFullYear()).slice(2)}`; };
  return html`<svg class="grafic" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label=${`Evolució: de ${fmtNum(ys[0])} a ${fmtNum(ys[ys.length - 1])} ${unitat}`} style=${{ '--c': color }}>
    <line x1=${p.l} x2=${W - p.r} y1=${Y(y0)} y2=${Y(y0)} class="g-axis" />
    <line x1=${p.l} x2=${W - p.r} y1=${Y(y1)} y2=${Y(y1)} class="g-grid" />
    <text x=${p.l - 5} y=${Y(y1) + 4} class="g-lbl" text-anchor="end">${fmtNum(y1)}</text>
    <text x=${p.l - 5} y=${Y(y0) + 4} class="g-lbl" text-anchor="end">${fmtNum(y0)}</text>
    <text x=${p.l} y=${H - 5} class="g-lbl">${curt(punts[0].d)}</text>
    <text x=${W - p.r} y=${H - 5} class="g-lbl" text-anchor="end">${curt(punts[punts.length - 1].d)}</text>
    <polyline points=${pts.map((q) => q.join(',')).join(' ')} class="g-line" />
    ${pts.map(([x, y]) => html`<circle cx=${x} cy=${y} r="3.5" class="g-dot" />`)}
  </svg>`;
}

function Creixement({ n }) {
  const [edit, setEdit] = useState(null);
  const ms = mesures(n.id);
  const nou = () => setEdit({ id: null, data: ymd(), pes: '', alcada: '', talla: ultim(ms, 'talla')?.talla || '', sabata: ultim(ms, 'sabata')?.sabata || '', nota: '' });
  const serie = (k) => ms.filter((m) => m[k] != null && m[k] !== '').map((m) => ({ d: m.data, v: Number(m[k]) })).reverse();
  return html`<div>
    <div class="card creix">
      ${ms[0] && html`<p class="small muted">Darrera mesura: ${fmtData(ms[0].data)}${naixDe(n.id) ? ` (${edat(naixDe(n.id), ms[0].data)})` : ''}</p>`}
      <div class="creix-grid">${CAMPS.map(([k, nom, u]) => {
        const m = ultim(ms, k);
        return html`<div class="creix-v"><small>${nom}</small><b>${m ? `${typeof m[k] === 'number' ? fmtNum(m[k], 2) : m[k]}${u ? ` ${u}` : ''}` : '—'}</b>${m && m.data !== ms[0].data && html`<small class="muted">${fmtData(m.data)}</small>`}</div>`;
      })}</div>
      <button class="btn primary sm" onClick=${nou}><${Icon} n="plus" size=${16} /> Nova mesura</button>
    </div>
    <div class="grafics">
      ${serie('pes').length >= 2 && html`<div class="card"><h3>Pes (kg)</h3><${Grafic} punts=${serie('pes')} unitat="kg" color=${n.color} /></div>`}
      ${serie('alcada').length >= 2 && html`<div class="card"><h3>Alçada (cm)</h3><${Grafic} punts=${serie('alcada')} unitat="cm" color=${n.color} /></div>`}
    </div>
    ${ms.length === 0 ? html`<${Empty} title="Encara cap mesura" text="Apunta el pes i l'alçada de les revisions del nen sa, i la talla de roba i sabata quan canviïn." />`
      : html`<div class="lgroup"><h3>Historial</h3><ul class="items">${ms.map((m) => html`<li class="item" onClick=${() => setEdit(m)}>
        <span class="reg-h">${fmtData(m.data)}</span>
        <span class="item-txt">${[m.pes != null && m.pes !== '' && `${fmtNum(m.pes, 2)} kg`, m.alcada != null && m.alcada !== '' && `${fmtNum(m.alcada)} cm`, m.talla && `roba ${m.talla}`, m.sabata && `sabata ${m.sabata}`].filter(Boolean).join(' · ')}${m.nota ? html`<small class="muted"> · ${m.nota}</small>` : ''}</span>
      </li>`)}</ul></div>`}
    ${edit && html`<${MesuraForm} m=${edit} n=${n} onClose=${() => setEdit(null)} />`}
  </div>`;
}

function MesuraForm({ m, n, onClose }) {
  const [f, set] = useForm({ ...m, pes: m.pes ?? '', alcada: m.alcada ?? '', talla: m.talla || '', sabata: m.sabata || '', nota: m.nota || '' });
  const save = () => {
    const item = { id: f.id || uid(), k: 'mesura', nen: n.id, data: f.data, pes: num(f.pes), alcada: num(f.alcada), talla: f.talla.trim(), sabata: String(f.sabata).trim(), nota: f.nota.trim(), by: f.by || ctx.me };
    if (item.pes == null && item.alcada == null && !item.talla && !item.sabata) return ctx.toast('Omple almenys una mesura');
    ctx.store.upsert('salut', item, `salut ${n.nom}: mesura`);
    onClose();
  };
  const del = () => { ctx.store.remove('salut', f.id, `salut ${n.nom}: esborra mesura`); onClose(); };
  return html`<${Sheet} title=${`Mesura · ${n.nom}`} onClose=${onClose}
    actions=${html`${m.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Dia"><input type="date" value=${f.data} onInput=${set('data')} /><//>
    <div class="row2"><${Field} label="Pes (kg)"><input inputmode="decimal" value=${f.pes} onInput=${set('pes')} placeholder="12,4" /><//><${Field} label="Alçada (cm)"><input inputmode="decimal" value=${f.alcada} onInput=${set('alcada')} placeholder="92" /><//></div>
    <div class="row2"><${Field} label="Talla de roba"><input value=${f.talla} onInput=${set('talla')} placeholder="3-4 anys, 98…" /><//><${Field} label="Sabata"><input inputmode="decimal" value=${f.sabata} onInput=${set('sabata')} placeholder="25" /><//></div>
    <${Field} label="Nota"><input value=${f.nota} onInput=${set('nota')} placeholder="Revisió dels 3 anys…" /><//>
  <//>`;
}

// Quadre amb la dosi que diu el prospecte per al darrer pes del nen
export function DosiProspecte({ m, n }) {
  const pr = PROSPECTES[m.prospecte];
  if (!pr) return null;
  const pes = ultimPes(n.id);
  const d = dosiProspecte(pr.id, pes?.kg);
  const mesos = mesosDe(n.id);
  const petit = pr.id === 'dalsy' ? (mesos == null || mesos < 24) : (mesos == null || mesos < 36);
  return html`<div class="dosi-prosp">
    <p class="dp-cap">Segons el prospecte de ${pr.nom}</p>
    ${d.estat === 'sensePes' && html`<p>Apunta el pes de ${n.nom} a <b>Pes i talles</b> i aquí hi sortirà la dosi del prospecte.</p>`}
    ${(d.estat === 'no' || d.estat === 'fora') && html`<p class="late">${d.text}</p>`}
    ${pes && d.files && html`<p class="muted small">Amb ${String(pes.kg).replace('.', ',')} kg (pesat el ${fmtData(pes.data)}):</p>`}
    ${d.estat === 'exacte' && html`<p class="dp-dosi">${fmtMl(d.files[0][2], d.files[0][3])} <small>per presa · màxim ${String(d.files[0][4]).replace('.', ',')} ml en 24 h</small></p><p class="small muted">${liniaFila(pr.id, d.files[0])}</p>`}
    ${d.estat === 'entre' && html`<p class="small">El pes de ${n.nom} no és cap de les files del prospecte. Les dues més properes són:</p>
      <ul class="dp-files">${d.files.map((f) => html`<li>${liniaFila(pr.id, f)}</li>`)}</ul>
      <p class="small muted">Confirmeu la dosi amb el pediatre o el farmacèutic.</p>`}
    ${d.estat === 'tram' && html`<p class="dp-dosi">${fmtMl(d.files[0][2])} <small>per presa · cada 6 h</small></p><p class="small muted">${liniaFila(pr.id, d.files[0])}</p>`}
    ${pes && pes.dies > 45 && html`<p class="small warn-txt">El darrer pes és de fa ${pes.dies} dies: torneu a pesar ${n.nom}.</p>`}
    <p class="small muted">${pr.resum}</p>
    <ul class="dp-avisos">${pr.avisos.map((a, i) => html`<li class=${i === 1 && pr.id === 'dalsy' && petit ? 'late' : i === 0 && pr.id === 'apiretal' && petit ? 'warn-txt' : ''}>${a}</li>`)}</ul>
    <p class="small muted">Si el pediatre us ha indicat una altra dosi, mana la seva. <a href=${pr.url} target="_blank" rel="noopener" onClick=${(e) => e.stopPropagation()}>Prospecte oficial (AEMPS)</a></p>
  </div>`;
}

// ---------- Medicaments ----------
function Medicaments({ n }) {
  const [edit, setEdit] = useState(null);
  const ms = meds(n.id);
  const pes = ultim(mesures(n.id), 'pes');
  const afegeixBasic = (pr) => ctx.store.upsert('salut', { id: `med-${pr.id}-${n.id}`, k: 'med', nen: n.id, nom: pr.nom, prospecte: pr.id, dosi: '', interval: pr.intervalH, maxDia: pr.preses, pesRef: null, nota: `${pr.actiu} · ${pr.envas}`, actiu: true, by: ctx.me }, `salut ${n.nom}: ${pr.nom.split(' ')[0]}`);
  return html`<div>
    <p class="hint">Dalsy i Apiretal porten la dosi del prospecte oficial per al darrer pes de ${n.nom}. Per a qualsevol altre medicament, apunteu la dosi que us hagi indicat el pediatre: l'app la recorda i us diu quan es va donar l'última.</p>
    <div class="btnrow">
      ${Object.values(PROSPECTES).filter((pr) => !ms.some((m) => m.prospecte === pr.id)).map((pr) => html`<button class="btn" onClick=${() => afegeixBasic(pr)}><${Icon} n="plus" size=${16} /> ${pr.nom.split(' ')[0]}</button>`)}
      <button class="btn primary" onClick=${() => setEdit({ id: null, nom: '', dosi: '', interval: '', maxDia: '', pesRef: pes?.pes ?? '', nota: '', actiu: true })}><${Icon} n="plus" size=${16} /> Un altre medicament</button>
    </div>
    ${ms.length === 0 && html`<${Empty} title="Cap medicament apuntat" text="L'antitèrmic de casa, l'antibiòtic d'ara, el xarop de la tos… cadascun amb la seva dosi." />`}
    <ul class="meds">${ms.map((m) => {
      const e = estatMed(m);
      const revisa = !m.prospecte && m.pesRef && pes?.pes && Math.abs(pes.pes - m.pesRef) / m.pesRef >= 0.1;
      return html`<li class=${'med' + (m.actiu === false ? ' inactiu' : '')} onClick=${() => setEdit(m)}>
        <div class="med-top"><b>${m.nom}</b>${m.actiu === false && html`<span class="tag">Arxivat</span>`}</div>
        ${m.prospecte ? html`<p class="muted small">${m.nota || ''}${m.interval ? ` · cada ${m.interval} h` : ''}${m.maxDia ? ` · ${m.maxDia} preses al dia` : ''}</p>` : html`<p>${m.dosi || 'Sense dosi apuntada'}${m.interval ? ` · cada ${m.interval} h` : ''}${m.maxDia ? ` · màx. ${m.maxDia} en 24 h` : ''}</p>`}
        ${m.prospecte && m.actiu !== false && html`<${DosiProspecte} m=${m} n=${n} />`}
        ${m.nota && !m.prospecte && html`<p class="muted small">${m.nota}</p>`}
        ${revisa && html`<p class="small warn-txt">Dosi apuntada amb ${fmtNum(m.pesRef, 2)} kg i ara pesa ${fmtNum(pes.pes, 2)} kg: reviseu-la amb el pediatre o el prospecte.</p>`}
        ${e && html`<p class="small muted">Última presa ${fa(e.ult.ts)} (${fmtLlarg(e.ult.ts.slice(0, 10))}, ${hora(e.ult.ts)}).</p>`}
      </li>`;
    })}</ul>
    ${edit && html`<${MedForm} m=${edit} n=${n} onClose=${() => setEdit(null)} />`}
  </div>`;
}

function MedForm({ m, n, onClose }) {
  const [f, set] = useForm({ ...m, dosi: m.dosi || '', interval: m.interval ?? '', maxDia: m.maxDia ?? '', pesRef: m.pesRef ?? '', nota: m.nota || '', actiu: m.actiu !== false });
  const save = () => {
    if (!f.nom.trim()) return;
    ctx.store.upsert('salut', { id: f.id || uid(), k: 'med', nen: n.id, prospecte: f.prospecte || null, nom: f.nom.trim(), dosi: f.dosi.trim(), interval: num(f.interval), maxDia: num(f.maxDia), pesRef: num(f.pesRef), nota: f.nota.trim(), actiu: !!f.actiu, by: f.by || ctx.me }, `salut ${n.nom}: medicament ${f.nom.trim()}`);
    onClose();
  };
  const del = () => { if (confirm(`Esborrar ${f.nom}? Les preses apuntades es queden al registre.`)) { ctx.store.remove('salut', f.id, `salut ${n.nom}: esborra medicament`); onClose(); } };
  return html`<${Sheet} title=${m.id ? m.nom : `Nou medicament · ${n.nom}`} onClose=${onClose}
    actions=${html`${m.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Nom"><input value=${f.nom} onInput=${set('nom')} placeholder="Nom comercial o principi actiu" /><//>
    <${Field} label="Dosi" hint="La que us han indicat, tal com la doneu (ml, mg, gotes…)."><input value=${f.dosi} onInput=${set('dosi')} /><//>
    <div class="row2"><${Field} label="Cada quantes hores"><input inputmode="decimal" value=${f.interval} onInput=${set('interval')} /><//><${Field} label="Màxim de preses en 24 h"><input inputmode="numeric" value=${f.maxDia} onInput=${set('maxDia')} /><//></div>
    <${Field} label="Pes amb què es va indicar (kg)" hint="Si el pes canvia molt, l'app us avisarà que la reviseu."><input inputmode="decimal" value=${f.pesRef} onInput=${set('pesRef')} /><//>
    <${Field} label="Notes"><textarea rows="2" value=${f.nota} onInput=${set('nota')} placeholder="Qui l'ha receptat, fins quan, amb menjar o sense…"></textarea><//>
    <label class="check"><input type="checkbox" checked=${f.actiu} onChange=${set('actiu')} /> En ús (si no, queda arxivat i no surt a l'hora d'apuntar una presa)</label>
  <//>`;
}
