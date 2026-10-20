import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SceneSchema } from "@/lib/scene/schema";
import ProjectWorkspace from "@/components/project/ProjectWorkspace";
import type { ChatMessage } from "@/lib/messages";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project || !user) notFound();

  const [{ data: messages }, { data: library }, { data: folders }, { data: renders }] = await Promise.all([
    supabase.from("messages").select("*").eq("project_id", id).order("created_at", { ascending: true }),
    supabase.from("materials").select("*").eq("owner_id", user.id).order("name"),
    supabase.from("material_folders").select("*").eq("owner_id", user.id).order("name"),
    supabase.from("renders").select("*").eq("project_id", id).order("created_at", { ascending: false }),
  ]);

  const parsed = SceneSchema.safeParse(project.scene);
  const scene = parsed.success ? parsed.data : SceneSchema.parse({});

  return (
    <ProjectWorkspace
      userId={user.id}
      project={{ id: project.id, name: project.name }}
      initialScene={scene}
      initialMessages={(messages ?? []) as unknown as ChatMessage[]}
      library={library ?? []}
      folders={folders ?? []}
      initialRenders={renders ?? []}
      autoRun={sp.run === "1"}
    />
  );
}
