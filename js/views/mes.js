import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, PersonPicker, Who, Empty, useForm, nomDe, colorDe } from '../ui.js';
import { ymd, parseYmd, fmtData, fmtLlarg, daysBetween, uid, relatiu, lsGet, lsSet } from '../util.js';

export function MesView({ sub, onLogout }) {
  if (sub === 'regals') return html`<${Regals} />`;
  if (sub === 'documents') return html`<${Documents} />`;
  if (sub === 'barca') return html`<${Barca} />`;
  if (sub === 'ajustos') return html`<${Ajustos} onLogout=${onLogout} />`;
  const docsAvis = ctx.store.items('documents').filter((d) => d.caducitat && daysBetween(ymd(), d.caducitat) <= 90).length;
  const regals = ctx.store.items('regals').filter((r) => r.estat !== 'donat' && visible(r)).length;
  const tiles = [
    ['regals', 'gift', 'Idees de regals', regals ? `${regals} idees obertes` : 'Apunta-les quan surtin'],
    ['documents', 'doc', 'Documents', docsAvis ? `${docsAvis} caduquen aviat` : 'Dates de caducitat'],
    ['barca', 'ball', 'Barça', 'Calendari i resultats'],
    ['ajustos', 'gear', 'Ajustos', 'Família, connexió, còpia'],
  ];
  return html`<section class="view">
    <header class="view-head"><h1>Més</h1></header>
    <div class="tiles">${tiles.map(([k, ic, t, s]) => html`<button class="tile" onClick=${() => ctx.nav(`mes/${k}`)}><${Icon} n=${ic} size=${26} /><span><b>${t}</b><small>${s}</small></span></button>`)}</div>
  </section>`;
}

function Back({ title, children }) {
  return html`<header class="view-head"><button class="icon-btn" aria-label="Enrere" onClick=${() => ctx.nav('mes')}><${Icon} n="left" /></button><h1>${title}</h1>${children}</header>`;
}

// ---------- Regals ----------
const OCASIONS = ['Aniversari', 'Nadal', 'Reis', 'Sant Jordi', 'Sant Valentí', 'Altres'];
const ESTATS = { idea: 'Idea', comprat: 'Comprat', donat: 'Donat' };
const visible = (r) => !r.amagat || r.by === ctx.me;

function Regals() {
  const [edit, setEdit] = useState(null);
  const [filtre, setFiltre] = useState('obertes');
  let rs = ctx.store.items('regals').filter(visible);
  rs = filtre === 'obertes' ? rs.filter((r) => r.estat !== 'donat') : rs.filter((r) => r.estat === 'donat');
  const per = {};
  for (const r of rs) (per[r.per || 'Sense persona'] ||= []).push(r);
  const noms = Object.keys(per).sort((a, b) => nomDe(a).localeCompare(nomDe(b)));
  return html`<section class="view">
    <${Back} title="Idees de regals"><button class="btn primary sm" onClick=${() => setEdit({ id: null, per: '', ocasio: 'Aniversari', idea: '', enllac: '', preu: '', estat: 'idea', amagat: false })}><${Icon} n="plus" size=${16} /> Idea</button><//>
    <${Seg} small=${true} value=${filtre} onChange=${setFiltre} options=${[{ value: 'obertes', label: 'Pendents' }, { value: 'donats', label: 'Ja donats' }]} />
    ${rs.length === 0 && html`<${Empty} title="Cap idea apuntada" text="Quan algú digui «m'agradaria…», apunta-ho aquí. Pots amagar una idea perquè només la vegis tu." />`}
    ${noms.map((n) => html`<div class="lgroup"><h3><span class="dot" style=${{ background: colorDe(n) }}></span> ${nomDe(n)}</h3>
      <ul class="items">${per[n].map((r) => html`<li class="item" onClick=${() => setEdit(r)}>
        <span class="item-txt">${r.idea}<small class="muted"> · ${r.ocasio}${r.preu ? ` · ${r.preu} €` : ''}${r.amagat ? ' · amagat' : ''}</small></span>
        <span class=${'tag ' + r.estat}>${ESTATS[r.estat]}</span>
      </li>`)}</ul></div>`)}
    ${edit && html`<${RegalForm} r=${edit} onClose=${() => setEdit(null)} />`}
  </section>`;
}

