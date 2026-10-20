import NewProjectComposer from "@/components/NewProjectComposer";

export default function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-center text-3xl font-semibold tracking-tight">Cosa arrediamo oggi?</h1>
        <p className="mb-8 text-center text-sm text-muted">
          Carica una piantina quotata o la foto di una stanza, descrivi la composizione e ottieni il 3D.
        </p>
        <NewProjectComposer />
        <div className="mt-6 grid gap-2 text-xs text-muted sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface/60 p-3">
            <p className="font-medium text-ink">1. Descrivi o allega</p>
            Piantina in PDF, screenshot del tuo programma, foto reale, texture.
          </div>
          <div className="rounded-xl border border-border bg-surface/60 p-3">
            <p className="font-medium text-ink">2. Correggi via prompt</p>
            «Sposta l&apos;isola a 1 m», «ante in Fenix grigio», «il divano modello X».
          </div>
          <div className="rounded-xl border border-border bg-surface/60 p-3">
            <p className="font-medium text-ink">3. Lancia il render</p>
            Vista statica, panorama 360° o 3D completo.
          </div>
        </div>
      </div>
    </div>
  );
}
