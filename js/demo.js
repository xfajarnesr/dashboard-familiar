// Dades d'exemple per provar l'app sense connectar-la (noms inventats)
import { CATALEG, ESCOLAR_2026_27 } from './seeds.js';
import { ymd, addDaysYmd, startOfWeek, parseYmd, monthKey, uid } from './util.js';

const DINARS = [
  [['Crema de carbassa', 'Lluç al forn amb patata'], 'peix'],
  [['Cigrons estofats', 'Truita de patates amb amanida'], 'ou'],
  [['Paella de verdures', 'Pollastre rostit amb amanida'], 'carn-blanca'],
  [['Sopa de fideus', 'Llenties amb arròs'], 'llegum'],
  [['Verdura amb patata', 'Estofat de vedella'], 'carn-vermella'],
  [['Arròs amb tomàquet', 'Remenat d\'ou'], 'ou'],
  [['Pèsols amb patata', 'Salmó amb amanida'], 'peix'],
  [['Espaguetis amb tomàquet', 'Mongetes estofades'], 'llegum'],
];

export function demoSeed() {
  const avui = new Date();
  const mk = monthKey(avui);
  const dies = {};
  const ini = new Date(avui.getFullYear(), avui.getMonth(), 1);
  for (let d = new Date(ini), i = 0; d.getMonth() === ini.getMonth(); d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const a = DINARS[i % DINARS.length], b = DINARS[(i + 3) % DINARS.length];
    dies[ymd(d)] = { nil: { plats: a[0], postres: 'Fruita', proteina: a[1] }, jana: { plats: b[0], postres: 'Fruita', proteina: b[1] } };
    i++;
  }
  const dl = ymd(startOfWeek());
  const blocs = [];
  for (let dia = 1; dia <= 5; dia++) {
    blocs.push({ id: uid(), persona: 'pau', dia, inici: '08:00', fi: '14:30', text: 'Institut' });
    if (dia === 3) blocs.push({ id: uid(), persona: 'pau', dia, inici: '15:00', fi: '18:00', text: 'Tarda rotatòria', variable: true });
    if (dia !== 5) blocs.push({ id: uid(), persona: 'laia', dia, inici: dia === 1 ? '10:30' : '09:00', fi: '16:30', text: 'Escola' });
    blocs.push({ id: uid(), persona: 'nil', dia, inici: '09:00', fi: '16:30', text: 'Escola' });
    blocs.push({ id: uid(), persona: 'jana', dia, inici: '09:00', fi: '16:00', text: 'Llar d\'infants' });
  }
  return {
    'data/config.json': {
      membres: [
        { id: 'pau', nom: 'Pau', color: '#2F6FDB', adult: true },
        { id: 'laia', nom: 'Laia', color: '#C2407A', adult: true },
        { id: 'nil', nom: 'Nil', color: '#2E9E6A', escola: 'Escola de demostració', curs: 'I3' },
        { id: 'jana', nom: 'Jana', color: '#D99A0B', escola: 'Llar d\'infants', curs: 'I1' },
      ],
      ubicacio: { nom: 'Caldes de Montbui', lat: 41.632, lon: 2.168 },
    },
    'data/horaris.json': { items: blocs },
    'data/escolar.json': { items: ESCOLAR_2026_27 },
    'data/sopars-cataleg.json': { items: CATALEG },
    'data/sopars-pla.json': { items: [] },
    [`data/menus/${mk}.json`]: { mes: mk, fonts: { nil: 'Menú de demostració', jana: 'Menú de demostració' }, dies },
    'data/tasques.json': { items: [
      { id: uid(), text: 'Trucar al pediatre per la revisió', qui: 'laia', data: ymd(avui), fet: false, recur: 'cap' },
      { id: uid(), text: 'Treure les escombraries', qui: 'pau', data: ymd(avui), fet: false, recur: 'setmanal' },
      { id: uid(), text: 'Comprar el regal de l\'àvia', qui: 'tots', data: addDaysYmd(ymd(avui), 4), fet: false, recur: 'cap' },
    ] },
    'data/compra.json': { items: ['Llet', 'Plàtans', 'Pa de motlle', 'Iogurts', 'Bolquers'].map((t, i) => ({ id: uid(), text: t, cat: ['Làctics i ous', 'Fruita i verdura', 'Rebost', 'Làctics i ous', 'Higiene i nens'][i], fet: false })) },
    'data/casa.json': { items: [{ id: uid(), text: 'Bombeta del passadís', cat: 'Llar', fet: false }] },
    'data/regals.json': { items: [{ id: uid(), per: 'nil', ocasio: 'Nadal', idea: 'Bicicleta sense pedals', estat: 'idea' }] },
    'data/documents.json': { items: [{ id: uid(), tipus: 'DNI', persona: 'pau', caducitat: addDaysYmd(ymd(avui), 40) }] },
    'data/events.json': { items: [
      { id: uid(), title: 'Reunió d\'escola', date: addDaysYmd(dl, 2), time: '17:00', qui: ['laia'], cat: 'escola' },
      { id: uid(), title: 'Sopar amb amics', date: addDaysYmd(dl, 5), time: '21:00', qui: 'tots', cat: 'oci' },
    ] },
  };
}