function RegalForm({ r, onClose }) {
  const esMembre = ctx.membres.some((m) => m.id === r.per);
  const [f, set, setF] = useForm({ ...r, altre: esMembre ? '' : r.per || '' });
  const save = () => {
    if (!f.idea.trim()) return;
    const { altre, ...rest } = f;
    const per = ctx.membres.some((m) => m.id === f.per) ? f.per : altre.trim();
    ctx.store.upsert('regals', { ...rest, per, idea: f.idea.trim(), id: f.id || uid(), by: f.by || ctx.me }, f.amagat ? 'idea de regal' : `idea de regal per a ${nomDe(per) || 'algú'}`);
    onClose();
  };
  const del = () => { ctx.store.remove('regals', f.id, 'esborra idea de regal'); onClose(); };
  return html`<${Sheet} title=${r.id ? 'Idea de regal' : 'Nova idea'} onClose=${onClose}
    actions=${html`${r.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Què"><input value=${f.idea} onInput=${set('idea')} placeholder="Bicicleta sense pedals" /><//>
    <${Field} label="Per a qui"><${PersonPicker} incloureTots=${false} value=${f.per} onChange=${(v) => setF((x) => ({ ...x, per: v, altre: '' }))} />
      <input value=${f.altre} onInput=${(e) => setF((x) => ({ ...x, altre: e.target.value, per: '' }))} placeholder="…o una altra persona (avis, tiets, amics)" /><//>
    <${Field} label="Ocasió"><div class="chips">${OCASIONS.map((o) => html`<button type="button" class=${'chip' + (f.ocasio === o ? ' on' : '')} onClick=${() => setF((x) => ({ ...x, ocasio: o }))}>${o}</button>`)}</div><//>
    <div class="row2"><${Field} label="Preu aprox. (€)"><input inputmode="decimal" value=${f.preu} onInput=${set('preu')} /><//>
      <${Field} label="Estat"><select value=${f.estat} onChange=${set('estat')}>${Object.entries(ESTATS).map(([k, v]) => html`<option value=${k}>${v}</option>`)}</select><//></div>
    <${Field} label="Enllaç"><input type="url" value=${f.enllac} onInput=${set('enllac')} placeholder="https://…" /><//>
    ${f.enllac && html`<a class="linkbtn" href=${f.enllac} target="_blank" rel="noopener">Obre l'enllaç</a>`}
    <label class="check"><input type="checkbox" checked=${!!f.amagat} onChange=${set('amagat')} /> Amaga aquesta idea a l'altre (per a regals sorpresa)</label>
    ${f.amagat && html`<p class="hint">L'app no la mostra a l'altra persona, però queda guardada al mateix repo. És discreta, no secreta.</p>`}
  <//>`;
}

// ---------- Documents ----------
const TIPUS_DOC = ['DNI', 'Passaport', 'Targeta sanitària', 'Carnet de conduir', 'Targeta de família nombrosa', 'ITV del cotxe', 'Assegurança del cotxe', 'Assegurança de la llar', 'Revisió de la caldera', 'Altres'];
export function estatDoc(d) {
  if (!d.caducitat) return { cls: 'ok', txt: 'sense data' };
  const n = daysBetween(ymd(), d.caducitat);
  if (n < 0) return { cls: 'err', txt: `caducat fa ${-n} dies`, n };
  if (n <= 30) return { cls: 'err', txt: n === 0 ? 'caduca avui' : `caduca d'aquí a ${n} dies`, n };
  if (n <= 90) return { cls: 'warn', txt: `caduca d'aquí a ${n} dies`, n };
  return { cls: 'ok', txt: `fins al ${fmtData(d.caducitat)}`, n };
}

function Documents() {
  const [edit, setEdit] = useState(null);
  const ds = ctx.store.items('documents').slice().sort((a, b) => (a.caducitat || '9999').localeCompare(b.caducitat || '9999'));
  return html`<section class="view">
    <${Back} title="Documents"><button class="btn primary sm" onClick=${() => setEdit({ id: null, tipus: 'DNI', persona: ctx.me, caducitat: '', notes: '' })}><${Icon} n="plus" size=${16} /> Afegeix</button><//>
    <p class="hint">Només el tipus i la data de caducitat. No hi poseu números de document: avisarem a 90, 30 i 7 dies.</p>
    ${ds.length === 0 && html`<${Empty} title="Encara no hi ha cap document" text="Comenceu pels DNI, passaports i targetes sanitàries de tots quatre." action=${html`<div class="chips">${['DNI', 'Passaport', 'Targeta sanitària', 'ITV del cotxe'].map((t) => html`<button class="chip" onClick=${() => setEdit({ id: null, tipus: t, persona: ctx.me, caducitat: '', notes: '' })}>+ ${t}</button>`)}</div>`} />`}
    <ul class="items docs">${ds.map((d) => {
      const e = estatDoc(d);
      return html`<li class=${'item doc ' + e.cls} onClick=${() => setEdit(d)}>
        <span class="item-txt"><b>${d.tipus}</b>${d.persona ? html` <span style=${{ color: colorDe(d.persona) }}>${nomDe(d.persona)}</span>` : ''}<small class="muted">${d.notes ? ` · ${d.notes}` : ''}</small></span>
        <span class=${'doc-st ' + e.cls}>${e.txt}</span>
      </li>`;
    })}</ul>
    ${edit && html`<${DocForm} d=${edit} onClose=${() => setEdit(null)} />`}
  </section>`;
}

function DocForm({ d, onClose }) {
  const [f, set, setF] = useForm({ ...d, notes: d.notes || '' });
  const save = () => {
    if (!f.caducitat) return ctx.toast('Posa la data de caducitat');
    ctx.store.upsert('documents', { ...f, id: f.id || uid() }, `document: ${f.tipus}`);
    onClose();
  };
  const del = () => { ctx.store.remove('documents', f.id, `treu document: ${f.tipus}`); onClose(); };
  return html`<${Sheet} title=${d.id ? 'Document' : 'Nou document'} onClose=${onClose}
    actions=${html`${d.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Tipus"><select value=${TIPUS_DOC.includes(f.tipus) ? f.tipus : 'Altres'} onChange=${set('tipus')}>${TIPUS_DOC.map((t) => html`<option>${t}</option>`)}</select>
      ${!TIPUS_DOC.slice(0, -1).includes(f.tipus) && html`<input value=${f.tipus === 'Altres' ? '' : f.tipus} onInput=${(e) => setF((x) => ({ ...x, tipus: e.target.value || 'Altres' }))} placeholder="Quin document?" />`}<//>
    <${Field} label="De qui"><${PersonPicker} value=${f.persona} onChange=${(v) => setF((x) => ({ ...x, persona: v }))} /><//>
    <${Field} label="Caduca el"><input type="date" value=${f.caducitat} onInput=${set('caducitat')} /><//>
    <${Field} label="Notes" hint="Per exemple: on es renova o si cal cita prèvia. Sense números."><input value=${f.notes} onInput=${set('notes')} /><//>
  <//>`;
}

// ---------- Barça ----------
export function partitsBarca() {
  const b = ctx.store.get('barca');
  return (b?.partits || []).slice().sort((a, c) => a.data.localeCompare(c.data));
}
function Barca() {
  const [eq, setEq] = useState(lsGet('df.barca.eq', 'masculi'));
  const b = ctx.store.get('barca');
  const tots = partitsBarca().filter((p) => eq === 'tots' || (p.equip || 'masculi') === eq);
  const ara = new Date().toISOString();
  const propers = tots.filter((p) => p.data >= ara || p.estat === 'en joc').slice(0, 12);
  const resultats = tots.filter((p) => p.data < ara && p.resultat).slice(-6).reverse();
  return html`<section class="view">
    <${Back} title="Barça" />
    <${Seg} small=${true} value=${eq} onChange=${(v) => { setEq(v); lsSet('df.barca.eq', v); }} options=${[{ value: 'masculi', label: 'Masculí' }, { value: 'femeni', label: 'Femení' }, { value: 'tots', label: 'Tots' }]} />
    ${!b && html`<${Empty} title="Encara no hi ha partits" text="Un procés automàtic els actualitza cada 6 hores al repo de dades. Si falla, ho veuràs aquí." />`}
    ${propers.length > 0 && html`<div class="lgroup"><h3>Propers partits</h3><ul class="matches">${propers.map((p) => html`<${Partit} p=${p} />`)}</ul></div>`}
    ${resultats.length > 0 && html`<div class="lgroup"><h3>Últims resultats</h3><ul class="matches">${resultats.map((p) => html`<${Partit} p=${p} />`)}</ul></div>`}
    ${b?.actualitzat && html`<p class="hint">Actualitzat ${new Date(b.actualitzat).toLocaleString('ca', { dateStyle: 'short', timeStyle: 'short' })}. Font: ESPN. <a href="https://www.fcbarcelona.cat/ca/futbol/primer-equip/calendari" target="_blank" rel="noopener">Calendari oficial</a></p>`}
  </section>`;
}
export function Partit({ p }) {
  const d = new Date(p.data);
  const dia = ymd(d);
  const hora = d.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
  return html`<li class="match">
    <span class="m-when"><b>${relatiu(dia)}</b><small>${fmtLlarg(dia).split(' ').slice(1).join(' ')}${p.resultat ? '' : ` · ${hora}`}</small></span>
    <span class="m-teams"><span class=${p.local.includes('Barcelona') ? 'fcb' : ''}>${p.local}</span>${p.resultat ? html`<b class="m-score">${p.resultat}</b>` : html`<span class="muted"> – </span>`}<span class=${p.visitant.includes('Barcelona') ? 'fcb' : ''}>${p.visitant}</span></span>
    <small class="m-comp">${p.competicio}${p.equip === 'femeni' ? ' · Femení' : ''}</small>
  </li>`;
}

// ---------- Ajustos ----------
function Ajustos({ onLogout }) {
  const s = ctx.store;
  const cfg = s.get('config') || {};
  const [edit, setEdit] = useState(null);
  const backup = () => {
    const blob = new Blob([JSON.stringify(s.data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dashboard-familiar-${ymd()}.json`;
    a.click();
  };
  const conn = lsGet('df.conn') || {};
  return html`<section class="view">
    <${Back} title="Ajustos" />
    <div class="card">
      <h3>Qui ets en aquest dispositiu</h3>
      <${PersonPicker} incloureTots=${false} nomesAdults=${true} value=${ctx.me} onChange=${(v) => { lsSet('df.me', v); location.reload(); }} />
      <p class="hint">Serveix per al filtre «Meves» de les tasques i per signar els canvis.</p>
    </div>
    <div class="card">
      <h3>Família</h3>
      <ul class="items">${(cfg.membres || []).map((m) => html`<li class="item" onClick=${() => setEdit(m)}><span class="dot" style=${{ background: m.color }}></span><span class="item-txt">${m.nom}${m.escola ? html`<small class="muted"> · ${m.escola}${m.curs ? ` (${m.curs})` : ''}</small>` : ''}</span><${Icon} n="edit" size=${16} /></li>`)}</ul>
    </div>
    <div class="card">
      <h3>Sincronització</h3>
      <p>${conn.demo ? 'Mode demostració: les dades només són en aquest navegador.' : html`Dades a <b>${conn.owner}/${conn.repo}</b> (privat).`}</p>
      <p class="hint">Darrera sincronització: ${s.lastSync ? new Date(s.lastSync).toLocaleString('ca') : 'mai'}. Canvis pendents: ${s.pending.length}.${s.error ? ` Error: ${s.error}` : ''}</p>
      <div class="btnrow"><button class="btn" onClick=${() => s.refresh()}><${Icon} n="refresh" size=${16} /> Sincronitza ara</button>
        <button class="btn" onClick=${backup}>Descarrega còpia (JSON)</button>
        <button class="btn ghost danger" onClick=${() => { if (confirm("Desconnectar aquest dispositiu? Hauràs de tornar a enganxar el token.")) onLogout(); }}>Desconnecta</button></div>
    </div>
    <div class="card">
      <h3>Ubicació del temps</h3>
      <p>${cfg.ubicacio?.nom || 'Caldes de Montbui'} <span class="muted small">(${cfg.ubicacio?.lat}, ${cfg.ubicacio?.lon})</span></p>
    </div>
    ${edit && html`<${MembreForm} m=${edit} onClose=${() => setEdit(null)} />`}
  </section>`;
}

function MembreForm({ m, onClose }) {
  const [f, set] = useForm({ ...m, escola: m.escola || '', curs: m.curs || '' });
  const save = () => {
    const cfg = ctx.store.get('config') || {};
    const membres = (cfg.membres || []).map((x) => (x.id === m.id ? { ...x, ...f } : x));
    ctx.store.mutate('config', { t: 'patch', value: { membres } }, `edita ${f.nom}`);
    onClose();
  };
  return html`<${Sheet} title=${m.nom} onClose=${onClose} actions=${html`<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Nom"><input value=${f.nom} onInput=${set('nom')} /><//>
    <${Field} label="Color"><input type="color" value=${f.color} onInput=${set('color')} /><//>
    ${!m.adult && html`<${Field} label="Escola"><input value=${f.escola} onInput=${set('escola')} /><//><${Field} label="Curs"><input value=${f.curs} onInput=${set('curs')} /><//>`}
  <//>`;
}
