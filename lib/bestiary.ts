import { supabase } from "@/lib/supabase";

export type BestiaryStatus = "en_attente" | "approuve";

export const BESTIARY_STATUSES: { key: BestiaryStatus; label: string }[] = [
  { key: "en_attente", label: "En attente" },
  { key: "approuve", label: "Approuvé" },
];

export type DangerLevel = "Faible" | "Modéré" | "Élevé" | "Mortel";

export const DANGER_LEVELS: DangerLevel[] = [
  "Faible",
  "Modéré",
  "Élevé",
  "Mortel",
];

export type BestiaryCreature = {
  id: string;
  name: string;
  description: string | null;
  danger_level: DangerLevel;
  special_rules: string | null;
  notes: string | null;
  status: BestiaryStatus;
  created_at: string;
};

const SELECT =
  "id, name, description, danger_level, special_rules, notes, status, created_at";

export async function listCreatures(): Promise<BestiaryCreature[]> {
  const { data, error } = await supabase
    .from("bestiary_creatures")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type BestiaryCreatureInput = {
  name: string;
  description: string | null;
  danger_level: DangerLevel;
  special_rules: string | null;
  notes: string | null;
};

export async function createCreature(
  input: BestiaryCreatureInput,
): Promise<BestiaryCreature> {
  const { data, error } = await supabase
    .from("bestiary_creatures")
    .insert({ ...input, status: "approuve" })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCreature(
  id: string,
  input: BestiaryCreatureInput,
): Promise<void> {
  const { error } = await supabase
    .from("bestiary_creatures")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function setCreatureStatus(
  id: string,
  status: BestiaryStatus,
): Promise<void> {
  const { error } = await supabase
    .from("bestiary_creatures")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCreature(id: string): Promise<void> {
  const { error } = await supabase
    .from("bestiary_creatures")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
