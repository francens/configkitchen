"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FolderOpen, LogOut, MoreHorizontal, Palette, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ProjectRow = { id: string; name: string; updated_at: string };

export default function Sidebar({ email, projects }: { email: string; projects: ProjectRow[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<string | null>(null);

  async function rename(id: string) {
    const name = draft.trim();
    setEditing(null);
    if (!name) return;
    const supabase = createClient();
    await supabase.from("projects").update({ name }).eq("id", id);
    router.refresh();
  }

  async function remove(id: string) {
    setMenu(null);
    if (!confirm("Eliminare il progetto e tutti i suoi render?")) return;
    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", id);
    if (pathname === `/p/${id}`) router.push("/");
    router.refresh();
  }

  const navItem = (href: string, label: string, Icon: typeof FolderOpen) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
          active ? "bg-surface text-ink shadow-sm" : "text-muted hover:bg-surface/60 hover:text-ink"
        }`}
      >
        <Icon size={16} />
        {label}
      </Link>
    );
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-panel">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Arredo 3D
        </Link>
      </div>
      <div className="px-2">
        <Link href="/" className="btn w-full justify-start border-dashed">
          <Plus size={16} /> Nuovo progetto
        </Link>
      </div>

      <div className="mt-4 px-2">
        <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">Progetti</p>
        <nav className="space-y-0.5">
          {projects.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-muted">Nessun progetto. Descrivi un ambiente per iniziare.</p>
          )}
          {projects.map((p) => {
            const active = pathname === `/p/${p.id}`;
            return (
              <div
                key={p.id}
                className={`group relative flex items-center rounded-lg text-sm ${
                  active ? "bg-surface text-ink shadow-sm" : "text-muted hover:bg-surface/60 hover:text-ink"
                }`}
              >
                {editing === p.id ? (
                  <input
                    autoFocus
                    className="m-1 w-full rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => rename(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") rename(p.id);
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                ) : (
                  <Link
                    href={`/p/${p.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5"
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setDraft(p.name);
                      setEditing(p.id);
                    }}
                  >
                    <FolderOpen size={15} className="shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                )}
                {editing !== p.id && (
                  <button
                    className="mr-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-panel group-hover:flex"
                    onClick={() => setMenu(menu === p.id ? null : p.id)}
                    aria-label="Opzioni progetto"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                )}
                {menu === p.id && (
                  <div className="absolute top-full right-1 z-20 mt-1 w-40 rounded-lg border border-border bg-surface p-1 text-sm shadow-lg">
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-panel"
                      onClick={() => {
                        setMenu(null);
                        setDraft(p.name);
                        setEditing(p.id);
                      }}
                    >
                      <Pencil size={14} /> Rinomina
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-danger hover:bg-panel"
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 size={14} /> Elimina
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 px-2">
        <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">Libreria</p>
        <nav className="space-y-0.5">{navItem("/materioteca", "Materioteca", Palette)}</nav>
      </div>

      <div className="mt-auto space-y-0.5 border-t border-border p-2">
        {navItem("/impostazioni", "Impostazioni", Settings)}
        <form action="/auth/signout" method="post">
          <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted transition hover:bg-surface/60 hover:text-ink">
            <LogOut size={16} />
            <span className="truncate">{email || "Esci"}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
