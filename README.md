# Arredo 3D

Dalla piantina al render, con un prompt. Strumento per mobilieri e arredatori: carichi una piantina quotata, una foto o le composizioni fatte col tuo programma, descrivi a voce o per iscritto cosa inserire, e ottieni un 3D navigabile corretto nelle misure. Poi lo correggi via prompt, applichi le finiture della tua Materioteca e lanci il render.

La specifica completa è in [docs/SPECIFICA.md](docs/SPECIFICA.md).

## Stato (Fase 1, prototipo)

Funziona:

- Home stile Claude: testo, dettatura vocale (browser), allegati (PDF, immagini, texture, modelli GLB).
- Progetti nella barra laterale (rinomina con doppio clic, elimina), progetto di esempio al primo accesso.
- Chat con Claude che legge piantine e foto, costruisce e modifica la scena 3D (strumento `set_scene`), cerca prodotti sul web.
- Viewer 3D: stanze da poligono quotato, muri con porte e finestre, mobili parametrici (cucine, isole, armadi, letti, divani, tavoli, sedie, librerie), vista "casa di bambola", vista dall'alto, altezza occhi, modalità cammina (WASD), etichette con le misure.
- Pannello Oggetti: posizione, rotazione, misure e finiture per slot, con scelta dalla Materioteca.
- Materioteca: cartelle e sottocartelle, upload texture con dimensione fisica, applicazione a scala reale.
- Render: anteprima della vista corrente ad alta risoluzione salvata nel progetto.

Non ancora (Fase 2 e 3): render fotorealistico AI, panorama 360°, path tracing, condivisione con il cliente.

## Stack

Next.js 16 (App Router) · React Three Fiber + drei · Supabase (Postgres, Auth, Storage) · Claude API (`@anthropic-ai/sdk`) · Tailwind 4 · zod.

## Avvio in locale

```bash
npm install
cp .env.example .env.local   # poi compila le chiavi
npm run dev
```

Variabili d'ambiente:

| Nome | Dove si trova |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (publishable) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

Senza `ANTHROPIC_API_KEY` l'app funziona ma la chat risponde che la chiave non è configurata.

## Database

Lo schema è in `supabase/migrations/0001_initial_schema.sql` (tabelle, RLS, bucket di storage). Con il connettore Supabase o la CLI:

```bash
supabase db push
```

Autenticazione: email + password o link via email. Per saltare la conferma email in sviluppo: Supabase → Authentication → Providers → Email → disattiva "Confirm email".

## Deploy

Vercel + le tre variabili d'ambiente sopra. La route `/api/chat` usa `maxDuration = 300`: su piano Hobby verifica il limite di durata delle funzioni.

## Struttura

```
src/app/(workspace)/        home, progetto (p/[id]), materioteca, impostazioni
src/app/api/chat/route.ts   orchestrazione Claude + strumenti (set_scene, web_search), streaming NDJSON
src/lib/scene/schema.ts     schema JSON della scena (zod) = fonte di verità
src/lib/scene/geometry.ts   muri, aperture, ancoraggi a parete, conversione cm -> metri three.js
src/lib/ai/prompt.ts        system prompt dell'assistente
src/components/viewer/      Canvas R3F, stanza, mobili parametrici, materiali con texture a scala fisica
src/components/project/     chat, pannello oggetti, render
src/components/materioteca/ libreria finiture
supabase/migrations/        schema SQL
```
