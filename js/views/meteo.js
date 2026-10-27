// Temps amb detall: dia a dia, hora a hora i probabilitat de pluja (Open-Meteo)
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { ctx, Icon, WeatherIcon, Empty } from '../ui.js';
import { ymd, parseYmd, DIES, DIES_CURTS, fmtLlarg } from '../util.js';
import { useMeteo, descMeteo } from '../meteo.js';

const r = (x) => Math.round(x);
const nf = (x, d = 1) => String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',');
const hora = (t) => t.slice(11, 13);
const hm = (t) => (t ? t.slice(11, 16) : '—');

// Franges consecutives d'hores amb probabilitat de pluja >= llindar
function franges(hores, llindar) {
  const out = [];
  let ini = null;
  hores.forEach((h, i) => {
    const on = (h.p ?? 0) >= llindar;
    if (on && ini === null) ini = i;
    if ((!on || i === hores.length - 1) && ini !== null) {
      const fi = on ? i : i - 1;
      out.push([hores[ini].h, hores[fi].h + 1]);
      ini = null;
    }
  });
  return out;
}

function resumPluja(hores, pmax, mm) {
  if (pmax < 20) return 'Sense pluja prevista.';
  const f = franges(hores, 40);
  const txt = f.length ? `Pluja probable ${f.map(([a, b]) => `de ${a} a ${b} h`).join(' i ')}.` : 'Pluja poc probable, però possible en algun moment.';
  return `${txt}${mm >= 0.1 ? ` Unes ${nf(mm)} mm en total.` : ''}`;
}

