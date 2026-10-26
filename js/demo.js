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

const pad = (n) => String(n).padStart(2, '0');
function tsFa(h) {
  const d = new Date(Date.now() - h * 3600e3);
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fa(dies) { return addDaysYmd(ymd(), -dies); }

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
    blocs.push({ id: uid(), persona: 'pau', dia, inici: dia === 1 || dia === 3 ? '10:00' : '08:00', fi: '14:30', text: 'Institut' });
    if (dia === 1 || dia === 3) blocs.push({ id: uid(), persona: 'pau', dia, inici: '08:30', fi: '09:30', text: 'Porta els nens', nens: true, nomesEscola: true });
    else blocs.push({ id: uid(), persona: 'laia', dia, inici: '08:30', fi: '09:30', text: 'Porta els nens', nens: true, nomesEscola: true });
    if (dia !== 5) blocs.push({ id: uid(), persona: 'laia', dia, inici: dia === 1 ? '10:30' : '09:00', fi: '16:30', text: 'Escola' });
    blocs.push({ id: uid(), persona: 'nil', dia, inici: '09:00', fi: '16:30', text: 'Escola' });
    blocs.push({ id: uid(), persona: 'jana', dia, inici: '09:00', fi: '16:00', text: 'Llar d\'infants' });
  }
  // tardes rotatòries d'en Pau: dies concrets (aquesta setmana i d'aquí a dues)
  for (const n of [2, 18, 30]) {
    const data = addDaysYmd(dl, n);
    blocs.push({ id: uid(), persona: 'pau', data, dia: ((parseYmd(data).getDay() + 6) % 7) + 1, inici: '15:00', fi: '18:00', text: "Tarda a l'institut" });
  }
  return {
    'data/config.json': {
      membres: [
        { id: 'pau', nom: 'Pau', color: '#F07F1E', adult: true },
        { id: 'laia', nom: 'Laia', color: '#22A55B', adult: true },
        { id: 'nil', nom: 'Nil', color: '#E8B10A', escola: 'Escola de demostració', curs: 'I3', naixement: '2023-03-14' },
        { id: 'jana', nom: 'Jana', color: '#8E57D9', escola: 'Llar d\'infants', curs: 'I1', naixement: '2025-04-20' },
      ],
      ubicacio: { nom: 'Caldes de Montbui', lat: 41.632, lon: 2.168 },
      botigues: ['Mercat', 'Mercadona', 'Caprabo', 'Altres'],
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
      { id: uid(), text: 'Corregir els exàmens de 1r', qui: 'pau', by: 'pau', vis: 'jo', data: addDaysYmd(ymd(avui), 1), fet: false, recur: 'cap' },
      { id: uid(), text: 'Preparar la sessió de tutoria', qui: 'laia', by: 'laia', vis: 'jo', data: ymd(avui), fet: false, recur: 'cap' },
    ] },
    'data/salut.json': { items: [
      { id: 'med1', k: 'med', nen: 'nil', nom: 'Antitèrmic (exemple)', dosi: 'La que us indiqui el pediatre', interval: 6, maxDia: 4, pesRef: 14.2, nota: 'Exemple: poseu-hi la vostra', actiu: true, by: 'laia' },
      { id: uid(), k: 'reg', nen: 'nil', tipus: 'temp', ts: tsFa(3.2), temp: 38.4, text: '', by: 'laia' },
      { id: uid(), k: 'reg', nen: 'nil', tipus: 'med', ts: tsFa(3), medId: 'med1', medNom: 'Antitèrmic (exemple)', dosi: 'dosi apuntada', text: '', by: 'laia' },
      { id: uid(), k: 'reg', nen: 'nil', tipus: 'temp', ts: tsFa(1), temp: 37.4, text: 'Ja dorm', by: 'pau' },
      { id: uid(), k: 'reg', nen: 'nil', tipus: 'simptoma', ts: tsFa(26), text: 'Mocs i una mica de tos', by: 'pau' },
      { id: uid(), k: 'reg', nen: 'jana', tipus: 'vacuna', ts: `${fa(40)}T10:30`, text: 'Vacunes dels 18 mesos al CAP', by: 'laia' },
      { id: uid(), k: 'mesura', nen: 'nil', data: fa(400), pes: 12.1, alcada: 86, talla: '2 anys', sabata: '22', by: 'laia' },
      { id: uid(), k: 'mesura', nen: 'nil', data: fa(220), pes: 13.0, alcada: 91, talla: '2-3 anys', sabata: '23', by: 'pau' },
      { id: uid(), k: 'mesura', nen: 'nil', data: fa(30), pes: 14.6, alcada: 97, talla: '3-4 anys', sabata: '25', nota: 'Revisió dels 3 anys', by: 'laia' },
      { id: uid(), k: 'mesura', nen: 'jana', data: fa(200), pes: 8.9, alcada: 72, talla: '9-12 mesos', by: 'laia' },
      { id: uid(), k: 'mesura', nen: 'jana', data: fa(40), pes: 10.4, alcada: 80, talla: '18 mesos', sabata: '20', by: 'laia' },
    ] },
    'data/records.json': { items: [
      { id: uid(), nen: 'nil', tipus: 'frase', data: fa(365), text: 'Papa, la lluna ens segueix amb el cotxe!', context: 'Tornant de casa dels avis', by: 'pau' },
      { id: uid(), nen: 'nil', tipus: 'frase', data: fa(12), text: 'Jo ja sóc gran, però només una mica', context: '', by: 'laia' },
      { id: uid(), nen: 'jana', tipus: 'fita', data: fa(60), text: 'Ha caminat sola fins a la porta', context: 'A casa', by: 'laia' },
      { id: uid(), nen: 'jana', tipus: 'frase', data: fa(5), text: 'Aigua! Més aigua!', context: 'La seva primera frase de dues paraules', by: 'pau' },
    ] },
    'data/compra.json': { items: ['Llet', 'Plàtans', 'Pa de motlle', 'Iogurts', 'Bolquers'].map((t, i) => ({ id: uid(), text: t, cat: ['Mercadona', 'Mercat', 'Mercadona', 'Caprabo', 'Altres'][i], fet: false })) },
    'data/casa.json': { items: [{ id: uid(), text: 'Bombeta del passadís', cat: 'Llar', fet: false }] },
    'data/regals.json': { items: [{ id: uid(), per: 'nil', ocasio: 'Nadal', idea: 'Bicicleta sense pedals', estat: 'idea' }] },
    'data/aniversaris.json': { items: [{ id: uid(), nom: 'Àvia Rosa', dia: addDaysYmd(ymd(avui), 3).slice(5), any: 1952, relacio: 'àvia' }, { id: uid(), nom: 'Nil', dia: '03-14', any: 2023, relacio: 'fill' }] },
    'data/documents.json': { items: [{ id: uid(), tipus: 'DNI', persona: 'pau', caducitat: addDaysYmd(ymd(avui), 40) }] },
    'data/events.json': { items: [
      { id: uid(), title: 'Reunió d\'escola', date: addDaysYmd(dl, 2), time: '17:00', qui: ['laia'], cat: 'escola' },
      { id: uid(), title: 'Sopar amb amics', date: addDaysYmd(dl, 5), time: '21:00', qui: 'tots', cat: 'oci' },
      { id: uid(), title: 'Examen de 2n de Batxillerat', date: addDaysYmd(ymd(avui), 1), qui: ['pau'], cat: 'feina', by: 'pau', vis: 'jo' },
      { id: uid(), title: 'Junta d\'avaluació', date: addDaysYmd(ymd(avui), 2), time: '17:00', timeEnd: '19:30', qui: ['pau'], cat: 'feina', by: 'pau', vis: 'ocupat' },
      { id: uid(), title: 'Claustre', date: addDaysYmd(ymd(avui), 1), time: '17:00', timeEnd: '18:30', qui: ['laia'], cat: 'feina', by: 'laia', vis: 'ocupat' },
      { id: uid(), title: 'Entregar notes de 3r', date: ymd(avui), qui: ['laia'], cat: 'feina', by: 'laia', vis: 'tots' },
      { id: uid(), title: 'Reunió de cicle', date: ymd(avui), time: '13:00', qui: ['laia'], cat: 'feina', by: 'laia', vis: 'tots' },
      { id: uid(), title: 'Formació digital', date: ymd(avui), time: '15:00', timeEnd: '16:30', qui: ['laia'], cat: 'feina', by: 'laia', vis: 'tots' },
    ] },
  };
}
