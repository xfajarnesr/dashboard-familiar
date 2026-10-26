import { html, useState } from '../vendor/preact-htm.js';
import { ctx, Icon, Sheet, Field, Seg, PersonPicker, Who, Empty, useForm, nomDe } from '../ui.js';
import { ymd, addDaysYmd, parseYmd, fmtCurt, relatiu, uid, norm, daysBetween, startOfWeek, lsGet, lsSet } from '../util.js';

// ---------- Botigues (categories de la compra) ----------
export const BOTIGUES_DEF = ['Mercat', 'Mercadona', 'Caprabo', 'Altres'];
const COLORS_BOTIGA = ['#E4572E', '#2F6FDB', '#0E9AA7', '#7A5AC8', '#C2407A', '#5F8F2E', '#8A94A3'];
export function botigues() {
  const b = ctx.store.get('config')?.botigues;
  return Array.isArray(b) && b.length ? b : BOTIGUES_DEF;
}
export function colorBotiga(nom) {
  const bs = botigues();
  const i = bs.indexOf(nom);
  if (i === bs.length - 1 || i < 0) return '#8A94A3';
  return COLORS_BOTIGA[i % COLORS_BOTIGA.length];
}
// Per defecte: on s'havia comprat abans; si no, fruita/verdura/carn/peix al mercat; si no, l'última botiga triada.
const FRESC = 'fruita verdura poma platan pera taronja mandarina maduix raim kiwi melo sindria pressec llimona alvocat advocat tomaquet enciam ceba all pastanaga carbasso carbassa broquil brocoli coliflor patata pebrot cogombre espinac bolet xampinyo mongeta tendra porro api moniato julivert bledes alberginia ruca canonge pollastre gall dindi vedella porc carn llom salsitxa botifarra peix salmo lluc bacalla gambes sepia orada llobarro calamar musclo filet sardin';
export function categoritza(text) {
  const bs = botigues();
  const t = norm(text);
  const ant = ctx.store.items('compra').find((i) => norm(i.text) === t && bs.includes(i.cat));
  if (ant) return ant.cat;
  if (bs.includes('Mercat') && FRESC.split(' ').some((k) => k.length > 2 && t.includes(k))) return 'Mercat';
  const ult = lsGet('df.botiga');
  return bs.includes(ult) ? ult : bs[bs.length - 1];
}
const CATS_CASA = ['Llar', 'Cuina', 'Bricolatge', 'Nens', 'Roba', 'Papers i gestions', 'Altres'];

export function LlistesView({ sub }) {
  const tab = sub || 'compra';
  return html`<section class="view sec-llistes">
    <header class="view-head"><h1>Llistes</h1></header>
    <${Seg} value=${tab} onChange=${(v) => ctx.nav(`llistes/${v}`)} options=${[{ value: 'compra', label: 'Compra' }, { value: 'tasques', label: 'Tasques' }, { value: 'casa', label: 'Per casa' }]} />
    ${tab === 'compra' && html`<${Llista} key="compra" k="compra" cats=${botigues()} botiga=${true} placeholder="Afegeix a la compra…" buit="La llista és buida" buitText="Tria la botiga, escriu el que falta i prem Retorn. Pots posar-ne uns quants separats per comes." />`}
    ${tab === 'casa' && html`<${Llista} key="casa" k="casa" cats=${CATS_CASA} placeholder="Què ens cal per casa?" buit="No falta res" buitText="Bombetes, una prestatgeria, un regal de casament… tot el que no és de supermercat." />`}
    ${tab === 'tasques' && html`<${Tasques} />`}
  </section>`;
}