function Grafic({ hores, ara }) {
  const W = 480, H = 170, pl = 30, pr = 8, pt = 14, pb = 26;
  const w = W - pl - pr, h = H - pt - pb;
  const ts = hores.map((x) => x.t);
  const mn = Math.floor(Math.min(...ts) - 1), mx = Math.ceil(Math.max(...ts) + 1);
  const x = (i) => pl + (i + 0.5) * (w / hores.length);
  const y = (t) => pt + h - ((t - mn) / (mx - mn || 1)) * h;
  const bw = (w / hores.length) * 0.62;
  const path = hores.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.t).toFixed(1)}`).join(' ');
  const passos = [mn, (mn + mx) / 2, mx];
  return html`<svg class="mt-graf" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Temperatura i probabilitat de pluja hora a hora">
    ${passos.map((t) => html`<g><line x1=${pl} x2=${W - pr} y1=${y(t)} y2=${y(t)} class="mt-grid" /><text x=${pl - 4} y=${y(t) + 3} text-anchor="end" class="mt-eix">${r(t)}°</text></g>`)}
    ${hores.map((p, i) => html`<rect x=${x(i) - bw / 2} y=${pt + h - (p.p / 100) * h} width=${bw} height=${(p.p / 100) * h} class="mt-barra" />`)}
    ${ara != null && html`<line x1=${x(ara)} x2=${x(ara)} y1=${pt} y2=${pt + h} class="mt-ara" />`}
    <path d=${path} class="mt-linia" />
    ${[0, 6, 12, 18, 23].map((i) => html`<text x=${x(i)} y=${H - 8} text-anchor="middle" class="mt-eix">${String(i).padStart(2, '0')} h</text>`)}
  </svg>`;
}

export function MeteoView({ sub }) {
  const meteo = useMeteo();
  const avui = ymd();
  const daily = meteo?.daily;
  const [dia, setDia] = useState(sub && /^\d{4}-\d{2}-\d{2}$/.test(sub) ? sub : avui);
  const strip = useRef(null);
  const i = daily ? daily.time.indexOf(dia) : -1;
  const esAvui = dia === avui;
  const horaAra = new Date().getHours();

  const hores = meteo ? meteo.hourly.time.map((t, k) => ({
    t: meteo.hourly.temperature_2m[k], ap: meteo.hourly.apparent_temperature?.[k], p: meteo.hourly.precipitation_probability[k] ?? 0,
    mm: meteo.hourly.precipitation?.[k] ?? 0, code: meteo.hourly.weather_code[k], vent: meteo.hourly.wind_speed_10m?.[k], dia: meteo.hourly.is_day?.[k] !== 0,
    time: t, h: Number(hora(t)),
  })).filter((x) => x.time.startsWith(dia)) : [];

  useEffect(() => {
    // en el dia d'avui, el carrusel s'obre a l'hora actual
    if (strip.current && esAvui) { const el = strip.current.querySelector('.on'); if (el) strip.current.scrollLeft = Math.max(0, el.offsetLeft - 12); }
    else if (strip.current) strip.current.scrollLeft = 0;
  }, [dia, hores.length]);

  const head = html`<header class="view-head"><button class="icon-btn" aria-label="Enrere" onClick=${() => ctx.nav('avui')}><${Icon} n="left" /></button><h1>El temps</h1></header>`;
  if (!meteo || !daily) return html`<section class="view sec-meteo">${head}<${Empty} title=${meteo === null ? 'Carregant el temps…' : 'No hi ha previsió'} text="Si no es carrega, potser no hi ha connexió. Es torna a provar en tornar a entrar." /></section>`;
  const k = i >= 0 ? i : 0;
  const d = daily.time[k];
  const code = daily.weather_code[k];
  const [desc, kind] = descMeteo(code);
  const cur = meteo.current;
  const pmax = daily.precipitation_probability_max[k] ?? 0;
  const mm = daily.precipitation_sum?.[k] ?? 0;
  const gmn = Math.min(...daily.temperature_2m_min), gmx = Math.max(...daily.temperature_2m_max);
  const nomDia = (s, j) => (j === 0 ? 'Avui' : j === 1 ? 'Demà' : DIES[parseYmd(s).getDay()].replace(/^\w/, (c) => c.toUpperCase()));

  return html`<section class="view sec-meteo">
    ${head}
    <div class="mt-dies" role="tablist" aria-label="Dies">${daily.time.map((s, j) => html`<button role="tab" aria-selected=${s === d} class=${'mt-dia' + (s === d ? ' on' : '')} onClick=${() => setDia(s)}>
      <span>${j === 0 ? 'Avui' : DIES_CURTS[parseYmd(s).getDay()]}</span><${WeatherIcon} kind=${descMeteo(daily.weather_code[j])[1]} size=${26} />
      <b>${r(daily.temperature_2m_max[j])}°</b><small>${r(daily.temperature_2m_min[j])}°</small>
      <em class=${daily.precipitation_probability_max[j] >= 20 ? 'pl' : ''}>${daily.precipitation_probability_max[j] >= 20 ? `${daily.precipitation_probability_max[j]}%` : ' '}</em></button>`)}</div>

    <div class="card mt-resum">
      <div class="mt-cap"><${WeatherIcon} kind=${kind} day=${esAvui && cur ? cur.is_day : true} size=${72} />
        <div><p class="mt-quan">${fmtLlarg(d).replace(/^\w/, (c) => c.toUpperCase())}</p>
          <p class="mt-desc">${desc}</p>
          <p class="mt-mm"><b>${r(daily.temperature_2m_min[k])}°</b> / <b>${r(daily.temperature_2m_max[k])}°</b><small> mín. / màx.</small></p></div>
        ${esAvui && cur && html`<div class="mt-ara-t"><span>${r(cur.temperature_2m)}°</span><small>ara${cur.apparent_temperature != null ? ` · sensació ${r(cur.apparent_temperature)}°` : ''}</small></div>`}
      </div>
      <p class="mt-pluja">${resumPluja(hores, pmax, mm)}</p>
      <ul class="mt-dades">
        <li><small>Pluja</small><b>${pmax}%</b></li>
        <li><small>Aigua</small><b>${nf(mm)} mm</b></li>
        <li><small>Vent màx.</small><b>${r(daily.wind_speed_10m_max?.[k] ?? 0)} km/h</b></li>
        <li><small>Índex UV</small><b>${nf(daily.uv_index_max?.[k] ?? 0, 0)}</b></li>
        <li><small>Sol surt</small><b>${hm(daily.sunrise[k])}</b></li>
        <li><small>Sol es pon</small><b>${hm(daily.sunset[k])}</b></li>
        ${esAvui && cur && html`<li><small>Humitat</small><b>${r(cur.relative_humidity_2m)}%</b></li>`}
        ${esAvui && cur && html`<li><small>Ratxes</small><b>${r(cur.wind_gusts_10m)} km/h</b></li>`}
      </ul>
    </div>

    ${hores.length > 0 && html`<div class="card mt-hores">
      <h3>Hora a hora</h3>
      <p class="mt-leg"><span class="l1"></span> temperatura <span class="l2"></span> probabilitat de pluja</p>
      <${Grafic} hores=${hores} ara=${esAvui ? horaAra : null} />
      <div class="mt-strip" ref=${strip}>${hores.map((p) => html`<div class=${'mt-h' + (esAvui && p.h === horaAra ? ' on' : '') + (esAvui && p.h < horaAra ? ' past' : '')}>
        <small>${String(p.h).padStart(2, '0')} h</small><${WeatherIcon} kind=${descMeteo(p.code)[1]} day=${p.dia} size=${28} />
        <b>${r(p.t)}°</b>
        <span class=${'mt-p' + (p.p >= 40 ? ' alt' : '')}>${p.p}%</span>
        <small class="mt-mmh">${p.mm >= 0.1 ? `${nf(p.mm)} mm` : ' '}</small>
        <small class="mt-v">${p.vent != null ? r(p.vent) : ''}</small>
      </div>`)}</div>
      <p class="hint">Sota cada hora: probabilitat de pluja, litres per m² i vent en km/h.</p>
    </div>`}

    <div class="card mt-setmana">
      <h3>Aquesta setmana</h3>
      <ul>${daily.time.map((s, j) => html`<li class=${s === d ? 'on' : ''} onClick=${() => { setDia(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <span class="mt-sd">${nomDia(s, j)}</span><${WeatherIcon} kind=${descMeteo(daily.weather_code[j])[1]} size=${24} />
        <span class="mt-sp">${daily.precipitation_probability_max[j] >= 20 ? `${daily.precipitation_probability_max[j]}%` : ''}</span>
        <span class="mt-smin">${r(daily.temperature_2m_min[j])}°</span>
        <span class="mt-rang"><i style=${{ left: `${((daily.temperature_2m_min[j] - gmn) / (gmx - gmn || 1)) * 100}%`, right: `${100 - ((daily.temperature_2m_max[j] - gmn) / (gmx - gmn || 1)) * 100}%` }}></i></span>
        <span class="mt-smax">${r(daily.temperature_2m_max[j])}°</span></li>`)}</ul>
    </div>
    <p class="hint">Font: Open-Meteo. S'actualitza cada 30 minuts.</p>
  </section>`;
}
