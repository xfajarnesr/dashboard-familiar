import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { ctx, Icon, WeatherIcon, nomDe } from '../ui.js';
import { ymd, parseYmd, addDaysYmd, fmtLlarg, DIES_CURTS, monthKey, MESOS, uid, relatiu, norm } from '../util.js';
import { useMeteo, descMeteo } from '../meteo.js';
import { DayRibbon, ResumHorari } from './horaris.js';
import { DinarNens, SoparLine, menuDia, dinarsFora } from './menjar.js';
import { ocurrencies, senseEscola } from '../calendar.js';
import { OcList, EventForm } from './agenda.js';
import { TascaRow, categoritza, colorBotiga, tascaVisible } from './llistes.js';
import { estatDoc, partitsBarca, Partit } from './mes.js';
import { propers, titolData, tipusDe, anysDe } from '../aniversaris.js';
import { avisosSalut } from './salut.js';
import { recordsAvui } from './records.js';

function salutacio() {
  const h = new Date().getHours();
  if (h < 6) return 'Bona nit';
  if (h < 14) return 'Bon dia';
  if (h < 21) return 'Bona tarda';
  return 'Bona nit';
}

// Color del "cel" de la capçalera segons l'hora i el temps del dia triat
function cel(kind, esAvui) {
  const h = new Date().getHours();
  const nit = esAvui && (h >= 21 || h < 7);
  const vespre = esAvui && h >= 18 && h < 21;
  if (nit) return 'sky-nit';
  if (kind === 'pluja' || kind === 'tempesta' || kind === 'neu') return 'sky-pluja';
  if (kind === 'nuvol' || kind === 'boira') return 'sky-nuvol';
  if (vespre) return 'sky-vespre';
  return 'sky-sol';
}

function Card({ sec, icon, title, link, onLink, children, cls = '' }) {
  return html`<section class=${`card tint ${cls}`} style=${{ '--sec': `var(--c-${sec})` }}>
    <div class="card-head">
      <h2><span class="badge"><${Icon} n=${icon} size=${18} stroke=${2} /></span>${title}</h2>
      ${link && html`<button class="linkbtn" onClick=${onLink}>${link}</button>`}
    </div>
    ${children}
  </section>`;
}

