// Previsió amb Open-Meteo (gratuït, sense clau)
import { html, useState, useEffect } from './vendor/preact-htm.js';
import { ctx } from './ui.js';
import { lsGet, lsSet } from './util.js';

const WMO = {
  0: ['Cel serè', 'sol'], 1: ['Gairebé serè', 'sol'], 2: ['Parcialment ennuvolat', 'mig'], 3: ['Ennuvolat', 'nuvol'],
  45: ['Boira', 'boira'], 48: ['Boira gebradora', 'boira'],
  51: ['Plugim', 'pluja'], 53: ['Plugim', 'pluja'], 55: ['Plugim intens', 'pluja'],
  56: ['Plugim gelat', 'pluja'], 57: ['Plugim gelat', 'pluja'],
  61: ['Pluja feble', 'pluja'], 63: ['Pluja', 'pluja'], 65: ['Pluja forta', 'pluja'],
  66: ['Pluja gelada', 'pluja'], 67: ['Pluja gelada', 'pluja'],
  71: ['Neu feble', 'neu'], 73: ['Neu', 'neu'], 75: ['Neu forta', 'neu'], 77: ['Neu granulada', 'neu'],
  80: ['Ruixats', 'pluja'], 81: ['Ruixats', 'pluja'], 82: ['Ruixats forts', 'pluja'],
  85: ['Ruixats de neu', 'neu'], 86: ['Ruixats de neu', 'neu'],
  95: ['Tempesta', 'tempesta'], 96: ['Tempesta amb calamarsa', 'tempesta'], 99: ['Tempesta amb calamarsa', 'tempesta'],
};
export function descMeteo(code) {
  return WMO[code] || ['—', 'nuvol'];
}

export async function getMeteo(lat, lon) {
  const k = `df.meteo2.${lat},${lon}`;
  const c = lsGet(k);
  if (c && Date.now() - c.at < 30 * 60 * 1000) return c.data;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,precipitation,wind_speed_10m,wind_gusts_10m' +
    '&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max,sunrise,sunset' +
    '&timezone=Europe%2FMadrid&forecast_days=7';
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const data = await r.json();
    lsSet(k, { at: Date.now(), data });
    return data;
  } catch {
    return c ? c.data : null;
  }
}

export function useMeteo() {
  const cfg = ctx.store.get('config');
  const lat = cfg?.ubicacio?.lat ?? 41.632, lon = cfg?.ubicacio?.lon ?? 2.168;
  const [m, setM] = useState(null);
  useEffect(() => { getMeteo(lat, lon).then(setM); }, [lat, lon]);
  return m;
}
