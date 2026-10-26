// Dosis dels dos medicaments bàsics de casa, TAL COM ELS DIU EL PROSPECTE (no són càlculs de l'app).
// Fonts oficials (AEMPS / CIMA), contrastades amb la fitxa tècnica i el prospecte:
//   Dalsy 40 mg/ml suspensió oral (ibuprofè): registre 69726
//   Apiretal 100 mg/ml solució oral (paracetamol): registre 49302
// Si el pediatre us ha receptat una altra dosi, mana la del pediatre.

export const PROSPECTES = {
  dalsy: {
    id: 'dalsy',
    nom: 'Dalsy 40 mg/ml',
    actiu: 'ibuprofè',
    envas: 'suspensió oral',
    url: 'https://cima.aemps.es/cima/dochtml/p/69726/Prospecto_69726.html',
    preses: 3,
    intervalH: null, // el prospecte diu «3 preses al dia» i no fixa les hores
    resum: '3 preses al dia. Màxim del prospecte en 24 h segons el pes.',
    avisos: [
      'No es recomana en menors de 3 mesos ni per sota de 5 kg.',
      'Els menors de 2 anys només el poden prendre amb prescripció mèdica.',
      'Consulteu el metge si el nen té entre 6 mesos i 12 anys i cal més de 3 dies, o si els símptomes empitjoren.',
    ],
    // pes (kg), edat orientativa, ml per presa (de-a), màxim diari en ml
    files: [
      [5, '3–6 mesos', 0.8, 1.2, 3.6], [6, '3–6 mesos', 1, 1.4, 4.2], [7, '3–6 mesos', 1.2, 1.6, 4.8],
      [8, '6–12 mesos', 1.4, 2, 6], [9, '6–12 mesos', 1.6, 2.2, 6.6],
      [10, '12–24 mesos', 1.8, 2.4, 7.2], [12, '12–24 mesos', 2, 3, 9],
      [14, '2–3 anys', 2.4, 3.4, 10.2],
      [16, '4–5 anys', 2.8, 4, 12], [18, '4–5 anys', 3, 4.4, 13.2],
      [20, '6–9 anys', 3.4, 5, 15], [22, '6–9 anys', 3.8, 5.4, 16.2], [24, '6–9 anys', 4, 6, 18], [26, '6–9 anys', 4.4, 6.4, 19.2],
      [28, '10–12 anys', 4.8, 7, 21], [30, '10–12 anys', 5, 7.4, 22.2],
    ],
  },
  apiretal: {
    id: 'apiretal',
    nom: 'Apiretal 100 mg/ml',
    actiu: 'paracetamol',
    envas: 'solució oral',
    url: 'https://cima.aemps.es/cima/dochtml/p/49302/Prospecto_49302.html',
    preses: 4,
    intervalH: 6,
    resum: 'Cada 6 hores (15 mg/kg per presa). Si als 3–4 h no fa efecte, el prospecte permet passar a 10 mg/kg cada 4 h: mireu-ne el text.',
    avisos: [
      'Consulteu el metge abans de donar-lo a menors de 3 anys.',
      "Consulteu el metge si la febre dura més de 3 dies o el dolor més de 3 dies, o si els símptomes empitjoren.",
      'El prospecte fixa 60 mg/kg al dia com a màxim: no el supereu.',
      'Les gotes només valen per als flascons amb comptagotes; la xeringa es dosifica en ml.',
    ],
    // fins a (kg), edat orientativa, ml per presa, mg per presa
    files: [
      [10.5, '12–23 mesos', 1.6, 160], [13, '2–3 anys', 2, 200], [18.5, '4–5 anys', 2.8, 280],
      [24, '6–8 anys', 3.6, 360], [32, '9–10 anys', 4.8, 480],
    ],
  },
};

const eq = (a, b) => Math.abs(a - b) < 0.05;

// Què diu el prospecte per a un nen d'aquest pes?
// Retorna { estat, files?, text? } amb estat: 'sensePes' | 'no' | 'fora' | 'exacte' | 'entre' | 'tram'
export function dosiProspecte(id, kg) {
  const p = PROSPECTES[id];
  if (!p) return { estat: 'fora', text: 'Medicament sense prospecte a l’app.' };
  if (kg == null || !(kg > 0)) return { estat: 'sensePes' };
  if (id === 'dalsy') {
    if (kg < 5) return { estat: 'no', text: 'El prospecte no recomana el Dalsy per sota de 5 kg.' };
    if (kg > 30.05) return { estat: 'fora', text: 'Per sobre de 30 kg, mireu la taula del prospecte.' };
    const ex = p.files.find((f) => eq(f[0], kg));
    if (ex) return { estat: 'exacte', files: [ex] };
    const baix = [...p.files].reverse().find((f) => f[0] < kg);
    const alt = p.files.find((f) => f[0] > kg);
    return { estat: 'entre', files: [baix, alt].filter(Boolean) };
  }
  if (kg <= 8) return { estat: 'fora', text: 'Per sota de 8 kg, els prospectes d’Apiretal no coincideixen: mireu el del vostre flascó o pregunteu al pediatre.' };
  if (kg > 32) return { estat: 'fora', text: 'L’Apiretal en solució és per a nens de fins a 32 kg.' };
  return { estat: 'tram', files: [p.files.find((f) => kg <= f[0] + 0.001)] };
}

const n = (x) => String(x).replace('.', ',');
export const fmtMl = (min, max) => (max == null || min === max ? `${n(min)} ml` : `${n(min)}–${n(max)} ml`);

// Línia llegible d'una fila del prospecte
export function liniaFila(id, f) {
  if (id === 'dalsy') return `${n(f[0])} kg (${f[1]}): ${fmtMl(f[2], f[3])} per presa, 3 cops al dia · màxim ${n(f[4])} ml en 24 h`;
  return `fins a ${n(f[0])} kg (${f[1]}): ${fmtMl(f[2])} per presa (${f[3]} mg), cada 6 h`;
}
// Dosi per prefixar el registre de preses: només si el prospecte dóna un únic valor (Apiretal)
export function dosiUnica(id, kg) {
  const d = dosiProspecte(id, kg);
  return id === 'apiretal' && d.estat === 'tram' ? fmtMl(d.files[0][2]) : '';
}
