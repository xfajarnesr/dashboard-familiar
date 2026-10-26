import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, PersonPicker, Who, Empty, useForm, nomDe, colorDe } from '../ui.js';
import { ymd, parseYmd, addDaysYmd, startOfWeek, fmtLlarg, fmtCurt, daysBetween, MESOS_CAP, DIES_CURTS, uid, relatiu, hhmmToMin } from '../util.js';
import { ocurrencies, perDia, CATS, TIPUS_ESCOLAR } from '../calendar.js';
import { HorarisView, blocsDe, diaDe } from './horaris.js';
import { lsGet, lsSet } from '../util.js';

export function AgendaView({ sub }) {
  const tab = sub || 'calendari';
  return html`<section class="view sec-agenda">
    <header class="view-head"><h1>Agenda</h1></header>
    <${Seg} value=${tab} onChange=${(v) => ctx.nav(`agenda/${v}`)} options=${[{ value: 'calendari', label: 'Calendari' }, { value: 'horaris', label: 'Horaris' }, { value: 'escolar', label: 'Calendari escolar' }]} />
    ${tab === 'calendari' && html`<${Calendari} />`}
    ${tab === 'horaris' && html`<${HorarisView} />`}
    ${tab === 'escolar' && html`<${Escolar} />`}
  </section>`;
}

export function OcRow({ o, onEdit, showDate }) {
  const editable = o.kind === 'event' || o.kind === 'escolar' || o.kind === 'aniv' || o.kind === 'horari';
  return html`<li class=${'oc oc-' + o.kind + (o.tipusData ? ' oc-t-' + o.tipusData : '')} style=${{ '--c': o.color }} onClick=${() => editable && onEdit && onEdit(o)}>
    <span class="oc-time">${showDate ? (daysBetween(ymd(), o.date) < 7 ? relatiu(o.date) : fmtCurt(o.date)) : o.time || (o.multi ? '' : 'Tot el dia')}${showDate && o.time ? ` ${o.time}` : ''}</span>
    <span class="oc-body"><span class="oc-title">${o.priv && html`<span class="priv" title=${o.priv === 'jo' ? 'Només ho veus tu' : "L'altre hi veu «ocupat»"}><${Icon} n="lock" size=${13} stroke=${2.2} /></span>`}${o.title}${o.anys > 0 && o.ref.mostraAnys ? ` (${o.anys})` : ''}</span>
      ${(o.sub || o.lloc || (o.time && o.timeEnd)) && html`<small class="muted">${[o.time && o.timeEnd ? `fins a les ${o.timeEnd}` : '', o.lloc, o.sub].filter(Boolean).join(' · ')}</small>`}
    </span>
    ${o.qui && html`<${Who} id=${o.qui === 'tots' ? 'tots' : o.qui} small=${true} />`}
  </li>`;
}

// Llista d'ocurrències que plega la feina de l'altre adult (2 o més el mateix dia) en una sola línia.
// Es pot desactivar a Ajustos (df.plegaFeina, per dispositiu).
export function OcList({ ocs, onEdit, showDate }) {
  const [obert, setObert] = useState({});
  const plega = lsGet('df.plegaFeina', true);
  const out = [];
  const grups = {};
  for (const o of ocs) {
    const by = o.kind === 'event' && o.ref?.cat === 'feina' && o.ref.by && o.ref.by !== ctx.me ? o.ref.by : null;
    if (!plega || !by) { out.push(o); continue; }
    const k = `${o.date}|${by}`;
    if (!grups[k]) { grups[k] = { fold: true, key: k, date: o.date, by, items: [] }; out.push(grups[k]); }
    grups[k].items.push(o);
  }
  const row = (o) => html`<${OcRow} o=${o} onEdit=${onEdit} showDate=${showDate} />`;
  return html`<ul class="ocs">${out.map((x) => {
    if (!x.fold) return row(x);
    if (x.items.length < 2) return x.items.map(row);
    const open = obert[x.key];
    return html`<li class="oc oc-fold" style=${{ '--c': colorDe(x.by) }} onClick=${() => setObert((s) => ({ ...s, [x.key]: !open }))} aria-expanded=${!!open}>
        <span class="oc-time">${showDate ? (daysBetween(ymd(), x.date) < 7 ? relatiu(x.date) : fmtCurt(x.date)) : 'Feina'}</span>
        <span class="oc-body"><span class="oc-title">${x.items.length} coses de feina de ${nomDe(x.by)}</span><small class="muted">${open ? 'Toca per plegar-les' : 'Toca per veure-les'}</small></span>
        <span class="fold-arrow">${open ? '▴' : '▾'}</span>
      </li>${open && x.items.map(row)}`;
  })}</ul>`;
}

