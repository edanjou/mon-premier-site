import { supabase } from "@/lib/supabase";

export type Bilan = {
  id: string;
  coordination_key: string;
  year: number;
  heures_approximatives: string | null;
  bons_coups: string | null;
  pistes_amelioration: string | null;
  priorites: string | null;
  post_mortem_pre_gb: string | null;
  post_mortem_escarmouches: string | null;
  post_mortem_homologation: string | null;
  post_mortem_grandes_batailles: string | null;
  conclusion: string | null;
  mot_de_la_fin: string | null;
  created_at: string;
};

export type BilanSectionsInput = {
  heures_approximatives: string | null;
  bons_coups: string | null;
  pistes_amelioration: string | null;
  priorites: string | null;
  post_mortem_pre_gb: string | null;
  post_mortem_escarmouches: string | null;
  post_mortem_homologation: string | null;
  post_mortem_grandes_batailles: string | null;
  conclusion: string | null;
  mot_de_la_fin: string | null;
};

const BILAN_SELECT =
  "id, coordination_key, year, heures_approximatives, bons_coups, pistes_amelioration, priorites, post_mortem_pre_gb, post_mortem_escarmouches, post_mortem_homologation, post_mortem_grandes_batailles, conclusion, mot_de_la_fin, created_at";

export async function listBilans(coordinationKey: string): Promise<Bilan[]> {
  const { data, error } = await supabase
    .from("coordination_bilans")
    .select(BILAN_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("year", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateBilan(
  coordinationKey: string,
  year: number,
): Promise<Bilan> {
  const { data: existing, error: selectError } = await supabase
    .from("coordination_bilans")
    .select(BILAN_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;
  return createBilan(coordinationKey, year);
}

export async function createBilan(
  coordinationKey: string,
  year: number,
): Promise<Bilan> {
  const { data, error } = await supabase
    .from("coordination_bilans")
    .insert({ coordination_key: coordinationKey, year })
    .select(BILAN_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateBilan(
  id: string,
  input: BilanSectionsInput,
): Promise<void> {
  const { error } = await supabase
    .from("coordination_bilans")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBilan(id: string): Promise<void> {
  const { error } = await supabase
    .from("coordination_bilans")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
