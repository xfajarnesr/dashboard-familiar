import { html, useState, useEffect, useRef } from './vendor/preact-htm.js';

// Context global senzill (el posa main.js)
export const ctx = { store: null, me: null, membres: [], nav: () => {}, toast: () => {} };

export function membre(id) {
  return ctx.membres.find((m) => m.id === id);
}
export function colorDe(id) {
  if (id === 'tots' || id === 'familia') return 'var(--ink)';
  return membre(id)?.color || 'var(--muted)';
}
// Data de naixement d'un membre: la de la configuració o, si no n'hi ha, la dels aniversaris (mateix nom)
export function naixDe(id) {
  const m = membre(id);
  if (!m) return '';
  if (m.naixement) return m.naixement;
  const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const a = ctx.store?.items('aniversaris').find((x) => x.any && x.dia && norm(x.nom) === norm(m.nom));
  return a ? `${a.any}-${a.dia}` : '';
}
export function nomDe(id) {
  if (id === 'tots' || id === 'familia') return 'Tots';
  return membre(id)?.nom || id;
}

// ---------- Icones ----------
const P = {
  avui: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  agenda: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  menjar: 'M3 12h18a9 9 0 0 1-18 0zM8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4',
  llistes: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  mes: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5 9-11',
  x: 'M6 6l12 12M18 6L6 18',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  unlock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 5.8-1',
  cart: 'M3 4h2l2.5 11h11L21 7H6.2M9 20h.01M17 20h.01',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  ball: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7l3.5 2.5-1.3 4h-4.4l-1.3-4zM12 3v4M15.5 9.5l5-1M14.2 13.5l3 4.5M9.8 13.5l-3 4.5M8.5 9.5l-5-1',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.4H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  task: 'M5 5h14v14H5zM8 12l3 3 5-6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  spark: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z',
  cake: 'M4 21h16M5 21v-7h14v7M5 17c2 1.3 4.7 1.3 7 0s5-1.3 7 0M12 14v-3M12 8a1.5 1.5 0 0 0 1-2.5L12 4l-1 1.5A1.5 1.5 0 0 0 12 8zM8 14v-2M16 14v-2',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  quote: 'M5 11h4v4c0 2.5-1.3 4-3.5 4.5M5 11c0-3 1-5 4-6M14 11h4v4c0 2.5-1.3 4-3.5 4.5M14 11c0-3 1-5 4-6',
  thermo: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9v8',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7 10l7 7',
  ruler: 'M4 17L17 4l3 3L7 20zM8 13l2 2M11 10l2 2M14 7l2 2',
  note: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7M9 7h3',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z',
};
export function Icon({ n, size = 20, stroke = 1.8, cls = '' }) {
  return html`<svg class=${'ico ' + cls} width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[n]} /></svg>`;
}

export function WeatherIcon({ kind, size = 28, day = true }) {
  const sun = html`<g stroke="#E2A31B" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="#F6C343" stroke="#E2A31B"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></g>`;
  const moon = html`<path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="#C9D3E3" stroke="#8796AE" stroke-width="1.5"/>`;
  const cloud = (dx = 0, dy = 0, f = '#E7ECF3') => html`<path transform=${`translate(${dx} ${dy})`} d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z" fill=${f} stroke="#8796AE" stroke-width="1.5"/>`;
  const drops = html`<g stroke="#3D86C6" stroke-width="1.8" stroke-linecap="round"><path d="M9 20l-1 2M13 20l-1 2M17 20l-1 2"/></g>`;
  let body;
  switch (kind) {
    case 'sol': body = day ? sun : moon; break;
    case 'mig': body = html`<g transform="translate(-3 -3) scale(.8)">${day ? sun : moon}</g>${cloud(2, 2)}`; break;
    case 'nuvol': body = cloud(0, 0, '#DCE3EC'); break;
    case 'boira': body = html`<g stroke="#8796AE" stroke-width="1.8" stroke-linecap="round"><path d="M4 9h16M6 13h12M4 17h16"/></g>`; break;
    case 'pluja': body = html`${cloud(0, -2, '#D3DCE7')}${drops}`; break;
    case 'neu': body = html`${cloud(0, -2)}<g fill="#8796AE"><circle cx="9" cy="21" r="1"/><circle cx="13" cy="22" r="1"/><circle cx="17" cy="21" r="1"/></g>`; break;
    case 'tempesta': body = html`${cloud(0, -2, '#C5CFDC')}<path d="M12 17l-2 4h3l-2 3" stroke="#E2A31B" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; break;
    default: body = cloud();
  }
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

// Logo: la casa amb les quatre finestres de la família (el mateix que icons/icon.svg)
export function Logo({ size = 48 }) {
  return html`<svg class="logo" width=${size} height=${size} viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#1e2b3a"/><path d="M40 17.5h5v8.5h-5z" fill="#f4f2f8"/><path d="M32 13.5 51.5 30H47v19.5H17V30h-4.5z" fill="#f4f2f8" stroke="#f4f2f8" stroke-width="3" stroke-linejoin="round"/><circle cx="26.5" cy="35.5" r="4.3" fill="#2f6fdb"/><circle cx="37.5" cy="35.5" r="4.3" fill="#c2407a"/><circle cx="26.5" cy="45" r="4.3" fill="#2e9e6a"/><circle cx="37.5" cy="45" r="4.3" fill="#d99a0b"/></svg>`;
}

// ---------- Components ----------
export function Sheet({ title, onClose, children, actions }) {
  const ref = useRef();
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.classList.add('noscroll');
    setTimeout(() => ref.current?.querySelector('input,textarea,select')?.focus(), 60);
    return () => { document.removeEventListener('keydown', k); document.body.classList.remove('noscroll'); };
  }, []);
  return html`<div class="sheet-bg" onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label=${title} ref=${ref}>
      <div class="sheet-head"><h2>${title}</h2><button class="icon-btn" onClick=${onClose} aria-label="Tanca"><${Icon} n="x" /></button></div>
      <div class="sheet-body">${children}</div>
      ${actions && html`<div class="sheet-actions">${actions}</div>`}
    </div>
  </div>`;
}

