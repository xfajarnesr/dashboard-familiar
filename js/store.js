// Capa de dades: llegeix i escriu JSON al repo privat via l'API de GitHub.
// Cada canvi és una "operació" que s'aplica a l'última versió remota abans de pujar-la,
// de manera que si els dos editeu alhora, els canvis es fusionen en lloc de trepitjar-se.

import { b64encode, b64decode, clone, lsGet, lsSet, uid } from './util.js';

export const PATHS = {
  config: 'data/config.json',
  tasques: 'data/tasques.json',
  compra: 'data/compra.json',
  casa: 'data/casa.json',
  regals: 'data/regals.json',
  documents: 'data/documents.json',
  events: 'data/events.json',
  escolar: 'data/escolar.json',
  horaris: 'data/horaris.json',
  cataleg: 'data/sopars-cataleg.json',
  pla: 'data/sopars-pla.json',
  barca: 'data/barca.json',
  aniversaris: 'data/aniversaris.json',
  salut: 'data/salut.json',
  records: 'data/records.json',
  temes: 'data/temes.json',
};
export function pathOf(key) {
  if (key.startsWith('menu:')) return `data/menus/${key.slice(5)}.json`;
  return PATHS[key];
}
function keyOf(path) {
  const m = path.match(/^data\/menus\/(\d{4}-\d{2})\.json$/);
  if (m) return `menu:${m[1]}`;
  return Object.keys(PATHS).find((k) => PATHS[k] === path) || null;
}

const DESC = {
  tasques: 'tasques', compra: 'compra', casa: 'coses per casa', regals: 'regals', documents: 'documents',
  events: 'calendari', escolar: 'calendari escolar', horaris: 'horaris', cataleg: 'catàleg de sopars',
  pla: 'sopars', config: 'configuració', aniversaris: 'aniversaris', salut: 'salut dels nens', records: 'frases i fites', temes: 'temes pendents',
};

export class AuthError extends Error {}
export class ConflictError extends Error {}
export class OfflineError extends Error {}

