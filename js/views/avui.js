import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { ctx, Icon, WeatherIcon, Empty, nomDe } from '../ui.js';
import { ymd, parseYmd, addDaysYmd, fmtLlarg, DIES, DIES_CURTS, daysBetween, monthKey, MESOS, uid, relatiu, deMes } from '../util.js';
import { getMeteo, descMeteo } from '../meteo.js';
import { DayRibbon, ResumHorari } from './horaris.js';
import { DinarNens, SoparLine, menuDia } from './menjar.js';
import { ocurrencies, senseEscola } from '../calendar.js';
import { OcRow } from './agenda.js';
import { TascaRow } from './llistes.js';
import { estatDoc, partitsBarca, Partit } from './mes.js';
import { categoritza } from './llistes.js';
import { norm } from '../util.js';

function useMeteo() {
  const cfg = ctx.store.get('config');
  const lat = cfg?.ubicacio?.lat ?? 41.632, lon = cfg?.ubicacio?.lon ?? 2.168;
  const [m, setM] = useState(null);
  useEffect(() => { getMeteo(lat, lon).then(setM); }, [lat, lon]);
  return m;
}

function salutacio() {
  const h = new Date().getHours();
  if (h < 6) return 'Bona nit';
  if (h < 14) return 'Bon dia';
  if (h < 21) return 'Bona tarda';
  return 'Bona nit';
}

