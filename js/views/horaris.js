import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, useForm, Empty } from '../ui.js';
import { hhmmToMin, uid, DIES } from '../util.js';
import { senseEscola } from '../calendar.js';

export const DIA_NOMS = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];
export const diaDe = (date) => { const g = date.getDay(); return g === 0 ? 7 : g; };

export function blocsDe(persona, dia) {
  return ctx.store.items('horaris').filter((b) => b.persona === persona && Number(b.dia) === dia)
    .sort((a, b) => a.inici.localeCompare(b.inici));
}

// Agrupa blocs contigus (≤20 min de forat) per fer un resum llegible
export function franges(blocs) {
  const out = [];
  for (const b of blocs) {
    const last = out[out.length - 1];
    if (last && !b.variable && !last.variable && hhmmToMin(b.inici) - hhmmToMin(last.fi) <= 30) { last.fi = b.fi; last.items.push(b); }
    else out.push({ id: b.id, inici: b.inici, fi: b.fi, variable: b.variable, text: b.variable ? b.text : null, items: [b] });
  }
  return out;
}

// Cinta del dia: on és cadascú
export function DayRibbon({ date, ymdStr, compact }) {
  const [sel, setSel] = useState(null);
  const dia = diaDe(date);
  const H0 = 7 * 60, H1 = 20 * 60, span = H1 - H0;
  const pct = (t) => `${((Math.min(Math.max(hhmmToMin(t), H0), H1) - H0) / span) * 100}%`;
  const ara = new Date();
  const esAvui = ymdStr === `${ara.getFullYear()}-${String(ara.getMonth() + 1).padStart(2, '0')}-${String(ara.getDate()).padStart(2, '0')}`;
  const nowMin = ara.getHours() * 60 + ara.getMinutes();
  const hores = [8, 10, 12, 14, 16, 18];
  const estat = (m) => {
    const ll = m.calendariEscolar !== false ? senseEscola(ymdStr, m.id) : null;
    const tots = blocsDe(m.id, dia);
    const amaga = ll && !(ll === 'cap de setmana' && tots.length);
    return { ll: amaga ? ll : null, blocs: amaga ? [] : tots };
  };
  return html`<div class=${'ribbon' + (compact ? ' compact' : '')}>
    <div class="ribbon-axis">
      ${hores.map((h) => html`<span style=${{ left: `${((h * 60 - H0) / span) * 100}%` }}>${h}</span>`)}
    </div>
    ${ctx.membres.map((m) => {
      const { ll, blocs } = estat(m);
      return html`<div class="ribbon-row">
        <span class="ribbon-name" style=${{ color: `color-mix(in srgb, ${m.color} 75%, var(--ink))` }}>${m.nom}</span>
        <div class="ribbon-track">
          ${hores.map((h) => html`<i class="tick" style=${{ left: `${((h * 60 - H0) / span) * 100}%` }}></i>`)}
          ${blocs.length === 0 && html`<span class="ribbon-free">${ll || 'Sense horari'}</span>`}
          ${franges(blocs).map((b) => html`<button class=${'blk' + (b.variable ? ' var' : '') + (sel === b.id ? ' sel' : '')}
              style=${{ left: pct(b.inici), width: `calc(${pct(b.fi)} - ${pct(b.inici)})`, '--c': m.color }}
              title=${b.items.map((x) => `${x.inici}–${x.fi} ${x.text}`).join('\n')} aria-label=${`${m.nom} ${b.inici}–${b.fi}`} onClick=${() => setSel(sel === b.id ? null : b.id)}></button>`)}
          ${esAvui && nowMin > H0 && nowMin < H1 && html`<i class="now" style=${{ left: `${((nowMin - H0) / span) * 100}%` }}></i>`}
        </div>
      </div>`;
    })}
    ${sel && (() => {
      const b0 = ctx.store.items('horaris').find((x) => x.id === sel);
      if (!b0) return null;
      const m = ctx.membres.find((x) => x.id === b0.persona);
      const f = franges(blocsDe(b0.persona, dia)).find((x) => x.id === sel);
      if (!f) return null;
      return html`<div class="ribbon-detail"><b style=${{ color: `color-mix(in srgb, ${m?.color} 75%, var(--ink))` }}>${m?.nom}</b>
        <ul>${f.items.map((b) => html`<li><span>${b.inici}–${b.fi}</span> ${b.text}${b.variable ? ' (variable)' : ''}</li>`)}</ul></div>`;
    })()}
  </div>`;
}

