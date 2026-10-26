import { html, render, useState, useEffect } from './vendor/preact-htm.js';
import { ctx, Icon, SyncBadge, PersonPicker } from './ui.js';
import { Store, GitHubBackend, LocalBackend, AuthError } from './store.js';
import { lsGet, lsSet } from './util.js';
import { AvuiView } from './views/avui.js';
import { AgendaView } from './views/agenda.js';
import { MenjarView } from './views/menjar.js';
import { LlistesView } from './views/llistes.js';
import { MesView } from './views/mes.js';

// Valors per defecte del repo de dades (es poden canviar a la pantalla de connexió)
const DEFAULT_REPO = 'xfajarnesr/dashboard-familiar-dades';

const NAV = [
  ['avui', 'avui', 'Avui'],
  ['agenda', 'agenda', 'Agenda'],
  ['menjar', 'menjar', 'Menjar'],
  ['llistes', 'llistes', 'Llistes'],
  ['mes', 'mes', 'Més'],
];

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, sub] = h.split('/');
  return { view: NAV.some((n) => n[0] === view) ? view : 'avui', sub: sub || null };
}

function makeStore(conn) {
  if (conn.demo) {
    return import('./demo.js').then(({ demoSeed }) => new Store(new LocalBackend(demoSeed()), { who: lsGet('df.me') || 'demo', cachePrefix: 'df.demo' }));
  }
  return Promise.resolve(new Store(new GitHubBackend(conn), { who: lsGet('df.me') || 'algú' }));
}

function Setup({ onDone }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const connecta = async (e) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const [owner, name] = repo.trim().split('/');
    const conn = { token: token.trim(), owner, repo: name };
    try {
      if (!conn.token) throw new Error('Enganxa el token.');
      if (!owner || !name) throw new Error('El repo ha de tenir la forma usuari/nom.');
      await new GitHubBackend(conn).listTree();
      lsSet('df.conn', conn);
      onDone(conn);
    } catch (e2) {
      setErr(e2 instanceof AuthError ? e2.message : e2.message || 'No ha funcionat.');
    } finally { setBusy(false); }
  };
  const demo = () => { const c = { demo: true }; lsSet('df.conn', c); onDone(c); };
  return html`<main class="setup">
    <div class="setup-card">
      <div class="logo-dots"><i></i><i></i><i></i><i></i></div>
      <h1>Casa</h1>
      <p>El tauler de la família: horaris, menjars, compra, tasques i calendari, compartit entre els dos.</p>
      <form onSubmit=${connecta}>
        <label class="field"><span class="field-label">Token de GitHub</span>
          <input type="password" autocomplete="off" value=${token} onInput=${(e) => setToken(e.target.value)} placeholder="github_pat_…" />
          <span class="field-hint">Es guarda només en aquest dispositiu. Al README del repo hi ha com crear-lo.</span></label>
        <label class="field"><span class="field-label">Repo de dades</span><input value=${repo} onInput=${(e) => setRepo(e.target.value)} /></label>
        ${err && html`<p class="error">${err}</p>`}
        <button class="btn primary big" disabled=${busy}>${busy ? 'Connectant…' : 'Connecta'}</button>
      </form>
      <button class="linkbtn" onClick=${demo}>Prova-ho amb dades d'exemple</button>
    </div>
  </main>`;
}

function QuiEts({ membres, onPick }) {
  return html`<main class="setup"><div class="setup-card">
    <h1>Qui ets?</h1><p>Així sabrem quines tasques són teves i qui ha fet cada canvi.</p>
    <div class="who-pick">${membres.filter((m) => m.adult).map((m) => html`<button class="btn big" style=${{ borderColor: m.color, color: m.color }} onClick=${() => onPick(m.id)}>${m.nom}</button>`)}</div>
  </div></main>`;
}

