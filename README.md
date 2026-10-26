# Casa · tauler familiar

Una web per compartir entre dues persones: on és cadascú avui, què dinen els nens a l'escola i què sopem, la compra, les tasques, el calendari (escolar, de feina i de família), el temps, els partits del Barça, les idees de regals i les caducitats dels documents.

**Adreça:** https://xfajarnesr.github.io/dashboard-familiar/

## Com funciona

Aquest repo (públic) només conté el codi. Les dades viuen al repo **privat** `xfajarnesr/dashboard-familiar-dades`, en fitxers JSON. L'app les llegeix i les escriu directament amb l'API de GitHub, fent servir un token que només té permís sobre aquell repo.

Cada canvi és un commit al repo de dades, signat amb el nom de qui l'ha fet. Si tots dos editeu alhora, l'app torna a llegir la versió més nova i hi aplica el vostre canvi, així que no es perd res. Sense xarxa també funciona: els canvis queden pendents i es pugen quan torna la connexió.

No hi ha cap servidor ni cap servei de pagament. GitHub Pages publica aquest repo gratis cada vegada que canvia el codi (no quan canvien les dades).

## Posar-ho en marxa (5 minuts, un sol cop)

### 1. Crea el token

Amb el compte `xfajarnesr`:

1. Ves a **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** (enllaç directe: https://github.com/settings/personal-access-tokens/new).
2. **Token name:** `Casa`. **Expiration:** el màxim que et deixi (1 any). Apunta a l'app una tasca per renovar-lo.
3. **Repository access:** *Only select repositories* → `dashboard-familiar-dades`.
4. **Permissions:** de tota la llista, només cal tocar **Contents** i posar-lo a *Read and write* (és per ordre alfabètic, després de *Commit statuses*). Si la pantalla mostra un botó *Add permissions*, prem-lo, busca *Contents*, afegeix-lo i canvia *Read-only* per *Read and write*. *Metadata: Read-only* s'hi afegeix sol, i està bé. La resta, deixa-ho com està.
5. **Generate token** i copia'l (comença per `github_pat_`). GitHub només te l'ensenya un cop.

### 2. Connecta cada dispositiu

Obre l'adreça, enganxa el token i tria qui ets. Al mòbil, fes *Afegeix a la pantalla d'inici* perquè s'obri com una app.

Per a la Maria: passa-li el token per un canal privat (no per correu obert) i que faci el mateix. També podeu fer un token per a cadascú.

Si el perdeu o el voleu canviar: *Més → Ajustos → Desconnecta* i torneu a enganxar-ne un de nou.

## Què hi ha

- **Avui:** tira dels 7 pròxims dies amb el temps; per al dia triat, primer l'agenda (si hi ha res), després menjar, tasques, on és cadascú, compra, avisos i Barça. A partir de les 20 h comença per demà.
- **Agenda:** calendari mensual amb els vostres esdeveniments, el calendari escolar, els partits del Barça i les caducitats; horaris setmanals editables; calendari escolar 2026-27.
- **Menjar:** proposta de sopars per a la setmana, menú de l'escola i el catàleg de plats que feu a casa.
- **Llistes:** compra agrupada per botigues (Mercat, Mercadona, Caprabo, Altres; es canvien a *Ajustos*), tasques amb responsable, data i repetició, i coses per casa.
- **Més:** aniversaris, salut dels nens, frases i fites, idees de regals (es poden amagar a l'altre), documents amb avís a 90, 30 i 7 dies, Barça i ajustos (família, aparença, botigues, connexió).

### Què veu cadascú (agenda i tasques)

No és xifrat: totes les dades són al mateix repo i tots dos hi teniu accés. Serveix perquè les coses d'un no facin soroll a l'altre.

- Cada esdeveniment té **Qui ho veu**: *Tothom*, *Només jo* o, si té hora, *Els altres: «ocupat»* (l'altre veu «Xavi ocupat 17:00–19:30» sense el títol). Per a la feina, l'app ho proposa sola: sense hora (un examen, enviar correus), *Només jo*; amb hora dins del teu horari, també; fora de l'horari, *ocupat*. Sempre ho pots canviar.
- Les coses de feina de l'altre (dues o més el mateix dia) surten plegades en una línia. Es desactiva a *Ajustos*.
- Una tasca assignada a tu es pot marcar *Només la veig jo* (o amb el cadenat de la barra per afegir-ne).

### Salut dels nens

*Més → Salut dels nens*, amb tres pestanyes per a cada nen: **Registre** (temperatura, medicació donada, símptomes, visites, vacunes, amb qui ho ha apuntat), **Pes i talles** (amb gràfica) i **Medicaments**. A cada medicament hi apunteu la dosi que us ha indicat el pediatre o el prospecte, cada quantes hores i el màxim de preses en 24 h. L'app no calcula dosis: recorda la vostra, diu quan es va donar l'última i quan toca la següent, i avisa si el pes ha canviat molt des que la vau apuntar. El que s'apunta les darreres 24 h surt als avisos d'*Avui*.

### Frases i fites

*Més → Frases i fites*: el que diuen i el que aprenen, amb l'edat que tenien (posa la data de naixement a *Ajustos → Família*). El mateix dia d'anys posteriors surt a *Avui* com a «Avui fa un any…».

### Horaris puntuals i portar els nens

A *Agenda → Horaris → Editar horaris*, cada persona té franges setmanals i **dies concrets**. Una franja d'un dia concret (com les tardes rotatòries) només surt aquell dia a la cinta d'*On és cadascú* i marca el dia amb un punt al calendari. Les franges setmanals es poden marcar *Només els dies que hi ha escola*: és el cas de portar els nens, que desapareix sola els festius, les vacances i els caps de setmana.

### Tema

*Ajustos → Aparença*: automàtic (segueix el mòbil), clar o fosc. Es guarda en cada dispositiu.

### Com es proposen els sopars

El motor només tria plats de *Menjar → Plats*, així que com més real sigui aquella llista, millors propostes. Té en compte tres coses:

1. Cada sopar ha de portar verdura, hidrats i proteïna. Si el plat no en porta alguna, hi afegeix un acompanyament.
2. La proteïna del sopar no repeteix la que els nens han dinat a l'escola aquell dia.
3. La setmana sencera (5 dinars d'escola + 7 sopars) s'acosta a un objectiu: unes 3 vegades peix, 3 llegum, 2-3 ou, 2 carn blanca i 1 carn vermella.

Els sopars que fixeu (cadenat) no es tornen a proposar. Cada proposta explica per què l'ha triat.

### Menús de l'escola

Cada mes, passa els PDF del menjador a Claude i demana-li que els afegeixi al dashboard. El format és a `data/menus/AAAA-MM.json` del repo de dades (el README d'aquell repo l'explica).

### Partits del Barça

Una GitHub Action del repo de dades consulta l'API pública d'ESPN cada 6 hores i desa `data/barca.json`. Si un dia deixa de funcionar, mira la pestanya *Actions* d'aquell repo.

## Tecnologia

HTML, CSS i JavaScript sense compilació (Preact + htm, inclosos a `js/vendor`). Previsió d'Open-Meteo (sense clau). Funciona com a PWA. Per provar-la sense dades reals, a la pantalla d'entrada hi ha *Prova-ho amb dades d'exemple*.

Fitxers principals: `js/store.js` (sincronització amb GitHub), `js/sopars.js` (motor de sopars), `js/views/*` (pantalles).