export function AvuiView() {
  const avui = ymd();
  const ara = new Date();
  const dema = addDaysYmd(avui, 1);
  // a partir de les 20 h, el dia que importa és demà
  const [dia, setDia] = useState(ara.getHours() >= 20 ? dema : avui);
  const meteo = useMeteo();
  const dObj = parseYmd(dia);
  const cfg = ctx.store.get('config');

  const ocs = ocurrencies(avui, addDaysYmd(avui, 1));
  const ocsDia = ocs.filter((o) => o.date === dia);
  const tasques = ctx.store.items('tasques').filter((t) => !t.fet && t.data && t.data <= dia).sort((a, b) => a.data.localeCompare(b.data));
  const meves = ctx.store.items('tasques').filter((t) => !t.fet && (t.qui === ctx.me || t.qui === 'tots')).length;
  const compra = ctx.store.items('compra').filter((i) => !i.fet);

  // Avisos
  const avisos = [];
  for (const d of ctx.store.items('documents')) {
    const e = estatDoc(d);
    if (e.n != null && e.n <= 90) avisos.push({ cls: e.cls, txt: `${d.tipus}${d.persona ? ' de ' + nomDe(d.persona) : ''}: ${e.txt}`, go: 'mes/documents' });
  }
  const proxLliure = [];
  for (let i = 1; i <= 14; i++) {
    const d = addDaysYmd(avui, i);
    const dow = parseYmd(d).getDay();
    if (dow === 0 || dow === 6) continue;
    const s = senseEscola(d);
    if (s && !proxLliure.find((x) => x.s === s)) proxLliure.push({ d, s });
  }
  for (const x of proxLliure.slice(0, 2)) avisos.push({ cls: 'info', txt: `Sense escola ${relatiu(x.d)}: ${x.s}`, go: 'agenda/escolar' });
  const seg = monthKey(new Date(ara.getFullYear(), ara.getMonth() + 1, 1));
  if (ara.getDate() >= 24 && !ctx.store.menuMonths.includes(seg)) avisos.push({ cls: 'info', txt: `Falta el menú de ${MESOS[Number(seg.slice(5)) - 1]} de les escoles. Passa els PDF a Claude.`, go: 'menjar/escola' });
  const plaAvui = ctx.store.items('pla').find((p) => p.id === dia);
  if (!plaAvui) avisos.push({ cls: 'info', txt: `Encara no hi ha sopar per ${dia === avui ? 'avui' : 'demà'}.`, go: 'menjar/setmana' });

  const proper = partitsBarca().find((p) => p.data >= new Date(Date.now() - 2 * 3600e3).toISOString() && (p.equip || 'masculi') === 'masculi');

  const [txtCompra, setTxtCompra] = useState('');
  const afegeixCompra = (e) => {
    e.preventDefault();
    const t = txtCompra.trim();
    if (!t) return;
    const ex = ctx.store.items('compra').find((i) => norm(i.text) === norm(t));
    if (ex) ctx.store.upsert('compra', { id: ex.id, fet: false, by: ctx.me }, `afegeix ${t}`);
    else ctx.store.upsert('compra', { id: uid(), text: t, cat: categoritza(t), fet: false, by: ctx.me }, `afegeix ${t}`);
    setTxtCompra('');
  };

  const cur = meteo?.current;
  const daily = meteo?.daily;
  const iDia = daily ? daily.time.indexOf(dia) : -1;

  return html`<section class="view avui">
    <header class="hero">
      <div class="hero-date">
        <p class="hello">${salutacio()}${ctx.me ? `, ${nomDe(ctx.me)}` : ''}</p>
        <h1>${fmtLlarg(dia).replace(/^\w/, (c) => c.toUpperCase())}</h1>
        <div class="daytoggle">
          <button class=${dia === avui ? 'on' : ''} onClick=${() => setDia(avui)}>Avui</button>
          <button class=${dia === dema ? 'on' : ''} onClick=${() => setDia(dema)}>Demà</button>
        </div>
      </div>
      ${meteo && html`<div class="hero-wx">
        ${dia === avui && cur ? html`<${WeatherIcon} kind=${descMeteo(cur.weather_code)[1]} day=${cur.is_day} size=${54} /><div><span class="temp">${Math.round(cur.temperature_2m)}°</span><small>${descMeteo(cur.weather_code)[0]}${iDia >= 0 ? ` · ${Math.round(daily.temperature_2m_min[iDia])}° / ${Math.round(daily.temperature_2m_max[iDia])}°` : ''}${iDia >= 0 && daily.precipitation_probability_max[iDia] >= 20 ? ` · pluja ${daily.precipitation_probability_max[iDia]}%` : ''}</small></div>`
          : iDia >= 0 && html`<${WeatherIcon} kind=${descMeteo(daily.weather_code[iDia])[1]} size=${54} /><div><span class="temp">${Math.round(daily.temperature_2m_max[iDia])}°</span><small>${descMeteo(daily.weather_code[iDia])[0]} · mín. ${Math.round(daily.temperature_2m_min[iDia])}°${daily.precipitation_probability_max[iDia] >= 20 ? ` · pluja ${daily.precipitation_probability_max[iDia]}%` : ''}</small></div>`}
      </div>`}
    </header>

    <div class="card ribbon-card">
      <div class="card-head"><h2>On és cadascú</h2><button class="linkbtn" onClick=${() => ctx.nav('agenda/horaris')}>Horaris</button></div>
      <${DayRibbon} date=${dObj} ymdStr=${dia} />
      <${ResumHorari} date=${dObj} ymdStr=${dia} />
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-head"><h2>Menjar</h2><button class="linkbtn" onClick=${() => ctx.nav('menjar/setmana')}>Setmana</button></div>
        ${menuDia(dia) ? html`<p class="lbl">Dinar a l'escola</p><${DinarNens} d=${dia} />` : html`<p class="muted small">${senseEscola(dia) ? 'Avui no hi ha menjador.' : 'Sense menú de menjador per a aquest dia.'}</p>`}
        <p class="lbl">Sopar</p><${SoparLine} d=${dia} />
        ${!plaAvui && html`<button class="btn sm" onClick=${() => ctx.nav('menjar/setmana')}><${Icon} n="spark" size=${15} /> Proposa sopars</button>`}
        ${plaAvui?.motius?.length && !plaAvui.fixat ? html`<p class="motius">${plaAvui.motius[0]}.</p>` : ''}
      </div>

      <div class="card">
        <div class="card-head"><h2>Agenda</h2><button class="linkbtn" onClick=${() => ctx.nav('agenda')}>Calendari</button></div>
        ${ocsDia.length ? html`<ul class="ocs">${ocsDia.map((o) => html`<${OcRow} o=${o} />`)}</ul>` : html`<p class="muted small">Res a l'agenda ${dia === avui ? 'avui' : 'demà'}.</p>`}
        ${dia === avui && ocs.filter((o) => o.date === dema).length > 0 && html`<p class="lbl">Demà</p><ul class="ocs">${ocs.filter((o) => o.date === dema).map((o) => html`<${OcRow} o=${o} />`)}</ul>`}
      </div>

      <div class="card">
        <div class="card-head"><h2>Pendent</h2><button class="linkbtn" onClick=${() => ctx.nav('llistes/tasques')}>${meves} meves</button></div>
        ${tasques.length ? html`<ul class="items">${tasques.slice(0, 7).map((t) => html`<${TascaRow} t=${t} />`)}</ul>` : html`<p class="muted small">Cap tasca per ${dia === avui ? 'avui' : 'demà'}.</p>`}
      </div>

      <div class="card">
        <div class="card-head"><h2>Compra</h2><button class="linkbtn" onClick=${() => ctx.nav('llistes/compra')}>${compra.length} a la llista</button></div>
        <form class="addbar mini" onSubmit=${afegeixCompra}><input value=${txtCompra} onInput=${(e) => setTxtCompra(e.target.value)} placeholder="Falta alguna cosa?" aria-label="Afegeix a la compra" /><button class="btn primary" aria-label="Afegeix"><${Icon} n="plus" size=${18} /></button></form>
        ${compra.length > 0 && html`<p class="compra-preview">${compra.slice(0, 12).map((i) => i.text).join(', ')}${compra.length > 12 ? '…' : ''}</p>`}
      </div>

      ${avisos.length > 0 && html`<div class="card">
        <div class="card-head"><h2>Avisos</h2></div>
        <ul class="avisos">${avisos.map((a) => html`<li class=${a.cls} onClick=${() => a.go && ctx.nav(a.go)}>${a.txt}</li>`)}</ul>
      </div>`}

      ${proper && html`<div class="card barca-card">
        <div class="card-head"><h2>Barça</h2><button class="linkbtn" onClick=${() => ctx.nav('mes/barca')}>Calendari</button></div>
        <ul class="matches"><${Partit} p=${proper} /></ul>
      </div>`}
    </div>

    ${daily && html`<div class="card">
      <div class="card-head"><h2>El temps a ${cfg?.ubicacio?.nom || 'Caldes'}</h2></div>
      <div class="wx-week">${daily.time.map((t, i) => html`<div class=${'wx-day' + (t === dia ? ' on' : '')}>
        <span>${i === 0 ? 'Avui' : DIES_CURTS[parseYmd(t).getDay()]}</span>
        <${WeatherIcon} kind=${descMeteo(daily.weather_code[i])[1]} size=${30} />
        <b>${Math.round(daily.temperature_2m_max[i])}°</b><small>${Math.round(daily.temperature_2m_min[i])}°</small>
        ${daily.precipitation_probability_max[i] >= 20 ? html`<small class="rain">${daily.precipitation_probability_max[i]}%</small>` : html`<small class="rain"> </small>`}
      </div>`)}</div>
    </div>`}
  </section>`;
}
