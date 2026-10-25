// Previsió amb Open-Meteo (gratuït, sense clau)
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
  const k = `df.meteo.${lat},${lon}`;
  const c = lsGet(k);
  if (c && Date.now() - c.at < 30 * 60 * 1000) return c.data;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code,is_day,precipitation' +
    '&hourly=temperature_2m,precipitation_probability,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
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
