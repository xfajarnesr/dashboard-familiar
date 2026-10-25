import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, PersonPicker, Who, Empty, useForm } from '../ui.js';
import { ymd, parseYmd, addDaysYmd, startOfWeek, fmtLlarg, MESOS_CAP, DIES_CURTS, uid, relatiu } from '../util.js';
import { ocurrencies, perDia, CATS, TIPUS_ESCOLAR } from '../calendar.js';
import { HorarisView } from './horaris.js';
import { lsGet, lsSet } from '../util.js';

export function AgendaView({ sub }) {
  const tab = sub || 'calendari';
  return html`<section class="view">
    <header class="view-head"><h1>Agenda</h1></header>
    <${Seg} value=${tab} onChange=${(v) => ctx.nav(`agenda/${v}`)} options=${[{ value: 'calendari', label: 'Calendari' }, { value: 'horaris', label: 'Horaris' }, { value: 'escolar', label: 'Calendari escolar' }]} />
    ${tab === 'calendari' && html`<${Calendari} />`}
    ${tab === 'horaris' && html`<${HorarisView} />`}
    ${tab === 'escolar' && html`<${Escolar} />`}
  </section>`;
}

export function OcRow({ o, onEdit, showDate }) {
  const editable = o.kind === 'event' || o.kind === 'escolar';
  return html`<li class=${'oc oc-' + o.kind} style=${{ '--c': o.color }} onClick=${() => editable && onEdit && onEdit(o)}>
    <span class="oc-time">${showDate ? relatiu(o.date) : o.time || (o.multi ? '' : 'Tot el dia')}${showDate && o.time ? ` ${o.time}` : ''}</span>
    <span class="oc-body"><span class="oc-title">${o.title}${o.anys > 0 && o.ref.mostraAnys ? ` (${o.anys})` : ''}</span>
      ${(o.sub || o.lloc || (o.time && o.timeEnd)) && html`<small class="muted">${[o.time && o.timeEnd ? `fins a les ${o.timeEnd}` : '', o.lloc, o.sub].filter(Boolean).join(' · ')}</small>`}
    </span>
    ${o.qui && html`<${Who} id=${o.qui === 'tots' ? 'tots' : o.qui} small=${true} />`}
  </li>`;
}

function Calendari() {
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(ymd());
  const [edit, setEdit] = useState(null);
  const [barca, setBarca] = useState(lsGet('df.cal.barca', true));
  const ini = ymd(startOfWeek(mes));
  const fiMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const fi = addDaysYmd(ymd(startOfWeek(fiMes)), 6);
  const ocs = ocurrencies(ini, fi, { barca });
  const m = perDia(ocs);
  const dies = [];
  for (let d = ini; d <= fi; d = addDaysYmd(d, 1)) dies.push(d);
  const avui = ymd();
  const delDia = m[sel] || [];
  const propers = ocurrencies(avui, addDaysYmd(avui, 30), { barca }).filter((o) => !(o.multi && !o.first));
  const nou = () => setEdit({ id: null, title: '', date: sel, end: '', time: '', timeEnd: '', qui: [], cat: 'familia', repeat: 'cap', notes: '', lloc: '' });
  const obre = (o) => setEdit(o.kind === 'escolar' ? { ...o.ref, _escolar: true } : o.ref);
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
      <label class="check small"><input type="checkbox" checked=${barca} onChange=${(e) => { setBarca(e.target.checked); lsSet('df.cal.barca', e.target.checked); }} /> Mostra els partits del Barça</label>
    </div>
    <div class="cal-side">
      <div class="sec-head"><h3>${fmtLlarg(sel)}</h3><button class="btn primary sm" onClick=${nou}><${Icon} n="plus" size=${16} /> Afegeix</button></div>
      ${delDia.length === 0 ? html`<p class="muted">Res aquest dia.</p>` : html`<ul class="ocs">${delDia.map((o) => html`<${OcRow} o=${o} onEdit=${obre} />`)}</ul>`}
      <div class="sec-head"><h3>Properes setmanes</h3></div>
      ${propers.length === 0 ? html`<p class="muted">Res previst els propers 30 dies.</p>` : html`<ul class="ocs">${propers.slice(0, 25).map((o) => html`<${OcRow} o=${o} onEdit=${obre} showDate=${true} />`)}</ul>`}
    </div>
    ${edit && (edit._escolar ? html`<${EscolarForm} e=${edit} onClose=${() => setEdit(null)} />` : html`<${EventForm} e=${edit} onClose=${() => setEdit(null)} />`)}
  </div>`;
}

export function EventForm({ e, onClose }) {
  const [f, set, setF] = useForm({ ...e, qui: Array.isArray(e.qui) ? e.qui : e.qui && e.qui !== 'tots' ? [e.qui] : [], end: e.end || '', time: e.time || '', timeEnd: e.timeEnd || '', notes: e.notes || '', lloc: e.lloc || '', repeat: e.repeat || 'cap' });
  const save = () => {
    if (!f.title.trim() || !f.date) return;
    const item = { ...f, title: f.title.trim(), id: f.id || uid(), end: f.end && f.end > f.date ? f.end : null, time: f.time || null, timeEnd: f.timeEnd || null, qui: f.qui.length ? f.qui : 'tots', by: f.by || ctx.me };
    ctx.store.upsert('events', item, `${e.id ? 'edita' : 'afegeix'} ${item.title}`);
    onClose();
  };
  const del = () => { ctx.store.remove('events', f.id, `esborra ${f.title}`); onClose(); };
  return html`<${Sheet} title=${e.id ? 'Esdeveniment' : 'Nou esdeveniment'} onClose=${onClose}
    actions=${html`${e.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Què"><input value=${f.title} onInput=${set('title')} placeholder="Pediatra de l'Hèlia, sopar amb amics…" /><//>
    <div class="row2"><${Field} label="Dia"><input type="date" value=${f.date} onInput=${set('date')} /><//><${Field} label="Fins (opcional)"><input type="date" value=${f.end} onInput=${set('end')} /><//></div>
    <div class="row2"><${Field} label="Hora (opcional)"><input type="time" value=${f.time} onInput=${set('time')} /><//><${Field} label="Fins a"><input type="time" value=${f.timeEnd} onInput=${set('timeEnd')} /><//></div>
    <${Field} label="Qui hi va" hint="Si no en marques cap, és de tota la família."><${PersonPicker} multi=${true} value=${f.qui} onChange=${(v) => setF((x) => ({ ...x, qui: v }))} /><//>
    <${Field} label="Tipus"><div class="chips">${Object.entries(CATS).map(([k, v]) => html`<button type="button" class=${'chip' + (f.cat === k ? ' on' : '')} style=${{ '--c': v.color }} onClick=${() => setF((x) => ({ ...x, cat: k }))}>${v.nom}</button>`)}</div><//>
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