function Llista({ k, cats, botiga, placeholder, buit, buitText }) {
  const [txt, setTxt] = useState('');
  const [cat, setCatS] = useState(() => (botiga && cats.includes(lsGet('df.botiga')) ? lsGet('df.botiga') : cats[0]));
  const setCat = (c) => { setCatS(c); if (botiga) lsSet('df.botiga', c); };
  const [edit, setEdit] = useState(null);
  const [veureFets, setVeureFets] = useState(false);
  const cur = cats.includes(cat) ? cat : cats[0];
  const items = ctx.store.items(k);
  const pend = items.filter((i) => !i.fet);
  const fets = items.filter((i) => i.fet).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const habituals = fets.filter((i) => (i.vegades || 0) >= 2).sort((a, b) => (b.vegades || 0) - (a.vegades || 0)).slice(0, 10);
  const afegir = (e) => {
    e.preventDefault();
    const parts = txt.split(/\s*[,;]\s*/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      const ex = items.find((i) => norm(i.text) === norm(p));
      if (ex) ctx.store.upsert(k, { id: ex.id, fet: false, cat: cur, by: ctx.me }, `afegeix ${p}`);
      else ctx.store.upsert(k, { id: uid(), text: p, cat: cur, fet: false, by: ctx.me }, `afegeix ${p}`);
    }
    setTxt('');
  };
  const toggle = (i) => ctx.store.upsert(k, { id: i.id, fet: !i.fet, vegades: !i.fet ? (i.vegades || 0) + 1 : i.vegades || 0, by: ctx.me }, `${i.fet ? 'torna a posar' : 'marca'} ${i.text}`);
  const buidaFets = () => { ctx.store.mutate(k, { t: 'delMany', ids: fets.filter((i) => (i.vegades || 0) < 2).map((i) => i.id) }, 'neteja la llista'); ctx.toast('Fets esborrats (es queden els habituals)'); };
  const ultima = cats[cats.length - 1];
  const grupDe = (i) => (cats.includes(i.cat) ? i.cat : ultima);
  const grups = cats.map((c) => [c, pend.filter((i) => grupDe(i) === c)]).filter(([, g]) => g.length);
  const col = (c) => (botiga ? colorBotiga(c) : 'var(--sec)');
  return html`<div>
    ${botiga && html`<div class="botigues" role="radiogroup" aria-label="Botiga">${cats.map((c) => html`<button type="button" role="radio" aria-checked=${c === cur} class=${'bchip' + (c === cur ? ' on' : '')} style=${{ '--c': col(c) }} onClick=${() => setCat(c)}>${c}<span>${pend.filter((i) => grupDe(i) === c).length || ''}</span></button>`)}</div>`}
    <form class="addbar" onSubmit=${afegir}>
      <input value=${txt} onInput=${(e) => setTxt(e.target.value)} placeholder=${botiga ? `Afegeix a ${cur}…` : placeholder} aria-label=${placeholder} enterkeyhint="done" />
      ${!botiga && html`<select value=${cur} onChange=${(e) => setCat(e.target.value)} aria-label="Categoria">${cats.map((c) => html`<option value=${c}>${c}</option>`)}</select>`}
      <button class="btn primary" aria-label="Afegeix"><${Icon} n="plus" size=${18} /></button>
    </form>
    ${habituals.length > 0 && html`<div class="habituals"><span class="lbl">Habituals</span><div class="chips">${habituals.map((i) => html`<button class="chip" onClick=${() => toggle(i)}>+ ${i.text}</button>`)}</div></div>`}
    ${pend.length === 0 && html`<${Empty} title=${buit} text=${buitText} />`}
    ${grups.map(([c, g]) => html`<div class="lgroup" style=${{ '--c': col(c) }}><h3><span class="gdot"></span>${c} <span class="muted">${g.length}</span></h3>
      <ul class="items">${g.map((i) => html`<li class="item">
        <button class="tick-box" aria-label=${`Marca ${i.text}`} onClick=${() => toggle(i)}></button>
        <span class="item-txt" onClick=${() => toggle(i)}>${i.text}${i.nota ? html`<small class="muted"> · ${i.nota}</small>` : ''}</span>
        <${Who} id=${i.by} small=${true} />
        <button class="icon-btn sm" aria-label="Edita" onClick=${() => setEdit(i)}><${Icon} n="edit" size=${16} /></button>
      </li>`)}</ul></div>`)}
    ${fets.length > 0 && html`<div class="fets">
      <button class="linkbtn" onClick=${() => setVeureFets(!veureFets)}>${veureFets ? 'Amaga' : 'Mostra'} els fets (${fets.length})</button>
      ${veureFets && html`<ul class="items done">${fets.slice(0, 60).map((i) => html`<li class="item"><button class="tick-box on" aria-label=${`Torna a posar ${i.text}`} onClick=${() => toggle(i)}><${Icon} n="check" size=${14} /></button><span class="item-txt" onClick=${() => toggle(i)}>${i.text}</span></li>`)}</ul>
        <button class="btn ghost" onClick=${buidaFets}>Neteja els fets</button>`}
    </div>`}
    ${edit && html`<${ItemForm} k=${k} item=${{ ...edit, cat: grupDe(edit) }} cats=${cats} botiga=${botiga} onClose=${() => setEdit(null)} />`}
  </div>`;
}

function ItemForm({ k, item, cats, botiga, onClose }) {
  const [f, set] = useForm({ ...item, nota: item.nota || '' });
  const save = () => { ctx.store.upsert(k, { id: f.id, text: f.text, cat: f.cat, nota: f.nota }, `edita ${f.text}`); onClose(); };
  const del = () => { ctx.store.remove(k, f.id, `treu ${f.text}`); onClose(); };
  return html`<${Sheet} title="Edita" onClose=${onClose} actions=${html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button><button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Què"><input value=${f.text} onInput=${set('text')} /><//>
    <${Field} label=${botiga ? 'Botiga' : 'Categoria'}><select value=${f.cat} onChange=${set('cat')}>${cats.map((c) => html`<option value=${c}>${c}</option>`)}</select><//>
    <${Field} label="Nota"><input value=${f.nota} onInput=${set('nota')} placeholder="Marca, quantitat, botiga…" /><//>
  <//>`;
}

