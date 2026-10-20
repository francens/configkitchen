"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    params.get("error") === "link" ? "Il link non è più valido. Riprova." : null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setMessage("Account creato. Controlla la posta e conferma l'indirizzo per entrare.");
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    if (!email) {
      setMessage("Inserisci l'email per ricevere il link di accesso.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    setMessage(error ? error.message : "Ti abbiamo inviato un link di accesso via email.");
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arredo 3D</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "Accedi al tuo studio." : "Crea il tuo account."}
        </p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Email</span>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Password</span>
        <input
          className="input"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {message && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">{message}</p>}
      <button className="btn-primary w-full justify-center" disabled={busy} type="submit">
        {mode === "login" ? "Accedi" : "Registrati"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" className="text-muted underline-offset-2 hover:underline" onClick={magicLink} disabled={busy}>
          Link via email
        </button>
        <button
          type="button"
          className="text-muted underline-offset-2 hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