function App() {
  const [conn, setConn] = useState(lsGet('df.conn'));
  const [store, setStore] = useState(null);
  const [, force] = useState(0);
  const [route, setRoute] = useState(parseHash());
  const [toast, setToast] = useState(null);
  const [me, setMe] = useState(lsGet('df.me'));

  useEffect(() => {
    const f = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);

  useEffect(() => {
    if (!conn) return;
    let unsub, timer;
    makeStore(conn).then((s) => {
      ctx.store = s;
      unsub = s.subscribe(() => force((x) => x + 1));
      setStore(s);
      s.refresh();
      timer = setInterval(() => { if (document.visibilityState === 'visible') s.refresh(); }, 90000);
    });
    const vis = () => { if (document.visibilityState === 'visible' && ctx.store) ctx.store.refresh(); };
    const onl = () => ctx.store && ctx.store.flush();
    document.addEventListener('visibilitychange', vis);
    addEventListener('online', onl);
    return () => { unsub && unsub(); clearInterval(timer); document.removeEventListener('visibilitychange', vis); removeEventListener('online', onl); };
  }, [conn]);

  ctx.nav = (r) => { location.hash = `#/${r}`; };
  ctx.toast = (t) => { setToast(t); clearTimeout(ctx._tt); ctx._tt = setTimeout(() => setToast(null), 3200); };
  ctx.me = me;

  if (!conn) return html`<${Setup} onDone=${setConn} />`;
  if (!store) return html`<main class="loading">Carregant…</main>`;

  const cfg = store.get('config');
  ctx.membres = cfg?.membres || [];
  if (!cfg && store.status !== 'ok') {
    if (store.status === 'auth' || store.status === 'error') return html`<main class="setup"><div class="setup-card"><h1>No puc llegir les dades</h1><p class="error">${store.error}</p>
      <button class="btn primary" onClick=${() => store.refresh()}>Torna-ho a provar</button>
      <button class="linkbtn" onClick=${() => { lsSet('df.conn', null); location.reload(); }}>Canvia el token</button></div></main>`;
    return html`<main class="loading">Carregant les dades…</main>`;
  }
  if (!me && ctx.membres.length) return html`<${QuiEts} membres=${ctx.membres} onPick=${(id) => { lsSet('df.me', id); store.who = ctx.membres.find((m) => m.id === id)?.nom || id; setMe(id); }} />`;
  store.who = ctx.membres.find((m) => m.id === me)?.nom || me || store.who;

  const logout = () => { ['df.conn', 'df.me', 'df.cache', 'df.pending'].forEach((k) => lsSet(k, null)); location.hash = ''; location.reload(); };
  const { view, sub } = route;
  return html`<div class="shell">
    <nav class="nav" aria-label="Seccions">
      <div class="brand"><div class="logo-dots sm"><i></i><i></i><i></i><i></i></div><span>Casa</span></div>
      ${NAV.map(([k, ic, label]) => html`<a href=${`#/${k}`} class=${(view === k ? 'on ' : '') + 'nav-' + k} aria-current=${view === k ? 'page' : null}><${Icon} n=${ic} size=${22} /><span>${label}</span></a>`)}
      <div class="nav-foot"><${SyncBadge} /></div>
    </nav>
    <div class="topbar"><${SyncBadge} /></div>
    ${store.status === 'auth' && html`<div class="banner err">${store.error} <button class="linkbtn" onClick=${() => ctx.nav('mes/ajustos')}>Ajustos</button></div>`}
    <main class="main">
      ${view === 'avui' && html`<${AvuiView} />`}
      ${view === 'agenda' && html`<${AgendaView} sub=${sub} />`}
      ${view === 'menjar' && html`<${MenjarView} sub=${sub} />`}
      ${view === 'llistes' && html`<${LlistesView} sub=${sub} />`}
      ${view === 'mes' && html`<${MesView} sub=${sub} onLogout=${logout} />`}
    </main>
    ${toast && html`<div class="toast" role="status">${toast}</div>`}
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