function Calendari() {
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(ymd());
  const [edit, setEdit] = useState(null);
  const [barca, setBarca] = useState(lsGet('df.cal.barca', true));
  const [femeni, setFemeni] = useState(lsGet('df.cal.femeni', false));
  const ini = ymd(startOfWeek(mes));
  const fiMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const fi = addDaysYmd(ymd(startOfWeek(fiMes)), 6);
  const ocs = ocurrencies(ini, fi, { barca, femeni });
  const m = perDia(ocs);
  const dies = [];
  for (let d = ini; d <= fi; d = addDaysYmd(d, 1)) dies.push(d);
  const avui = ymd();
  const delDia = m[sel] || [];
  const propers = ocurrencies(avui, addDaysYmd(avui, 30), { barca, femeni }).filter((o) => !(o.multi && !o.first));
  const nou = () => setEdit({ id: null, title: '', date: sel, end: '', time: '', timeEnd: '', qui: [], cat: 'familia', repeat: 'cap', notes: '', lloc: '' });
  const obre = (o) => (o.kind === 'aniv' ? ctx.nav('mes/aniversaris') : o.kind === 'horari' ? ctx.nav('agenda/horaris') : setEdit(o.kind === 'escolar' ? { ...o.ref, _escolar: true } : o.ref));
  return html`<div class="cal-wrap">
    <div class="cal">
      <div class="weeknav">
        <button class="icon-btn" aria-label="Mes anterior" onClick=${() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><${Icon} n="left" /></button>
        <b>${MESOS_CAP[mes.getMonth()]} ${mes.getFullYear()}</b>
        <button class="icon-btn" aria-label="Mes següent" onClick=${() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><${Icon} n="right" /></button>
      </div>
      <div class="cal-grid">
        ${[1, 2, 3, 4, 5, 6, 0].map((i) => html`<span class="cal-dow">${DIES_CURTS[i]}</span>`)}
        ${dies.map((d) => {
          const os = m[d] || [];
          const fora = parseYmd(d).getMonth() !== mes.getMonth();
          const lliure = os.find((o) => o.kind === 'escolar' && o.tipus !== 'curs');
          return html`<button class=${'cal-day' + (fora ? ' out' : '') + (d === avui ? ' today' : '') + (d === sel ? ' sel' : '') + (lliure ? ' lliure' : '')}
              style=${lliure ? { '--lc': lliure.color } : null} onClick=${() => setSel(d)} aria-label=${fmtLlarg(d)}>
            <span class="n">${parseYmd(d).getDate()}</span>
            <span class="marks">${os.filter((o) => o.kind !== 'escolar' || o.tipus === 'curs').slice(0, 4).map((o) => html`<i style=${{ background: o.color }}></i>`)}</span>
          </button>`;
        })}
      </div>
      <label class="check small"><input type="checkbox" checked=${barca} onChange=${(e) => { setBarca(e.target.checked); lsSet('df.cal.barca', e.target.checked); }} /> Partits del Barça</label>
      ${barca && html`<label class="check small"><input type="checkbox" checked=${femeni} onChange=${(e) => { setFemeni(e.target.checked); lsSet('df.cal.femeni', e.target.checked); }} /> També el Barça Femení</label>`}
    </div>
    <div class="cal-side">
      <div class="sec-head"><h3>${fmtLlarg(sel)}</h3><button class="btn primary sm" onClick=${nou}><${Icon} n="plus" size=${16} /> Afegeix</button></div>
      ${delDia.length === 0 ? html`<p class="muted">Res aquest dia.</p>` : html`<${OcList} ocs=${delDia} onEdit=${obre} />`}
      <div class="sec-head"><h3>Properes setmanes</h3></div>
      ${propers.length === 0 ? html`<p class="muted">Res previst els propers 30 dies.</p>` : html`<${OcList} ocs=${propers.slice(0, 25)} onEdit=${obre} showDate=${true} />`}
    </div>
    ${edit && (edit._escolar ? html`<${EscolarForm} e=${edit} onClose=${() => setEdit(null)} />` : html`<${EventForm} e=${edit} onClose=${() => setEdit(null)} />`)}
  </div>`;
}

