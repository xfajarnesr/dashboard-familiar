// Racó de frases i fites dels nens: què han dit i què han après, amb l'edat que tenien.
import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, Who, Empty, useForm, nomDe, colorDe } from '../ui.js';
import { ymd, parseYmd, fmtData, uid, edat, MESOS_CAP, lsGet, lsSet } from '../util.js';

const TIPUS = { frase: 'Frase', fita: 'Fita' };
const nens = () => ctx.membres.filter((m) => !m.adult);
const naix = (id) => ctx.membres.find((m) => m.id === id)?.naixement;

// "Avui fa un any…": records del mateix dia d'anys anteriors, per als avisos d'Avui
export function recordsAvui() {
  const avui = ymd();
  return ctx.store.items('records').filter((r) => r.data && r.data.slice(5) === avui.slice(5) && r.data < avui)
    .map((r) => {
      const anys = Number(avui.slice(0, 4)) - Number(r.data.slice(0, 4));
      return { cls: 'record', txt: `Avui fa ${anys === 1 ? 'un any' : `${anys} anys`}, ${nomDe(r.nen)}: ${r.tipus === 'frase' ? `«${r.text}»` : r.text}`, go: 'mes/records' };
    });
}

export function RecordsView({ Back }) {
  const ns = nens();
  const [qui, setQuiS] = useState(lsGet('df.records.qui', 'tots'));
  const setQui = (v) => { setQuiS(v); lsSet('df.records.qui', v); };
  const [edit, setEdit] = useState(null);
  const rs = ctx.store.items('records').filter((r) => qui === 'tots' || r.nen === qui).sort((a, b) => b.data.localeCompare(a.data) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  const grups = [];
  for (const r of rs) {
    const k = r.data.slice(0, 7);
    if (!grups.length || grups[grups.length - 1][0] !== k) grups.push([k, []]);
    grups[grups.length - 1][1].push(r);
  }
  const nou = (tipus) => setEdit({ id: null, nen: qui !== 'tots' ? qui : ns[0]?.id, tipus, data: ymd(), text: '', context: '' });
  return html`<section class="view sec-records">
    <${Back} title="Frases i fites" />
    <div class="btnrow"><button class="btn primary" onClick=${() => nou('frase')}><${Icon} n="quote" size=${16} /> Frase</button><button class="btn" onClick=${() => nou('fita')}><${Icon} n="spark" size=${16} /> Fita</button></div>
    ${ns.length > 1 && html`<${Seg} small=${true} value=${qui} onChange=${setQui} options=${[{ value: 'tots', label: 'Tots' }, ...ns.map((n) => ({ value: n.id, label: n.nom }))]} />`}
    ${rs.length === 0 && html`<${Empty} title="Encara res apuntat" text="Les frases que us fan riure i les primeres vegades (primer pas, primera paraula, primer dia d'escola). D'aquí a uns anys us agradarà rellegir-ho." />`}
    ${grups.map(([k, g]) => html`<div class="rgroup"><h3>${MESOS_CAP[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}</h3>
      <ul class="records">${g.map((r) => html`<li class=${'rec rec-t-' + r.tipus} style=${{ '--c': colorDe(r.nen) }} onClick=${() => setEdit(r)}>
        ${r.tipus === 'frase' ? html`<p class="rec-frase">«${r.text}»</p>` : html`<p class="rec-fita"><${Icon} n="spark" size=${16} /> ${r.text}</p>`}
        ${r.context && html`<p class="muted small">${r.context}</p>`}
        <p class="rec-peu"><span class="dot" style=${{ background: colorDe(r.nen) }}></span>${nomDe(r.nen)}${naix(r.nen) ? `, ${edat(naix(r.nen), r.data)}` : ''} · ${fmtData(r.data)}</p>
      </li>`)}</ul></div>`)}
    ${ns.length > 0 && !ns.some((n) => n.naixement) && rs.length > 0 && html`<p class="hint">Si poses la data de naixement dels nens a Ajustos → Família, cada record mostrarà l'edat que tenien.</p>`}
    ${edit && html`<${RecordForm} r=${edit} onClose=${() => setEdit(null)} />`}
  </section>`;
}

function RecordForm({ r, onClose }) {
  const [f, set, setF] = useForm({ ...r, context: r.context || '' });
  const ns = nens();
  const save = () => {
    if (!f.text.trim() || !f.nen || !f.data) return;
    ctx.store.upsert('records', { id: f.id || uid(), nen: f.nen, tipus: f.tipus, data: f.data, text: f.text.trim().replace(/^[«"]|[»"]$/g, ''), context: f.context.trim(), by: f.by || ctx.me }, `${f.tipus === 'frase' ? 'frase' : 'fita'} de ${nomDe(f.nen)}`);
    onClose();
  };
  const del = () => { ctx.store.remove('records', f.id, 'esborra record'); onClose(); };
  return html`<${Sheet} title=${r.id ? TIPUS[f.tipus] : `Nova ${TIPUS[f.tipus].toLowerCase()}`} onClose=${onClose}
    actions=${html`${r.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="De qui"><div class="chips">${ns.map((n) => html`<button type="button" class=${'chip' + (f.nen === n.id ? ' on' : '')} style=${{ '--c': n.color }} onClick=${() => setF((x) => ({ ...x, nen: n.id }))}><span class="dot" style=${{ background: n.color }}></span>${n.nom}</button>`)}</div><//>
    <${Field} label="Què és"><div class="chips">${Object.entries(TIPUS).map(([k, v]) => html`<button type="button" class=${'chip' + (f.tipus === k ? ' on' : '')} onClick=${() => setF((x) => ({ ...x, tipus: k }))}>${v}</button>`)}</div><//>
    <${Field} label=${f.tipus === 'frase' ? 'Què ha dit' : 'Què ha passat'}><textarea rows="3" value=${f.text} onInput=${set('text')} placeholder=${f.tipus === 'frase' ? 'Tal com ho ha dit, amb les seves paraules' : 'Ha caminat sola fins a la porta'}></textarea><//>
    <${Field} label="Context (opcional)"><input value=${f.context} onInput=${set('context')} placeholder=${f.tipus === 'frase' ? 'Sopant, quan li hem dit que plouria…' : 'A casa dels avis'} /><//>
    <${Field} label="Dia"><input type="date" value=${f.data} onInput=${set('data')} /><//>
    ${naix(f.nen) && f.data && html`<p class="hint">Tenia ${edat(naix(f.nen), f.data)}.</p>`}
  <//>`;
}
