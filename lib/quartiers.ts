import { supabase } from "@/lib/supabase";

export type Quartier = {
  id: string;
  name: string;
};

export async function listQuartiers(): Promise<Quartier[]> {
  const { data, error } = await supabase
    .from("quartiers")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createQuartier(name: string): Promise<Quartier> {
  const { data, error } = await supabase
    .from("quartiers")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

export async function renameQuartier(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("quartiers")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuartier(id: string): Promise<void> {
  const { error } = await supabase.from("quartiers").delete().eq("id", id);
  if (error) throw error;
}