export function ResumHorari({ date, ymdStr }) {
  const dia = diaDe(date);
  return html`<ul class="resum-horari">
    ${ctx.membres.map((m) => {
      const ll = m.calendariEscolar !== false ? senseEscola(ymdStr, m.id) : null;
      const tots = blocsDe(m.id, dia);
      if (ll && !(ll === 'cap de setmana' && tots.length)) return html`<li><span class="dot" style=${{ background: m.color }}></span><b>${m.nom}</b> <span class="muted">${ll}</span></li>`;
      const f = franges(tots);
      return html`<li><span class="dot" style=${{ background: m.color }}></span><b>${m.nom}</b> <span>${f.length ? f.map((x) => `${x.inici}–${x.fi}${x.text ? ` (${x.text.toLowerCase()})` : ''}`).join(', ') : 'lliure'}</span></li>`;
    })}
  </ul>`;
}

// ---------- Vista d'horaris (dins d'Agenda) ----------
export function HorarisView() {
  const avui = new Date();
  const [dia, setDia] = useState(Math.min(diaDe(avui), 5));
  const [persona, setPersona] = useState(null);
  const [edit, setEdit] = useState(null);
  return html`<div>
    <${Seg} value=${dia} onChange=${setDia} options=${[1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: d, label: ['', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'][d] }))} />
    <p class="hint">Toca un bloc per veure'n el detall. Les franges ratllades són variables (tardes rotatòries, etc.).</p>
    <${HorariSetmana} dia=${dia} />
    <div class="sec-head"><h3>Editar horaris</h3></div>
    <div class="chips">${ctx.membres.map((m) => html`<button class=${'chip' + (persona === m.id ? ' on' : '')} style=${{ '--c': m.color }} onClick=${() => setPersona(persona === m.id ? null : m.id)}><span class="dot" style=${{ background: m.color }}></span>${m.nom}</button>`)}</div>
    ${persona && html`<${EditorPersona} persona=${persona} onEdit=${setEdit} />`}
    ${edit && html`<${BlocForm} bloc=${edit} onClose=${() => setEdit(null)} />`}
  </div>`;
}

function HorariSetmana({ dia }) {
  // una data qualsevol amb aquest dia de la setmana (setmana actual)
  const d = new Date();
  const cur = diaDe(d);
  d.setDate(d.getDate() + (dia - cur));
  const ys = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return html`<div class="card"><${DayRibbon} date=${d} ymdStr=${ys} /><${ResumHorari} date=${d} ymdStr=${ys} /></div>`;
}

function EditorPersona({ persona, onEdit }) {
  const m = ctx.membres.find((x) => x.id === persona);
  return html`<div class="card">
    ${[1, 2, 3, 4, 5, 6, 7].map((d) => {
      const bl = blocsDe(persona, d);
      if (!bl.length && d > 5) return null;
      return html`<div class="hor-dia">
        <h4>${DIA_NOMS[d]}</h4>
        ${bl.length === 0 && html`<p class="muted small">Res</p>`}
        ${bl.map((b) => html`<button class="hor-blk" style=${{ '--c': m.color }} onClick=${() => onEdit(b)}><span>${b.inici}–${b.fi}</span> ${b.text}${b.variable ? html` <em>variable</em>` : ''}</button>`)}
      </div>`;
    })}
    <button class="btn" onClick=${() => onEdit({ id: null, persona, dia: 1, inici: '09:00', fi: '10:00', text: '' })}><${Icon} n="plus" size=${16} /> Afegeix franja</button>
  </div>`;
}

function BlocForm({ bloc, onClose }) {
  const [f, set] = useForm({ ...bloc, dia: String(bloc.dia) });
  const save = () => {
    if (!f.inici || !f.fi) return;
    ctx.store.upsert('horaris', { ...f, dia: Number(f.dia), id: f.id || uid() }, `horari de ${f.persona}`);
    onClose();
  };
  const del = () => { ctx.store.remove('horaris', f.id, `treu franja d'horari`); onClose(); };
  return html`<${Sheet} title=${bloc.id ? 'Edita franja' : 'Nova franja'} onClose=${onClose}
    actions=${html`${bloc.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Dia"><select value=${f.dia} onChange=${set('dia')}>${[1, 2, 3, 4, 5, 6, 7].map((d) => html`<option value=${d}>${DIA_NOMS[d]}</option>`)}</select><//>
    <div class="row2"><${Field} label="Inici"><input type="time" value=${f.inici} onInput=${set('inici')} /><//><${Field} label="Final"><input type="time" value=${f.fi} onInput=${set('fi')} /><//></div>
    <${Field} label="Què és"><input value=${f.text} onInput=${set('text')} placeholder="Classe, reunió, escola…" /><//>
    <label class="check"><input type="checkbox" checked=${!!f.variable} onChange=${set('variable')} /> Franja variable (no cada setmana igual)</label>
  <//>`;
}
