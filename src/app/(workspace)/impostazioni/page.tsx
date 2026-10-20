import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-lg font-semibold">Impostazioni</h1>
      <dl className="mt-6 space-y-4 text-sm">
        <div className="rounded-xl border border-border p-4">
          <dt className="text-xs uppercase tracking-wider text-muted">Account</dt>
          <dd className="mt-1">{user?.email}</dd>
        </div>
        <div className="rounded-xl border border-border p-4">
          <dt className="text-xs uppercase tracking-wider text-muted">Assistente AI (Claude)</dt>
          <dd className="mt-1">
            {hasKey ? "Chiave configurata: la chat e la generazione della scena sono attive." : "Chiave Anthropic non configurata sul server. Imposta ANTHROPIC_API_KEY nelle variabili d'ambiente."}
          </dd>
        </div>
        <div className="rounded-xl border border-border p-4">
          <dt className="text-xs uppercase tracking-wider text-muted">Render fotorealistico</dt>
          <dd className="mt-1 text-muted">Fase 2: richiede un provider di generazione immagini. Non ancora configurato.</dd>
        </div>
      </dl>
    </div>
  );
}
