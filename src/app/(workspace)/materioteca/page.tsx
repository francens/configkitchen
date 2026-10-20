import { createClient } from "@/lib/supabase/server";
import MaterialLibrary from "@/components/materioteca/MaterialLibrary";

export default async function MateriotecaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: folders }, { data: materials }] = await Promise.all([
    supabase.from("material_folders").select("*").order("name"),
    supabase.from("materials").select("*").order("name"),
  ]);
  return <MaterialLibrary userId={user!.id} initialFolders={folders ?? []} initialMaterials={materials ?? []} />;
}