// Visibilitat proposada per a un esdeveniment nou: la feina sense hora (un examen, enviar correus)
// només la veu qui la crea; amb hora dins del propi horari, també; fora de l'horari, l'altre hi veu «ocupat».
function dinsHorari(date, time, timeEnd) {
  if (!date || !time || !ctx.me) return false;
  const t0 = hhmmToMin(time), t1 = hhmmToMin(timeEnd || time);
  return blocsDe(ctx.me, diaDe(parseYmd(date)), date).some((b) => t0 >= hhmmToMin(b.inici) && t1 <= hhmmToMin(b.fi));
}
function visProposada(f) {
  if (f.cat !== 'feina') return 'tots';
  if (!f.time) return 'jo';
  return dinsHorari(f.date, f.time, f.timeEnd) ? 'jo' : 'ocupat';
}
const VIS = { tots: 'Tothom', ocupat: 'Els altres: «ocupat»', jo: 'Només jo' };

export function EventForm({ e, onClose }) {
  const [f, set, setF] = useForm({ ...e, qui: Array.isArray(e.qui) ? e.qui : e.qui && e.qui !== 'tots' ? [e.qui] : [], end: e.end || '', time: e.time || '', timeEnd: e.timeEnd || '', notes: e.notes || '', lloc: e.lloc || '', repeat: e.repeat || 'cap', vis: e.vis || 'tots' });
  const [visTocat, setVisTocat] = useState(!!e.id);
  const meu = !f.by || f.by === ctx.me;
  // mentre no la triïs a mà, la visibilitat segueix el tipus, l'hora i el teu horari
  const vis = meu ? (visTocat ? f.vis : visProposada(f)) : f.vis;
  const visOk = vis === 'ocupat' && !f.time ? 'jo' : vis;
  const altres = ctx.membres.filter((m) => m.adult && m.id !== ctx.me).map((m) => m.nom).join(' i ') || "L'altre";
  const save = () => {
    if (!f.title.trim() || !f.date) return;
    const qui = f.qui.length ? f.qui : visOk !== 'tots' && ctx.me ? [ctx.me] : 'tots';
    const item = { ...f, title: f.title.trim(), id: f.id || uid(), end: f.end && f.end > f.date ? f.end : null, time: f.time || null, timeEnd: f.timeEnd || null, qui, by: f.by || ctx.me, vis: visOk };
    ctx.store.upsert('events', item, visOk === 'tots' ? `${e.id ? 'edita' : 'afegeix'} ${item.title}` : `${e.id ? 'edita' : 'afegeix'} esdeveniment personal`);
    onClose();
  };
  const del = () => { ctx.store.remove('events', f.id, f.vis && f.vis !== 'tots' ? 'esborra esdeveniment personal' : `esborra ${f.title}`); onClose(); };
  const triaVis = (v) => { setVisTocat(true); setF((x) => ({ ...x, vis: v })); };
  const hora = f.time ? `${f.time}${f.timeEnd ? `–${f.timeEnd}` : ''}` : '';
  const visHint = visOk === 'tots' ? 'Tothom en veu el títol i els detalls.'
    : visOk === 'jo' ? `Només surt al teu calendari. ${altres} no en veu res.`
    : `${altres} hi veurà «${nomDe(ctx.me)} ocupat» ${hora}, sense el títol.`;
  return html`<${Sheet} title=${e.id ? 'Esdeveniment' : 'Nou esdeveniment'} onClose=${onClose}
    actions=${html`${e.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Què"><input value=${f.title} onInput=${set('title')} placeholder="Pediatra de l'Hèlia, sopar amb amics…" /><//>
    <div class="row2"><${Field} label="Dia"><input type="date" value=${f.date} onInput=${set('date')} /><//><${Field} label="Fins (opcional)"><input type="date" value=${f.end} onInput=${set('end')} /><//></div>
    <div class="row2"><${Field} label="Hora (opcional)"><input type="time" value=${f.time} onInput=${set('time')} /><//><${Field} label="Fins a"><input type="time" value=${f.timeEnd} onInput=${set('timeEnd')} /><//></div>
    <${Field} label="Tipus"><div class="chips">${Object.entries(CATS).map(([k, v]) => html`<button type="button" class=${'chip' + (f.cat === k ? ' on' : '')} style=${{ '--c': v.color }} onClick=${() => setF((x) => ({ ...x, cat: k }))}>${v.nom}</button>`)}</div><//>
    ${meu && html`<${Field} label="Qui ho veu" hint=${visHint + (!f.time ? ' Sense hora no cal «ocupat»: o ho veu tothom o només tu.' : '')}>
      <div class="chips">${Object.entries(VIS).filter(([k]) => k !== 'ocupat' || f.time).map(([k, v]) => html`<button type="button" class=${'chip' + (visOk === k ? ' on' : '')} onClick=${() => triaVis(k)}>${k !== 'tots' && html`<${Icon} n="lock" size=${13} />`}${v}</button>`)}</div><//>`}
    ${!meu && f.vis && f.vis !== 'tots' && html`<p class="hint">Aquest esdeveniment és de ${nomDe(f.by)}.</p>`}
    <${Field} label="Qui hi va" hint="Si no en marques cap, és de tota la família."><${PersonPicker} multi=${true} value=${f.qui} onChange=${(v) => setF((x) => ({ ...x, qui: v }))} /><//>
    <${Field} label="Es repeteix"><select value=${f.repeat} onChange=${set('repeat')}><option value="cap">No</option><option value="setmanal">Cada setmana</option><option value="anual">Cada any (aniversaris…)</option></select><//>
    ${f.repeat === 'anual' && html`<label class="check"><input type="checkbox" checked=${!!f.mostraAnys} onChange=${set('mostraAnys')} /> Mostra quants anys fa</label>`}
    <${Field} label="Lloc"><input value=${f.lloc} onInput=${set('lloc')} /><//>
    <${Field} label="Notes"><textarea rows="2" value=${f.notes} onInput=${set('notes')}></textarea><//>
  <//>`;
}

function Escolar() {
  const [edit, setEdit] = useState(null);
  const items = ctx.store.items('escolar').slice().sort((a, b) => a.date.localeCompare(b.date));
  const avui = ymd();
  return html`<div>
    <p class="hint">Calendari escolar general de Catalunya 2026-27. Afegiu-hi els dies de lliure disposició de cada escola quan els tingueu (es mostraran a l'agenda i als horaris).</p>
    <button class="btn primary" onClick=${() => setEdit({ id: null, title: '', date: avui, end: '', tipus: 'lliure', qui: [] })}><${Icon} n="plus" size=${16} /> Afegeix dia o període</button>
    <ul class="ocs">${items.map((e) => html`<li class=${'oc' + ((e.end || e.date) < avui ? ' past' : '')} style=${{ '--c': TIPUS_ESCOLAR[e.tipus]?.color }} onClick=${() => setEdit(e)}>
      <span class="oc-time">${parseYmd(e.date).getDate()} ${MESOS_CAP[parseYmd(e.date).getMonth()].slice(0, 3).toLowerCase()}${e.end ? `–${parseYmd(e.end).getDate()} ${MESOS_CAP[parseYmd(e.end).getMonth()].slice(0, 3).toLowerCase()}` : ''}</span>
      <span class="oc-body"><span class="oc-title">${e.title}</span><small class="muted">${TIPUS_ESCOLAR[e.tipus]?.nom}${e.nota ? ' · ' + e.nota : ''}</small></span>
      ${e.qui && e.qui.length ? html`<${Who} id=${e.qui} small=${true} />` : ''}
    </li>`)}</ul>
    ${edit && html`<${EscolarForm} e=${edit} onClose=${() => setEdit(null)} />`}
  </div>`;
}

function EscolarForm({ e, onClose }) {
  const [f, set, setF] = useForm({ ...e, end: e.end || '', qui: e.qui || [], nota: e.nota || '' });
  const save = () => {
    if (!f.title.trim()) return;
    const { _escolar, ...rest } = f;
    ctx.store.upsert('escolar', { ...rest, id: f.id || uid(), end: f.end && f.end > f.date ? f.end : null }, `calendari escolar: ${f.title}`);
    onClose();
  };
  const del = () => { ctx.store.remove('escolar', f.id, `treu ${f.title}`); onClose(); };
  return html`<${Sheet} title="Calendari escolar" onClose=${onClose}
    actions=${html`${e.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Nom"><input value=${f.title} onInput=${set('title')} placeholder="Lliure disposició El Farell" /><//>
    <div class="row2"><${Field} label="Dia"><input type="date" value=${f.date} onInput=${set('date')} /><//><${Field} label="Fins (opcional)"><input type="date" value=${f.end} onInput=${set('end')} /><//></div>
    <${Field} label="Tipus"><select value=${f.tipus} onChange=${set('tipus')}>${Object.entries(TIPUS_ESCOLAR).map(([k, v]) => html`<option value=${k}>${v.nom}</option>`)}</select><//>
    <${Field} label="Afecta" hint="Deixa-ho buit si afecta tothom."><${PersonPicker} multi=${true} value=${f.qui} onChange=${(v) => setF((x) => ({ ...x, qui: v }))} /><//>
    <${Field} label="Nota"><input value=${f.nota} onInput=${set('nota')} /><//>
  <//>`;
}