export function AvuiView() {
  const avui = ymd();
  const ara = new Date();
  const dies = Array.from({ length: 7 }, (_, i) => addDaysYmd(avui, i));
  // a partir de les 20 h, el dia que importa és demà
  const [dia, setDia] = useState(ara.getHours() >= 20 ? dies[1] : avui);
  const [nouEvent, setNouEvent] = useState(null);
  const meteo = useMeteo();
  const dObj = parseYmd(dia);
  const esAvui = dia === avui;
  const quin = esAvui ? 'avui' : dia === dies[1] ? 'demà' : `el ${DIES_CURTS[dObj.getDay()].toLowerCase()} ${dObj.getDate()}`;

  const ocsSetmana = ocurrencies(avui, dies[6]);
  const ocsDia = ocsSetmana.filter((o) => o.date === dia && !(o.kind === 'escolar' && o.multi && !o.first && o.date !== dia));
  const comptar = (d) => ocsSetmana.filter((o) => o.date === d && (o.kind === 'event' || o.kind === 'aniv')).length;

  const totes = ctx.store.items('tasques').filter((t) => !t.fet && t.data && tascaVisible(t));
  const tasques = (esAvui ? totes.filter((t) => t.data <= dia) : totes.filter((t) => t.data === dia)).sort((a, b) => a.data.localeCompare(b.data));
  const meves = ctx.store.items('tasques').filter((t) => !t.fet && tascaVisible(t) && (t.qui === ctx.me || t.qui === 'tots')).length;
  const compra = ctx.store.items('compra').filter((i) => !i.fet);

  // Avisos
  const avisos = [...avisosSalut()];
  for (const x of propers(7)) {
    avisos.push({ cls: 'aniv', txt: `${tipusDe(x.a) === 'aniversari' ? `Aniversari de ${x.a.nom}` : titolData(x.a, null)} ${x.falten === 0 ? 'avui' : x.falten === 1 ? 'demà' : relatiu(x.date)}${anysDe(x.a, x.edat) ? ` (${anysDe(x.a, x.edat)})` : ''}`, go: 'mes/aniversaris' });
  }
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
  avisos.push(...recordsAvui());
  const plaDia = ctx.store.items('pla').find((p) => p.id === dia);

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
    ctx.toast(`${t} → ${ex?.cat || categoritza(t)}`);
  };

  const daily = meteo?.daily;
  const wi = (d) => (daily ? daily.time.indexOf(d) : -1);
  const iDia = wi(dia);
  const cur = meteo?.current;
  const kindDia = esAvui && cur ? descMeteo(cur.weather_code)[1] : iDia >= 0 ? descMeteo(daily.weather_code[iDia])[1] : 'sol';

  const agenda = html`<${Card} sec="agenda" icon="agenda" title=${`Agenda ${quin}`} link="Calendari" onLink=${() => ctx.nav('agenda')} cls=${ocsDia.length ? 'agenda-main' : ''}>
    ${ocsDia.length ? html`<${OcList} ocs=${ocsDia} onEdit=${(x) => (x.kind === 'aniv' ? ctx.nav('mes/aniversaris') : x.kind === 'event' ? setNouEvent(x.ref) : x.kind === 'horari' ? ctx.nav('agenda/horaris') : ctx.nav('agenda/escolar'))} />` : html`<p class="muted small">Res a l'agenda ${quin}.</p>`}
    <button class="btn sm soft" onClick=${() => setNouEvent({ id: null, title: '', date: dia, end: '', time: '', timeEnd: '', qui: [], cat: 'familia', repeat: 'cap', notes: '', lloc: '' })}><${Icon} n="plus" size=${15} /> Afegeix a ${quin}</button>
  <//>`;

  const menjar = html`<${Card} sec="menjar" icon="menjar" title="Menjar" link="Setmana" onLink=${() => ctx.nav('menjar/setmana')}>
    ${menuDia(dia) || dinarsFora(dia).length ? html`<p class="lbl">Dinar</p><${DinarNens} d=${dia} />` : html`<p class="muted small">${senseEscola(dia) ? `Sense menjador (${senseEscola(dia)}).` : 'Sense menú de menjador per a aquest dia.'}</p>`}
    <p class="lbl">Sopar</p><${SoparLine} d=${dia} />
    ${plaDia?.motius?.length && !plaDia.fixat ? html`<p class="motius">${plaDia.motius[0]}.</p>` : ''}
    ${!plaDia && html`<button class="btn sm soft" onClick=${() => ctx.nav('menjar/setmana')}><${Icon} n="spark" size=${15} /> Proposa sopars</button>`}
  <//>`;

  const onEs = html`<${Card} sec="horari" icon="clock" title="On és cadascú" link="Horaris" onLink=${() => ctx.nav('agenda/horaris')} cls="ribbon-card">
      <${DayRibbon} date=${dObj} ymdStr=${dia} />
      <${ResumHorari} date=${dObj} ymdStr=${dia} />
    <//>`;
  return html`<section class="view avui">
    <header class=${'hero ' + cel(kindDia, esAvui)}>
      <div class="hero-top">
        <div>
          <p class="hello">${salutacio()}${ctx.me ? `, ${nomDe(ctx.me)}` : ''}</p>
          <h1>${fmtLlarg(dia).replace(/^\w/, (c) => c.toUpperCase())}</h1>
        </div>
        ${meteo && iDia >= 0 && html`<button class="hero-wx" onClick=${() => ctx.nav('meteo/' + dia)} aria-label="Veure el temps amb detall">
          <${WeatherIcon} kind=${kindDia} day=${esAvui && cur ? cur.is_day : true} size=${56} />
          <div><span class="temp">${esAvui && cur ? Math.round(cur.temperature_2m) : Math.round(daily.temperature_2m_max[iDia])}°</span>
            <small>${descMeteo(esAvui && cur ? cur.weather_code : daily.weather_code[iDia])[0]}${daily.precipitation_probability_max[iDia] >= 20 ? ` · pluja ${daily.precipitation_probability_max[iDia]}%` : ''}</small>
            <small class="mm">mín. ${Math.round(daily.temperature_2m_min[iDia])}° / màx. ${Math.round(daily.temperature_2m_max[iDia])}°</small></div>
          <${Icon} n="right" size=${18} />
        </button>`}
      </div>
      <div class="daystrip" role="tablist" aria-label="Dies">
        ${dies.map((d, i) => {
          const x = parseYmd(d), w = wi(d), n = comptar(d), lliure = senseEscola(d);
          return html`<button role="tab" aria-selected=${d === dia} class=${'dchip' + (d === dia ? ' on' : '') + (lliure && lliure !== 'cap de setmana' ? ' festa' : '')} onClick=${() => setDia(d)}>
            <span class="dc-d">${i === 0 ? 'Avui' : i === 1 ? 'Demà' : DIES_CURTS[x.getDay()]}</span>
            <span class="dc-n">${x.getDate()}</span>
            ${w >= 0 ? html`<span class="dc-w"><${WeatherIcon} kind=${descMeteo(daily.weather_code[w])[1]} size=${22} /><span><span class="dc-min">${Math.round(daily.temperature_2m_min[w])}°/</span>${Math.round(daily.temperature_2m_max[w])}°</span></span>` : html`<span class="dc-w"></span>`}
            <span class="dc-dots">${Array.from({ length: Math.min(n, 3) }, () => html`<i></i>`)}</span>
          </button>`;
        })}
      </div>
    </header>

    ${ocsDia.length > 0 ? agenda : onEs}

    ${ocsDia.length > 0 && onEs}

    <div class="grid2">
      ${menjar}
      <${Card} sec="tasques" icon="task" title="Pendent" link=${`${meves} meves`} onLink=${() => ctx.nav('llistes/tasques')}>
        ${tasques.length ? html`<ul class="items">${tasques.slice(0, 7).map((t) => html`<${TascaRow} t=${t} />`)}</ul>` : html`<p class="muted small">Cap tasca per ${quin}.</p>`}
      <//>
    </div>

    <div class="grid2">
      ${ocsDia.length === 0 && agenda}
      <${Card} sec="compra" icon="cart" title="Compra" link=${`${compra.length} a la llista`} onLink=${() => ctx.nav('llistes/compra')}>
        <form class="addbar mini" onSubmit=${afegeixCompra}><input value=${txtCompra} onInput=${(e) => setTxtCompra(e.target.value)} placeholder="Falta alguna cosa?" aria-label="Afegeix a la compra" /><button class="btn primary" aria-label="Afegeix"><${Icon} n="plus" size=${18} /></button></form>
        ${compra.length > 0 && html`<div class="compra-preview">${[...new Set(compra.map((i) => i.cat || ''))].sort((x, y) => (x ? 1 : 0) - (y ? 1 : 0)).map((b) => {
          const its = compra.filter((i) => (i.cat || '') === b);
          return html`<p><b style=${{ color: colorBotiga(b) }}>${b || 'Qualsevol botiga'}</b> ${its.slice(0, 8).map((i) => i.text).join(', ')}${its.length > 8 ? '…' : ''}</p>`;
        })}</div>`}
      <//>
      ${avisos.length > 0 && html`<${Card} sec="avisos" icon="spark" title="Avisos">
        <ul class="avisos">${avisos.map((a) => html`<li class=${a.cls} onClick=${() => a.go && ctx.nav(a.go)}>${a.txt}</li>`)}</ul>
      <//>`}
      ${proper && html`<${Card} sec="barca" icon="ball" title="Barça" link="Calendari" onLink=${() => ctx.nav('mes/barca')}>
        <ul class="matches"><${Partit} p=${proper} /></ul>
      <//>`}
    </div>
    ${nouEvent && html`<${EventForm} e=${nouEvent} onClose=${() => setNouEvent(null)} />`}
  </section>`;
}
