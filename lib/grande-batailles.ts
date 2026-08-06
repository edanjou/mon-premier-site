import { supabase } from "@/lib/supabase";

export type GrandeBataille = {
  id: string;
  name: string;
  date: string;
  created_at: string;
};

export type GrandeBatailleInput = {
  name: string;
  date: string;
};

export async function listGrandeBatailles(): Promise<GrandeBataille[]> {
  const { data, error } = await supabase
    .from("grande_batailles")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createGrandeBataille(
  input: GrandeBatailleInput,
): Promise<void> {
  const { error } = await supabase.from("grande_batailles").insert(input);
  if (error) throw error;
}

export async function updateGrandeBataille(
  id: string,
  input: GrandeBatailleInput,
): Promise<void> {
  const { error } = await supabase
    .from("grande_batailles")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGrandeBataille(id: string): Promise<void> {
  const { error } = await supabase
    .from("grande_batailles")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
