// Dades genèriques (sense res privat) que fan servir la demostració i la càrrega inicial

const P = (id, nom, verdura, hidrats, proteina, temps, ingredients, favorit = false) => ({ id, nom, verdura, hidrats, proteina, temps, ingredients, favorit });

export const CATALEG = [
  P('truita-patates', 'Truita de patates', false, true, 'ou', 'normal', ['ous', 'patates', 'ceba'], true),
  P('truita-francesa', 'Truita francesa amb amanida', true, false, 'ou', 'ràpid', ['ous', 'enciam', 'tomàquet'], true),
  P('brocoli-patata', 'Bròquil amb patata i ou dur', true, true, 'ou', 'ràpid', ['bròquil', 'patates', 'ous'], true),
  P('croquetes', 'Croquetes amb amanida', true, true, 'carn-blanca', 'ràpid', ['croquetes', 'enciam'], true),
  P('gyozes', 'Gyozes amb verdures saltejades', true, true, 'carn-vermella', 'ràpid', ['gyozes', 'pastanaga', 'carbassó'], true),
  P('pizza', 'Pizza casolana de verdures', true, true, 'lactic', 'normal', ['massa de pizza', 'tomàquet fregit', 'mozzarella', 'pebrot', 'xampinyons'], true),
  P('torrades-alvocat', "Torrades d'alvocat amb ou", true, true, 'ou', 'ràpid', ['alvocat', 'pa', 'ous'], true),
  P('sopa-pasta', 'Sopa amb pasta', false, true, 'carn-blanca', 'ràpid', ['brou de pollastre', 'fideus'], true),
  P('crema-verdures', 'Crema de verdures', true, false, null, 'normal', ['carbassó', 'porro', 'pastanaga', 'patata'], true),
  P('crema-carbassa', 'Crema de carbassa amb crostons', true, true, null, 'normal', ['carbassa', 'ceba', 'pa']),
  P('salmo-forn', 'Salmó al forn amb patates', false, true, 'peix', 'normal', ['salmó', 'patates']),
  P('lluc-verdures', 'Lluç a la planxa amb verdures', true, false, 'peix', 'ràpid', ['lluç', 'carbassó', 'pebrot']),
  P('amanida-pasta-tonyina', 'Amanida de pasta amb tonyina', true, true, 'peix', 'ràpid', ['pasta', 'tonyina', 'tomàquet', 'blat de moro']),
  P('bacalla-samfaina', 'Bacallà amb samfaina', true, false, 'peix', 'llarg', ['bacallà', 'albergínia', 'carbassó', 'pebrot', 'tomàquet']),
  P('hamburguesa', 'Hamburguesa de vedella amb amanida', true, true, 'carn-vermella', 'ràpid', ['hamburgueses', 'pa d\'hamburguesa', 'enciam', 'tomàquet']),
  P('pollastre-arros', 'Pollastre a la planxa amb arròs i verdura', true, true, 'carn-blanca', 'ràpid', ['pit de pollastre', 'arròs', 'mongeta tendra']),
  P('macarrons', 'Macarrons amb tomàquet i formatge', false, true, 'lactic', 'ràpid', ['macarrons', 'tomàquet fregit', 'formatge ratllat']),
  P('llenties', 'Llenties estofades amb verdures', true, true, 'llegum', 'llarg', ['llenties', 'pastanaga', 'ceba', 'patata']),
  P('hummus', 'Hummus amb crudités i pa de pita', true, true, 'llegum', 'ràpid', ['cigrons', 'tahina', 'pastanaga', 'cogombre', 'pa de pita']),
  P('amanida-cigrons', 'Amanida de cigrons', true, false, 'llegum', 'ràpid', ['cigrons', 'tomàquet', 'pebrot', 'ceba']),
  P('quesadilles', 'Quesadilles de pollastre i pebrot', true, true, 'carn-blanca', 'ràpid', ['tortilles de blat', 'pollastre', 'pebrot', 'formatge']),
  P('wok-tofu', 'Wok de fideus amb tofu i verdures', true, true, 'vegetal', 'ràpid', ['fideus d\'arròs', 'tofu', 'pastanaga', 'carbassó', 'salsa de soja']),
  P('ous-remenats', 'Ous remenats amb bolets i torrades', true, true, 'ou', 'ràpid', ['ous', 'xampinyons', 'pa']),
  P('arros-tres', 'Arròs tres delícies', true, true, 'ou', 'normal', ['arròs', 'ous', 'pèsols', 'pastanaga', 'pernil dolç']),
  P('pa-tomaquet-pernil', 'Pa amb tomàquet i pernil', false, true, 'carn-vermella', 'ràpid', ['pa', 'tomàquet', 'pernil']),
  P('verdures-forn-cabra', 'Verdures al forn amb formatge de cabra', true, false, 'lactic', 'normal', ['carbassó', 'albergínia', 'pebrot', 'formatge de cabra']),
  P('hamburguesa-llegums', 'Hamburguesa vegetal de llegums', false, true, 'llegum', 'ràpid', ['hamburgueses vegetals', 'pa']),
  P('sandvitx-gall-dindi', 'Sandvitx de gall dindi i formatge', false, true, 'carn-blanca', 'ràpid', ['pa de motlle', 'gall dindi', 'formatge']),
  P('sardines', 'Sardines amb all i julivert', false, false, 'peix', 'normal', ['sardines', 'all', 'julivert']),
];

export const ESCOLAR_2026_27 = [
  { id: 'esc-inici', date: '2026-09-08', title: 'Inici de curs', tipus: 'curs' },
  { id: 'esc-9oct', date: '2026-10-09', title: 'Festiu escolar', tipus: 'festiu', nota: 'Marcat com a festiu als menús de les escoles' },
  { id: 'esc-pilar', date: '2026-10-12', title: 'Festa del Pilar', tipus: 'festiu' },
  { id: 'esc-tots-sants', date: '2026-11-01', title: 'Tots Sants', tipus: 'festiu' },
  { id: 'esc-constitucio', date: '2026-12-06', title: 'Dia de la Constitució', tipus: 'festiu' },
  { id: 'esc-immaculada', date: '2026-12-08', title: 'La Immaculada', tipus: 'festiu' },
  { id: 'esc-nadal', date: '2026-12-22', end: '2027-01-07', title: 'Vacances de Nadal', tipus: 'vacances' },
  { id: 'esc-ss', date: '2027-03-20', end: '2027-03-29', title: 'Vacances de Setmana Santa', tipus: 'vacances' },
  { id: 'esc-1maig', date: '2027-05-01', title: 'Festa del Treball', tipus: 'festiu' },
  { id: 'esc-final', date: '2027-06-21', title: 'Últim dia de curs', tipus: 'curs' },
  { id: 'esc-sant-joan', date: '2027-06-24', title: 'Sant Joan', tipus: 'festiu' },
];