export function Field({ label, children, hint }) {
  return html`<label class="field"><span class="field-label">${label}</span>${children}${hint && html`<span class="field-hint">${hint}</span>`}</label>`;
}

export function Seg({ value, options, onChange, small }) {
  return html`<div class=${'seg' + (small ? ' seg-sm' : '')} role="tablist">
    ${options.map((o) => html`<button role="tab" aria-selected=${value === o.value} class=${value === o.value ? 'on' : ''} onClick=${() => onChange(o.value)}>${o.label}</button>`)}
  </div>`;
}

export function PersonPicker({ value, onChange, multi = false, incloureTots = true, nomesAdults = false, nomesNens = false }) {
  const opts = ctx.membres.filter((m) => (!nomesAdults || m.adult) && (!nomesNens || !m.adult));
  const sel = multi ? value || [] : value;
  const toggle = (id) => {
    if (!multi) return onChange(id);
    onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  };
  const isOn = (id) => (multi ? sel.includes(id) : sel === id);
  return html`<div class="chips">
    ${incloureTots && !multi && html`<button type="button" class=${'chip' + (isOn('tots') ? ' on' : '')} style=${{ '--c': 'var(--ink)' }} onClick=${() => toggle('tots')}>Tots</button>`}
    ${opts.map((m) => html`<button type="button" class=${'chip' + (isOn(m.id) ? ' on' : '')} style=${{ '--c': m.color }} onClick=${() => toggle(m.id)}><span class="dot" style=${{ background: m.color }}></span>${m.nom}</button>`)}
  </div>`;
}

export function Who({ id, small }) {
  if (!id) return null;
  const ids = Array.isArray(id) ? id : [id];
  return html`<span class="who">${ids.map((i) => html`<span class=${'who-dot' + (small ? ' sm' : '')} title=${nomDe(i)} style=${{ background: colorDe(i) }}>${i === 'tots' ? '★' : nomDe(i)[0]}</span>`)}</span>`;
}

export function Empty({ title, text, action }) {
  return html`<div class="empty"><p class="empty-t">${title}</p>${text && html`<p class="empty-x">${text}</p>`}${action}</div>`;
}

export function SyncBadge() {
  const s = ctx.store;
  if (!s) return null;
  const st = s.status;
  const pend = s.pending.length;
  let label = 'Al dia', cls = 'ok';
  if (st === 'sync') { label = 'Sincronitzant'; cls = 'syncing'; }
  else if (st === 'offline') { label = pend ? `Sense xarxa · ${pend} pendents` : 'Sense xarxa'; cls = 'warn'; }
  else if (st === 'error' || st === 'auth') { label = 'Error de sincronització'; cls = 'err'; }
  else if (pend) { label = `${pend} pendents`; cls = 'syncing'; }
  return html`<button class=${'sync ' + cls} onClick=${() => { s.refresh(); if (s.error) ctx.toast(s.error); }} title=${s.error || 'Toca per actualitzar'}><span class="sync-dot"></span>${label}</button>`;
}

export function useForm(init) {
  const [f, setF] = useState(init);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  return [f, set, setF];
}