// ---------- Backend GitHub ----------
export class GitHubBackend {
  constructor({ token, owner, repo, branch = 'main', apiBase = 'https://api.github.com' }) {
    Object.assign(this, { token, owner, repo, branch, apiBase });
  }
  async api(path, opts = {}) {
    let res;
    try {
      res = await fetch(`${this.apiBase}/repos/${this.owner}/${this.repo}${path}`, {
        ...opts,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch (e) {
      throw new OfflineError('Sense connexió');
    }
    if (res.status === 401 || res.status === 403) {
      const t = await res.text();
      if (res.status === 403 && /rate limit/i.test(t)) throw new Error("Límit de peticions de GitHub. Torna-ho a provar d'aquí a una estona.");
      throw new AuthError('El token no és vàlid o no té permís sobre el repo de dades.');
    }
    return res;
  }
  async listTree() {
    const res = await this.api(`/git/trees/${this.branch}?recursive=1`);
    if (res.status === 404) throw new AuthError("No trobo el repo de dades. Revisa el nom i que el token hi tingui accés.");
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const j = await res.json();
    const map = {};
    for (const e of j.tree || []) if (e.type === 'blob') map[e.path] = e.sha;
    return map;
  }
  async getBlob(sha) {
    const res = await this.api(`/git/blobs/${sha}`);
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const j = await res.json();
    return JSON.parse(b64decode(j.content));
  }
  async getFile(path) {
    const res = await this.api(`/contents/${path}?ref=${this.branch}`);
    if (res.status === 404) return { json: null, sha: null };
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const j = await res.json();
    return { json: JSON.parse(b64decode(j.content)), sha: j.sha };
  }
  async putFile(path, json, sha, message) {
    const body = { message, content: b64encode(JSON.stringify(json, null, 1) + '\n'), branch: this.branch };
    if (sha) body.sha = sha;
    const res = await this.api(`/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
    if (res.status === 409 || res.status === 422) throw new ConflictError('conflicte');
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const j = await res.json();
    return j.content.sha;
  }
}

// ---------- Backend local (mode demostració) ----------
export class LocalBackend {
  constructor(seed) {
    this.k = 'df.demo.files';
    if (!lsGet(this.k)) {
      const files = {};
      for (const [p, json] of Object.entries(seed)) files[p] = { json, sha: uid() };
      lsSet(this.k, files);
    }
  }
  files() { return lsGet(this.k, {}); }
  async listTree() {
    const f = this.files();
    return Object.fromEntries(Object.entries(f).map(([p, v]) => [p, v.sha]));
  }
  async getBlobByPath(p) { return this.files()[p]?.json ?? null; }
  async getFile(p) { const f = this.files()[p]; return f ? { json: f.json, sha: f.sha } : { json: null, sha: null }; }
  async putFile(p, json, sha) {
    const f = this.files();
    if ((f[p]?.sha || null) !== (sha || null)) throw new ConflictError('conflicte');
    f[p] = { json, sha: uid() };
    lsSet(this.k, f);
    return f[p].sha;
  }
}

// ---------- Operacions ----------
export function applyOp(data, op) {
  switch (op.t) {
    case 'upsert': {
      const d = data && Array.isArray(data.items) ? data : { items: [] };
      const items = d.items.slice();
      const i = items.findIndex((x) => x.id === op.item.id);
      const now = new Date().toISOString();
      if (i >= 0) items[i] = { ...items[i], ...op.item, updatedAt: now };
      else items.push({ createdAt: now, ...op.item, updatedAt: now });
      return { ...d, items };
    }
    case 'del': {
      const d = data && Array.isArray(data.items) ? data : { items: [] };
      return { ...d, items: d.items.filter((x) => x.id !== op.id) };
    }
    case 'delMany': {
      const d = data && Array.isArray(data.items) ? data : { items: [] };
      const s = new Set(op.ids);
      return { ...d, items: d.items.filter((x) => !s.has(x.id)) };
    }
    case 'patch':
      return { ...(data || {}), ...op.value };
    case 'set':
      return op.value;
    default:
      return data;
  }
}

// ---------- Store ----------
export class Store {
  constructor(backend, { who = 'algú', cachePrefix = 'df' } = {}) {
    this.b = backend;
    this.who = who;
    this.cp = cachePrefix;
    const cache = lsGet(`${this.cp}.cache`, {});
    this.remote = cache.remote || {}; // key -> json
    this.sha = cache.sha || {}; // key -> blob sha
    this.pending = lsGet(`${this.cp}.pending`, []); // [{key, op, desc, id}]
    this.status = 'idle'; // idle | sync | ok | offline | error | auth
    this.error = null;
    this.lastSync = cache.lastSync || null;
    this.oldSha = {}; // key -> Set de shas que ja hem substituït (per no tornar enrere si GitHub respon amb retard)
    this.listeners = new Set();
    this.menuMonths = cache.menuMonths || [];
    this._flushing = false;
    this._recompute();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const f of this.listeners) f(); }
  _save() {
    lsSet(`${this.cp}.cache`, { remote: this.remote, sha: this.sha, lastSync: this.lastSync, menuMonths: this.menuMonths });
    lsSet(`${this.cp}.pending`, this.pending);
  }
  _recompute() {
    const view = { ...this.remote };
    for (const p of this.pending) view[p.key] = applyOp(view[p.key], p.op);
    this.data = view;
  }
  get(key) { return this.data[key]; }
  items(key) { return this.data[key]?.items || []; }
  hasPending() { return this.pending.length > 0; }

  async refresh() {
    if (this._refreshing) return;
    this._refreshing = true;
    this.status = 'sync'; this._emit();
    try {
      const tree = await this.b.listTree();
      this.menuMonths = Object.keys(tree).map(keyOf).filter((k) => k && k.startsWith('menu:')).map((k) => k.slice(5)).sort();
      const changed = [];
      for (const [path, sha] of Object.entries(tree)) {
        const key = keyOf(path);
        if (!key) continue;
        if (this.sha[key] === sha) continue;
        if (this.oldSha[key]?.has(sha)) continue;
        changed.push([key, path, sha]);
      }
      await Promise.all(changed.map(async ([key, path, sha]) => {
        const json = this.b.getBlob ? await this.b.getBlob(sha) : await this.b.getBlobByPath(path);
        this.remote[key] = json;
        this.sha[key] = sha;
      }));
      this.lastSync = new Date().toISOString();
      this.status = 'ok'; this.error = null;
      this._recompute(); this._save();
    } catch (e) {
      this._handleErr(e);
    } finally {
      this._refreshing = false;
      this._emit();
    }
    if (this.pending.length) this.flush();
  }
  _handleErr(e) {
    if (e instanceof OfflineError) { this.status = 'offline'; this.error = 'Sense connexió: els canvis es pujaran quan tornis a tenir xarxa.'; }
    else if (e instanceof AuthError) { this.status = 'auth'; this.error = e.message; }
    else { this.status = 'error'; this.error = e.message || String(e); }
  }

  // Aplica una operació: es veu a l'instant i es puja en segon pla
  mutate(key, op, desc) {
    this.pending.push({ key, op, desc: desc || `actualitza ${DESC[key] || key}`, id: uid() });
    this._recompute(); this._save(); this._emit();
    clearTimeout(this._ft);
    this._ft = setTimeout(() => this.flush(), 400);
  }
  upsert(key, item, desc) { this.mutate(key, { t: 'upsert', item }, desc); }
  remove(key, id, desc) { this.mutate(key, { t: 'del', id }, desc); }

  async flush() {
    if (this._flushing || !this.pending.length) return;
    this._flushing = true;
    this.status = 'sync'; this._emit();
    try {
      while (this.pending.length) {
        const key = this.pending[0].key;
        const batch = this.pending.filter((p) => p.key === key);
        const path = pathOf(key);
        let tries = 0;
        for (;;) {
          tries++;
          let base = this.remote[key];
          let sha = this.sha[key] || null;
          if (tries > 1 || base === undefined) {
            const f = await this.b.getFile(path);
            base = f.json; sha = f.sha;
          }
          let next = clone(base);
          for (const p of batch) next = applyOp(next, p.op);
          const descs = [...new Set(batch.map((p) => p.desc))];
          const msg = `${this.who}: ${descs.slice(0, 3).join('; ')}${descs.length > 3 ? '…' : ''}`;
          try {
            const newSha = await this.b.putFile(path, next, sha, msg);
            if (sha) (this.oldSha[key] ||= new Set()).add(sha);
            this.remote[key] = next; this.sha[key] = newSha;
            const ids = new Set(batch.map((p) => p.id));
            this.pending = this.pending.filter((p) => !ids.has(p.id));
            break;
          } catch (e) {
            if (e instanceof ConflictError && tries < 6) continue;
            throw e;
          }
        }
        this._recompute(); this._save(); this._emit();
      }
      this.status = 'ok'; this.error = null;
      this.lastSync = new Date().toISOString();
    } catch (e) {
      this._handleErr(e);
      clearTimeout(this._retry);
      if (this.status === 'offline' || this.status === 'error') this._retry = setTimeout(() => this.flush(), 30000);
    } finally {
      this._flushing = false;
      this._recompute(); this._save(); this._emit();
    }
  }
}
