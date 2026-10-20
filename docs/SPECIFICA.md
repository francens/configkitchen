# Specifica: strumento di rendering AI per arredatori / mobilieri

Data: 2026-10-20 — bozza v0.1, da validare insieme.

## 1. Obiettivo in una frase

Un'app web, con la semplicità della home di Claude/Gemini, in cui il mobiliere
carica una piantina quotata o la foto di una stanza, descrive a voce o per iscritto
cosa inserire (composizioni fatte col proprio programma, texture dalla materioteca,
prodotti cercati sul web) e ottiene prima un 3D navigabile "bello e corretto nelle
misure", poi un render fotorealistico, statico o navigabile.

## 2. Cosa ho capito (flusso utente)

1. **Home** = una sola barra: testo, dettatura vocale, pulsante "+" per allegati
   (PDF, immagini, screenshot, texture, eventuali file 3D).
2. **Primo invio** → crea un **nuovo progetto** nella barra laterale "Progetti"
   (rinominabile).
3. Dentro al progetto:
   - **Step 1 – 3D base**: scena 3D navigabile (orbita, zoom, "cammina"), grafica
     pulita e gradevole, misure e proporzioni rispettate. Si corregge via prompt
     ("sposta l'isola a 1 m", "la cucina parte dall'angolo sinistro del living",
     "usa questa texture per le ante").
   - **Step 2 – Render fotorealistico**, in tre modalità:
     a. **Vista statica**: render fotorealistico esattamente dell'inquadratura corrente.
     b. **Panorama 360°** dal punto in cui si trova la camera: navigabile "guardandosi
        intorno" (stile virtual tour).
     c. **3D completo**: tutta la scena in qualità massima, navigabile.
4. **Materioteca** nella barra laterale: cartelle e sottocartelle libere
   (per azienda, pavimenti, carte da parati, finiture ante, piani…); ogni finitura è
   un'immagine/texture con dimensione fisica (es. 60×60 cm) per piastrellarla alla
   scala giusta. Si pesca da lì nei prompt ("il piano in *Marmo Calacatta Marazzi*").
5. **Ricerca web** di prodotti ("metti il divano modello X di Y"): l'AI cerca, propone
   le immagini/schede trovate, le usa come riferimento.

## 3. Tre precisazioni tecniche importanti

### 3.1 Chi fa cosa: il "cervello" non genera immagini
Claude (modello linguistico) capisce piantine, foto, PDF e prompt, costruisce e
modifica la scena, cerca sul web, dialoga. **Non genera immagini**. Per il
fotorealismo servono:
- un **modello di generazione immagini** (es. Flux / Stable Diffusion con controllo
  di profondità, oppure GPT-image / Imagen) per le viste statiche e i panorami;
- e/o un **motore di rendering vero** (path tracing) per il 3D completo.
L'app quindi orchestra tre motori: Claude + viewer 3D + generatore immagini/render.

### 3.2 "Fotorealistico navigabile" oggi si ottiene in due modi, con pro e contro
| Modalità | Come | Geometria esatta? | Qualità | Tempo |
|---|---|---|---|---|
| Vista statica AI | immagine generata partendo dalla vista 3D (profondità + bordi + riferimenti texture/prodotti) | sì, vincolata alla scena | foto-realistica | 10–40 s |
| Panorama 360° AI | come sopra, ma equirettangolare dal punto camera | sì | foto-realistica | 30–90 s |
| 3D completo path tracing | rendering fisico della scena vera (luce reale, riflessi, ombre) | perfetta | molto alta, dipende da modelli e materiali | progressivo in browser o minuti su server |

Un 3D interamente "inventato" dall'AI e insieme navigabile e dimensionalmente
corretto non è ancora affidabile: la scelta giusta è **offrire le tre modalità** e far
scegliere in base all'uso (preventivo al cliente → viste statiche e 360°; verifica
tecnica → 3D completo).

### 3.3 I modelli 3D dei prodotti
Per lo Step 1 servono modelli 3D con misure giuste. Fonti, in ordine di fedeltà:
1. **export dal tuo programma grafico** (GLB/OBJ/FBX/DAE): il migliore, da capire quale
   programma usi e cosa esporta;
2. **modelli parametrici** generati dall'app (basi, pensili, isole, armadi, letti,
   divani) con misure dal preventivo: aspetto "pulito", sempre corretto nelle quote;
3. **libreria di modelli generici** (GLB) per complementi.
Per il render AI (Step 2) basta anche una **foto del prodotto** trovata sul web come
riferimento: l'immagine finale lo riprodurrà in modo credibile.

## 4. Architettura proposta

- **Frontend**: Next.js + React; viewer 3D con three.js / React Three Fiber
  (luci ambientali, ombre morbide, materiali PBR, controlli orbita/cammina).
- **Backend**: API Next.js (o Node) + coda di lavori per i render lunghi.
- **AI**: Claude API con strumenti ("tools"): `lettura piantina`, `modifica scena`,
  `ricerca web`, `cerca in materioteca`, `avvia render`.
- **Generazione immagini**: provider via API (es. fal.ai / Replicate per Flux +
  ControlNet depth; oppure OpenAI gpt-image). Scelta da fare insieme in base a costi.
- **Path tracing**: three-gpu-pathtracer nel browser (progressivo) e, in seguito,
  Blender Cycles su server per batch ad alta risoluzione.
- **Dati e file**: Postgres + storage oggetti (es. Supabase) per progetti, scene,
  materioteca, render.