// ---------- Tasques ----------
const RECUR = { cap: 'No es repeteix', diaria: 'Cada dia', setmanal: 'Cada setmana', mensual: 'Cada mes', anual: 'Cada any' };
function seguent(d, r) {
  const x = parseYmd(d);
  if (r === 'diaria') x.setDate(x.getDate() + 1);
  if (r === 'setmanal') x.setDate(x.getDate() + 7);
  if (r === 'mensual') x.setMonth(x.getMonth() + 1);
  if (r === 'anual') x.setFullYear(x.getFullYear() + 1);
  return ymd(x);
}
// Una tasca amb vis 'jo' només la veu qui la té assignada (o qui l'ha creada). No és xifrat.
export const tascaVisible = (t) => t.vis !== 'jo' || t.qui === ctx.me || t.by === ctx.me;

export function completaTasca(t) {
  if (!t.fet && t.recur && t.recur !== 'cap') {
    const base = t.data || ymd();
    ctx.store.upsert('tasques', { id: t.id, fet: true, fetPer: ctx.me, fetEl: ymd() }, `fa ${t.text}`);
    const { createdAt, updatedAt, ...resta } = t;
    ctx.store.upsert('tasques', { ...resta, id: uid(), fet: false, data: seguent(base, t.recur), fetPer: null, fetEl: null }, `repeteix ${t.text}`);
  } else {
    ctx.store.upsert('tasques', { id: t.id, fet: !t.fet, fetPer: !t.fet ? ctx.me : null, fetEl: !t.fet ? ymd() : null }, `${t.fet ? 'reobre' : 'fa'} ${t.text}`);
  }
}
export function TascaRow({ t, onEdit }) {
  const avui = ymd();
  const tard = t.data && t.data < avui && !t.fet;
  return html`<li class=${'item tasca' + (t.fet ? ' is-done' : '')}>
    <button class=${'tick-box' + (t.fet ? ' on' : '')} aria-label=${t.fet ? `Reobre ${t.text}` : `Fet: ${t.text}`} onClick=${() => completaTasca(t)}>${t.fet && html`<${Icon} n="check" size=${14} />`}</button>
    <span class="item-txt" onClick=${() => onEdit && onEdit(t)}>${t.vis === 'jo' && html`<span class="priv" title="Només la veus tu"><${Icon} n="lock" size=${13} stroke=${2.2} /></span>`}${t.text}
      <small class=${tard ? 'late' : 'muted'}>${t.data ? ` · ${relatiu(t.data)}` : ''}${t.recur && t.recur !== 'cap' ? ' · ↻' : ''}</small></span>
    <${Who} id=${t.qui} small=${true} />
  </li>`;
}

