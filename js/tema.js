// Tema clar / fosc / automàtic. Es guarda en aquest dispositiu (df.tema).
// index.html fa el mateix abans de pintar, perquè no hi hagi cap flaix de color.
import { lsGet, lsSet } from './util.js';

const mq = matchMedia('(prefers-color-scheme: dark)');

export function tema() {
  return lsGet('df.tema', 'auto');
}

export function aplicaTema(t = tema()) {
  const fosc = t === 'dark' || (t !== 'light' && mq.matches);
  document.documentElement.dataset.theme = fosc ? 'dark' : 'light';
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = fosc ? '#11171e' : '#f4f2f8';
}

export function setTema(t) {
  lsSet('df.tema', t === 'auto' ? null : t);
  aplicaTema(t);
}

// En mode automàtic, segueix el canvi del sistema sense recarregar
mq.addEventListener('change', () => aplicaTema());
