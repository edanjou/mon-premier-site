import { supabase } from "@/lib/supabase";

export type SavedMap = {
  id: string;
  name: string;
  data: unknown;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedMapInput = {
  name: string;
  data: unknown;
  preview_url: string | null;
};

export async function listSavedMaps(): Promise<SavedMap[]> {
  const { data, error } = await supabase
    .from("saved_maps")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSavedMap(input: SavedMapInput): Promise<SavedMap> {
  const { data, error } = await supabase
    .from("saved_maps")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateSavedMap(
  id: string,
  input: SavedMapInput,
): Promise<void> {
  const { error } = await supabase
    .from("saved_maps")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSavedMap(id: string): Promise<void> {
  const { error } = await supabase.from("saved_maps").delete().eq("id", id);
  if (error) throw error;
}
