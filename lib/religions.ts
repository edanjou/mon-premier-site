import { supabase } from "@/lib/supabase";

export type Religion = {
  name: string;
  memberCount: number;
};

export async function listReligions(): Promise<Religion[]> {
  const { data, error } = await supabase
    .from("religion_members")
    .select("religion_name");

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.religion_name, (counts.get(row.religion_name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, memberCount]) => ({ name, memberCount }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export type TitleHolder = {
  external_id: number;
  religion_name: string;
  character_name: string | null;
  cleric_name: string | null;
  is_grand_priest: boolean;
  is_priest: boolean;
};

export async function listTitleHolders(): Promise<TitleHolder[]> {
  const { data, error } = await supabase
    .from("religion_members")
    .select(
      "external_id, religion_name, character_name, cleric_name, is_grand_priest, is_priest",
    )
    .or("is_grand_priest.eq.true,is_priest.eq.true")
    .order("religion_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
