import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import { ensureSampleProject } from "@/lib/scene/sample-project";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let { data: projects } = await supabase
    .from("projects")
    .select("id,name,updated_at")
    .order("updated_at", { ascending: false });
  if (user && (!projects || projects.length === 0)) {
    await ensureSampleProject(supabase, user.id);
    ({ data: projects } = await supabase.from("projects").select("id,name,updated_at").order("updated_at", { ascending: false }));
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar email={user?.email ?? ""} projects={projects ?? []} />
      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
