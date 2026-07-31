import { supabase } from "@/lib/supabase";

export type Battlefield = {
  id: string;
  name: string;
};

export async function listBattlefields(): Promise<Battlefield[]> {
  const { data, error } = await supabase
    .from("battlefields")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createBattlefield(name: string): Promise<Battlefield> {
  const { data, error } = await supabase
    .from("battlefields")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

export async function renameBattlefield(
  id: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("battlefields")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBattlefield(id: string): Promise<void> {
  const { error } = await supabase.from("battlefields").delete().eq("id", id);
  if (error) throw error;
}