- **Vocale**: Web Speech API del browser o Whisper via API.

### 4.1 La scena è un documento JSON (fonte di verità)
Ogni progetto ha una `scene.json` che descrive stanza, aperture, oggetti, materiali e
camera. Il viewer la disegna; Claude la modifica via prompt; i render la usano come
vincolo geometrico. Esempio ridotto:

```json
{
  "units": "cm",
  "rooms": [{
    "id": "living", "name": "Zona living",
    "polygon": [[0,0],[620,0],[620,450],[0,450]], "height": 270,
    "floor": {"material": "mat_rovere_naturale"},
    "walls": {"material": "mat_bianco_opaco"},
    "openings": [{"type":"window","wall":1,"offset":120,"width":160,"height":140,"sill":90}]
  }],
  "objects": [{
    "id": "cucina_1", "kind": "kitchen_composition",
    "source": {"type":"upload","file":"composizione_cucina.png"},
    "anchor": {"room":"living","corner":"SW","wall":"S"},
    "size": {"w": 360, "d": 60, "h": 240},
    "materials": {"ante": "mat_grigio_fenix", "piano": "mat_calacatta_marazzi"}
  },{
    "id": "isola_1", "kind": "kitchen_island",
    "position": {"x": 150, "y": 100, "rotation": 0},
    "size": {"w": 200, "d": 90, "h": 90},
    "constraints": [{"type":"distance_from","target":"cucina_1","value":100}]
  }],
  "camera": {"position":[500,160,400],"target":[200,100,100],"fov":60}
}
```

### 4.2 Interfaccia
- **Barra laterale** (minimale, stile Claude): Nuovo progetto · Progetti (lista
  rinominabile) · Materioteca (albero di cartelle) · Impostazioni.
- **Home**: barra prompt centrale con microfono e allegati.
- **Pagina progetto**: viewer 3D a tutto schermo; chat a lato o sotto; barra strumenti
  con: *Modifica via prompt*, *Materiali* (trascina dalla materioteca sull'oggetto),
  *Misure* (quote visibili, correzione manuale), *Render* (statico / 360° / 3D
  completo), *Esporta/Condividi* (immagini, link navigabile per il cliente).

## 5. Flusso tecnico dello Step 1 (piantina → 3D)

1. Upload PDF/immagine → estrazione quote con Claude (vision) → proposta di
   `scene.json` con **le misure mostrate in chiaro** per conferma ("Ho letto: living
   620×450 cm, h 270. Corretto?"). Se mancano quote, l'app chiede una misura di
   riferimento.
2. Composizioni caricate (screenshot del tuo programma) → Claude ne ricava
   ingombro, moduli e materiali; genera modelli parametrici o usa il GLB se c'è.
3. Posizionamento da prompt ("dall'angolo sinistro", "a 1 m") → vincoli nel JSON →
   viewer aggiorna. Ogni modifica è annullabile (storico versioni).

## 6. Flusso tecnico dello Step 2 (render)

- **Statico**: dal viewer si catturano colore, profondità, normali e maschere per
  oggetto → prompt + riferimenti (texture della materioteca, foto prodotti) →
  modello immagini con controllo di profondità → immagine ad alta risoluzione
  (upscale finale). Risultato salvato nel progetto con la camera usata, così si può
  "ri-renderizzare" dallo stesso punto dopo una modifica.
- **360°**: stessa pipeline su panorama equirettangolare; viewer 360 nel browser;
  più punti = tour.
- **3D completo**: path tracing della scena vera con materiali PBR della
  materioteca; qualità cresce col tempo di calcolo; opzione server ad alta
  risoluzione.

## 7. Materioteca: modello dati
- Cartelle annidate (azienda → categoria → finitura).
- Finitura: nome, immagine (albedo), dimensione fisica (cm) per il tiling, opzionali
  mappe roughness/normal, note (codice articolo, fornitore, prezzo).
- Caricamento anche "al volo" dal prompt: alleghi una texture e dici "salvala in
  Materioteca/Marazzi/Pavimenti".

## 8. Fasi di sviluppo proposte
1. **Prototipo (Step 1)**: UI completa, progetti, chat con Claude, piantina → scena
   JSON → viewer 3D navigabile con buona grafica, modifica via prompt, materioteca
   base con applicazione texture. *È la base per tutto il resto.*
2. **Render statico AI** con controllo di profondità e riferimenti; upscale;
   galleria render nel progetto.
3. **Panorama 360°** + **path tracing** nel browser; esportazioni; link condivisibile
   per il cliente finale.
4. **Multi-utente, account, costi per render, backup**; render server-side ad alta
   risoluzione; eventuale import diretto dal tuo programma grafico.

## 9. Decisioni aperte (servono da te)
1. **Quale programma grafico usi** per le composizioni e cosa riesce ad esportare
   (immagine, PDF, 3D in GLB/OBJ/FBX/DAE)?
2. **Provider per le immagini**: fal.ai/Replicate (Flux + controllo profondità,
   costo basso per immagine) oppure OpenAI gpt-image. Serve una chiave API e un
   budget indicativo per render.
3. **Hosting**: proposta Vercel + Supabase (semplice, economico all'inizio).
4. **Utenti**: solo tu / il tuo studio, oppure prodotto da vendere ad altri mobilieri?
   Cambia autenticazione, fatturazione e isolamento dati.
5. **Lingua**: interfaccia solo in italiano, o anche inglese?