function Tasques() {
  const [filtre, setFiltre] = useState('meves');
  const [txt, setTxt] = useState('');
  const [privada, setPrivada] = useState(false);
  const [edit, setEdit] = useState(null);
  const avui = ymd();
  const fiSetmana = addDaysYmd(ymd(startOfWeek()), 6);
  let ts = ctx.store.items('tasques').filter(tascaVisible);
  if (filtre === 'meves') ts = ts.filter((t) => !t.fet && (t.qui === ctx.me || t.qui === 'tots' || !t.qui));
  else if (filtre === 'totes') ts = ts.filter((t) => !t.fet);
  else ts = ts.filter((t) => t.fet).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 50);
  const grups = filtre === 'fetes' ? [['Fetes', ts]] : [
    ['Endarrerides', ts.filter((t) => t.data && t.data < avui)],
    ['Avui', ts.filter((t) => t.data === avui)],
    ['Aquesta setmana', ts.filter((t) => t.data > avui && t.data <= fiSetmana)],
    ['Més endavant', ts.filter((t) => t.data > fiSetmana)],
    ['Sense data', ts.filter((t) => !t.data)],
  ].map(([n, g]) => [n, g.sort((a, b) => (a.data || '').localeCompare(b.data || ''))]);
  const afegir = (e) => {
    e.preventDefault();
    if (!txt.trim()) return;
    ctx.store.upsert('tasques', { id: uid(), text: txt.trim(), qui: ctx.me, fet: false, recur: 'cap', by: ctx.me, ...(privada ? { vis: 'jo' } : {}) }, privada ? 'nova tasca personal' : `nova tasca: ${txt.trim()}`);
    setTxt('');
  };
  return html`<div>
    <form class="addbar" onSubmit=${afegir}>
      <input value=${txt} onInput=${(e) => setTxt(e.target.value)} placeholder=${privada ? 'Tasca només per a tu…' : 'Nova tasca (per a tu; toca-la per canviar-ho)'} aria-label="Nova tasca" />
      <button type="button" class=${'icon-btn lockbtn' + (privada ? ' on' : '')} aria-pressed=${privada} aria-label="Només la veig jo" title=${privada ? "Només la veuràs tu" : "La veurà tothom (toca per fer-la només teva)"} onClick=${() => setPrivada(!privada)}><${Icon} n=${privada ? 'lock' : 'unlock'} size=${18} /></button>
      <button class="btn primary" aria-label="Afegeix"><${Icon} n="plus" size=${18} /></button>
    </form>
    <${Seg} small=${true} value=${filtre} onChange=${setFiltre} options=${[{ value: 'meves', label: 'Meves' }, { value: 'totes', label: 'Totes' }, { value: 'fetes', label: 'Fetes' }]} />
    ${ts.length === 0 && html`<${Empty} title=${filtre === 'fetes' ? 'Cap tasca feta encara' : 'Res pendent'} text=${filtre === 'meves' ? 'Les tasques assignades a tu o a tots surten aquí.' : ''} />`}
    ${grups.map(([n, g]) => g.length > 0 && html`<div class="lgroup"><h3 class=${n === 'Endarrerides' ? 'late' : ''}>${n} <span class="muted">${g.length}</span></h3>
      <ul class="items">${g.map((t) => html`<${TascaRow} t=${t} onEdit=${setEdit} />`)}</ul></div>`)}
    <button class="btn" onClick=${() => setEdit({ id: null, text: '', qui: ctx.me, data: '', recur: 'cap', notes: '' })}><${Icon} n="plus" size=${16} /> Tasca amb detalls</button>
    ${edit && html`<${TascaForm} t=${edit} onClose=${() => setEdit(null)} />`}
  </div>`;
}

export function TascaForm({ t, onClose }) {
  const [f, set, setF] = useForm({ ...t, data: t.data || '', notes: t.notes || '', recur: t.recur || 'cap' });
  const save = () => {
    if (!f.text.trim()) return;
    const vis = f.vis === 'jo' && f.qui === ctx.me ? 'jo' : 'tots';
    ctx.store.upsert('tasques', { ...f, vis, text: f.text.trim(), data: f.data || null, id: f.id || uid(), fet: !!f.fet, by: f.by || ctx.me }, vis === 'jo' ? `${t.id ? 'edita' : 'nova'} tasca personal` : `${t.id ? 'edita' : 'nova'} tasca: ${f.text.trim()}`);
    onClose();
  };
  const del = () => { ctx.store.remove('tasques', f.id, `esborra tasca: ${f.text}`); onClose(); };
  const avui = ymd();
  return html`<${Sheet} title=${t.id ? 'Tasca' : 'Nova tasca'} onClose=${onClose}
    actions=${html`${t.id && html`<button class="btn ghost danger" onClick=${del}><${Icon} n="trash" size=${16} /> Esborra</button>`}<button class="btn primary" onClick=${save}>Desa</button>`}>
    <${Field} label="Què cal fer"><input value=${f.text} onInput=${set('text')} /><//>
    <${Field} label="Qui"><${PersonPicker} value=${f.qui} onChange=${(v) => setF((x) => ({ ...x, qui: v }))} /><//>
    ${f.qui === ctx.me && html`<label class="check"><input type="checkbox" checked=${f.vis === 'jo'} onChange=${(e) => setF((x) => ({ ...x, vis: e.target.checked ? 'jo' : 'tots' }))} /> Només la veig jo (no surt a la llista de l'altre)</label>`}
    <${Field} label="Per quan">
      <div class="chips">
        ${[['Avui', avui], ['Demà', addDaysYmd(avui, 1)], ['Dissabte', addDaysYmd(ymd(startOfWeek()), 5)], ['Sense data', '']].map(([l, v]) => html`<button type="button" class=${'chip' + (f.data === v ? ' on' : '')} onClick=${() => setF((x) => ({ ...x, data: v }))}>${l}</button>`)}
      </div>
      <input type="date" value=${f.data} onInput=${set('data')} />
    <//>
    <${Field} label="Es repeteix"><select value=${f.recur} onChange=${set('recur')}>${Object.entries(RECUR).map(([k, v]) => html`<option value=${k}>${v}</option>`)}</select><//>
    <${Field} label="Notes"><textarea rows="2" value=${f.notes} onInput=${set('notes')}></textarea><//>
    ${t.fetPer && html`<p class="hint">Feta per ${nomDe(t.fetPer)} ${t.fetEl ? fmtCurt(t.fetEl) : ''}.</p>`}
  <//>`;
}
