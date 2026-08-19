import { supabase } from "@/lib/supabase";

export type Plateau = {
  id: string;
  coordination_key: string;
  name: string;
};

export async function listPlateaux(
  coordinationKey: string,
): Promise<Plateau[]> {
  const { data, error } = await supabase
    .from("plateaux")
    .select("id, coordination_key, name")
    .eq("coordination_key", coordinationKey)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPlateau(
  coordinationKey: string,
  name: string,
): Promise<Plateau> {
  const { data, error } = await supabase
    .from("plateaux")
    .insert({ coordination_key: coordinationKey, name })
    .select("id, coordination_key, name")
    .single();
  if (error) throw error;
  return data;
}

export async function renamePlateau(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("plateaux")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePlateau(id: string): Promise<void> {
  const { error } = await supabase.from("plateaux").delete().eq("id", id);
  if (error) throw error;
}
